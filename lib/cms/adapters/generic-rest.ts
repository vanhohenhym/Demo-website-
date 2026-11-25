import type { ICMSAdapter } from "../adapter.ts";
import { loadBrandConfigs, loadSkuOverrides } from "../config-loader.ts";
import {
  normalizeAvailability,
  parsePriceValue,
} from "../field-map.ts";
import { getCategoryBrands } from "../normalize/brands.ts";
import {
  buildCategoriesWithCounts,
  normalizeRawProducts,
} from "../normalize/pipeline.ts";
import {
  getEffectivePrice,
  queryProducts,
  summarizeUnmappedAttributes,
} from "../query-engine.ts";
import type {
  Brand,
  CatalogQueryParams,
  CatalogQueryResult,
  Category,
  KeyValuePair,
  Product,
  ProductImage,
  RawAdapterProduct,
  RawCmsCategoryInput,
  UnmappedAttributeSummary,
} from "../types.ts";

export interface GenericRestCategoryPayload {
  id: string | number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  parentSlug?: string;
}

export interface GenericRestProductPayload {
  id: string | number;
  sku?: string;
  title?: string;
  name?: string;
  slug?: string;
  categorySlug?: string;
  categoryName?: string;
  categories?: Array<{ slug: string; name?: string }>;
  componentType?: string;
  brand?: string;
  brandTaxonomy?: string;
  price?: number | string;
  salePrice?: number | string;
  availability?: string;
  stockStatus?: string;
  stockQuantity?: number;
  images?: Array<{ url: string; alt?: string } | string>;
  shortDescription?: string;
  descriptionHtml?: string;
  attributes?: Record<string, string | number | boolean> | KeyValuePair[];
  customFields?: Record<string, string | number | boolean> | KeyValuePair[];
  warranty?: string;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  createdAt?: string;
}

export interface GenericRestAdapterConfig {
  endpoint?: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
  logUnmapped?: boolean;
  logger?: (message: string) => void;
  cacheTtlMs?: number;
  timeoutMs?: number;
}

const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 10_000;

function toKeyValuePairs(
  source?: Record<string, string | number | boolean> | KeyValuePair[]
): KeyValuePair[] {
  if (!source) {
    return [];
  }
  if (Array.isArray(source)) {
    return source
      .filter((pair) => pair.key.trim() && String(pair.value).trim())
      .map((pair) => ({
        key: pair.key.trim(),
        value: String(pair.value).trim(),
      }));
  }
  return Object.entries(source)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => ({
      key: key.trim(),
      value: String(value).trim(),
    }));
}

/**
 * Maps a generic REST JSON product payload into the shared RawAdapterProduct shape.
 */
export function mapGenericRestProductToRaw(
  item: GenericRestProductPayload
): RawAdapterProduct {
  const title = (item.title ?? item.name ?? "").trim() || `Product ${String(item.id)}`;
  const categories = item.categories ?? [];
  const categorySlug =
    item.categorySlug ?? categories[0]?.slug ?? "uncategorized";
  const categoryName =
    item.categoryName ?? categories[0]?.name ?? categorySlug;
  const subCategorySlugs = categories.map((c) => c.slug).filter(Boolean);

  const regularPrice = parsePriceValue(item.price);
  const salePrice = parsePriceValue(item.salePrice);

  const images: ProductImage[] = (item.images ?? []).map((img) => {
    if (typeof img === "string") {
      return { url: img, alt: title };
    }
    return { url: img.url, alt: img.alt ?? title };
  });

  return {
    id: String(item.id),
    sku: (item.sku ?? "").trim() || `REST-${String(item.id)}`,
    title,
    slug: item.slug?.trim() || undefined,
    categorySlug,
    categoryName,
    subCategorySlugs,
    explicitComponentType: item.componentType,
    brandTaxonomy: item.brandTaxonomy ?? item.brand,
    price: regularPrice,
    salePrice:
      regularPrice !== undefined &&
      salePrice !== undefined &&
      salePrice < regularPrice
        ? salePrice
        : undefined,
    availability: normalizeAvailability(
      item.availability ?? item.stockStatus,
      item.stockQuantity
    ),
    stockQuantity: item.stockQuantity,
    images,
    shortDescription: item.shortDescription,
    descriptionHtml: item.descriptionHtml,
    explicitAttributes: toKeyValuePairs(item.attributes),
    customFields: toKeyValuePairs(item.customFields),
    warranty: item.warranty,
    isFeatured: Boolean(item.isFeatured),
    isFlashDeal: Boolean(item.isFlashDeal),
    createdAt: item.createdAt,
  };
}

function unwrapArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (typeof payload === "object" && payload !== null) {
    const rec = payload as Record<string, unknown>;
    if (Array.isArray(rec.data)) {
      return rec.data as T[];
    }
    if (Array.isArray(rec.items)) {
      return rec.items as T[];
    }
    if (Array.isArray(rec.products)) {
      return rec.products as T[];
    }
    if (Array.isArray(rec.categories)) {
      return rec.categories as T[];
    }
  }
  return [];
}

export class GenericRestCmsAdapter implements ICMSAdapter {
  readonly providerName = "generic-rest" as const;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;
  private readonly logUnmapped?: boolean;
  private readonly logger?: (message: string) => void;
  private readonly cacheTtlMs: number;
  private readonly timeoutMs: number;
  private cachedProducts: { data: Product[]; expiresAt: number } | null = null;
  private inflightProducts: Promise<Product[]> | null = null;
  private cacheEpoch = 0;

  constructor(config: GenericRestAdapterConfig = {}) {
    this.endpoint = (config.endpoint ?? process.env.CMS_ENDPOINT ?? "").replace(
      /\/+$/,
      ""
    );
    this.apiKey = config.apiKey ?? process.env.CMS_KEY ?? "";
    this.fetchFn = config.fetchFn ?? fetch;
    this.logUnmapped = config.logUnmapped;
    this.logger = config.logger;
    this.cacheTtlMs =
      config.cacheTtlMs !== undefined && Number.isFinite(config.cacheTtlMs)
        ? Math.max(0, config.cacheTtlMs)
        : DEFAULT_CACHE_TTL_MS;
    this.timeoutMs =
      config.timeoutMs !== undefined &&
      Number.isFinite(config.timeoutMs) &&
      config.timeoutMs > 0
        ? config.timeoutMs
        : DEFAULT_TIMEOUT_MS;
  }

  clearCache(): void {
    this.cacheEpoch += 1;
    this.cachedProducts = null;
    this.inflightProducts = null;
  }

  private async requestJson(resourcePath: string): Promise<unknown> {
    if (!this.endpoint) {
      throw new Error(
        "Generic REST adapter requires CMS_ENDPOINT to be configured."
      );
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const url = `${this.endpoint}/${resourcePath.replace(/^\/+/, "")}`;
    const signal = AbortSignal.timeout(this.timeoutMs);
    const response = await this.fetchFn(url, { headers, signal });
    if (!response.ok) {
      throw new Error(
        `Generic REST CMS error (${response.status} ${response.statusText}) for ${resourcePath}`
      );
    }

    return (await response.json()) as unknown;
  }

  async getAllProducts(): Promise<Product[]> {
    if (
      this.cacheTtlMs > 0 &&
      this.cachedProducts &&
      Date.now() < this.cachedProducts.expiresAt
    ) {
      return [...this.cachedProducts.data];
    }

    if (this.inflightProducts) {
      return (await this.inflightProducts).slice();
    }

    const epoch = this.cacheEpoch;
    const promise = this.requestJson("products")
      .then((payload) => {
        const items = unwrapArrayPayload<GenericRestProductPayload>(payload);
        const rawProducts = items.map(mapGenericRestProductToRaw);
        const normalized = normalizeRawProducts(rawProducts, {
          brandConfigs: loadBrandConfigs(),
          overridesMap: loadSkuOverrides(),
          logUnmapped: this.logUnmapped,
          logger: this.logger,
        });
        if (this.cacheTtlMs > 0 && epoch === this.cacheEpoch) {
          this.cachedProducts = {
            data: normalized,
            expiresAt: Date.now() + this.cacheTtlMs,
          };
        }
        return normalized;
      })
      .finally(() => {
        if (this.inflightProducts === promise) {
          this.inflightProducts = null;
        }
      });

    this.inflightProducts = promise;
    return (await promise).slice();
  }

  async getCategories(): Promise<Category[]> {
    const [catPayload, products] = await Promise.all([
      this.requestJson("categories"),
      this.getAllProducts(),
    ]);

    const rawCategories: RawCmsCategoryInput[] =
      unwrapArrayPayload<GenericRestCategoryPayload>(catPayload).map((cat) => ({
        id: String(cat.id),
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        image: cat.image,
        parentSlug: cat.parentSlug,
      }));

    return buildCategoriesWithCounts(rawCategories, products);
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const categories = await this.getCategories();
    return categories.find((cat) => cat.slug === slug) ?? null;
  }

  async getProducts(query: CatalogQueryParams): Promise<CatalogQueryResult> {
    const products = await this.getAllProducts();
    return queryProducts(products, query);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const products = await this.getAllProducts();
    return products.find((p) => p.slug === slug) ?? null;
  }

  async getBrandsByCategory(categorySlug: string): Promise<Brand[]> {
    const products = await this.getAllProducts();
    return getCategoryBrands(categorySlug, products, {
      brandConfigs: loadBrandConfigs(),
    });
  }

  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    const products = await this.getAllProducts();
    return products.filter((p) => p.isFeatured).slice(0, Math.max(0, limit));
  }

  async getFlashDeals(): Promise<Product[]> {
    const products = await this.getAllProducts();
    return products.filter((p) => {
      const effective = getEffectivePrice(p);
      return (
        Boolean(p.isFlashDeal) ||
        (p.price !== undefined &&
          effective !== undefined &&
          effective < p.price)
      );
    });
  }

  async getUnmappedAttributes(): Promise<UnmappedAttributeSummary[]> {
    const products = await this.getAllProducts();
    return summarizeUnmappedAttributes(products);
  }
}
