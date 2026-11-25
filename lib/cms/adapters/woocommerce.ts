import type { ICMSAdapter } from "../adapter.ts";
import { loadBrandConfigs, loadSkuOverrides } from "../config-loader.ts";
import {
  BRAND_TAXONOMY_KEYS,
  COMPONENT_TYPE_SLUG_MAP,
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

interface WooCategoryRef {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent?: number;
  image?: { src?: string } | null;
}

interface WooImageRef {
  src?: string;
  alt?: string;
  name?: string;
}

interface WooAttributeRef {
  id?: number;
  name?: string;
  slug?: string;
  options?: string[];
}

interface WooMetaDataRef {
  key?: string;
  value?: unknown;
}

interface WooBrandRef {
  name?: string;
  slug?: string;
}

export interface WooProductPayload {
  id: number | string;
  name: string;
  slug?: string;
  sku?: string;
  price?: string | number;
  regular_price?: string | number;
  sale_price?: string | number;
  stock_status?: string;
  stock_quantity?: number | null;
  categories?: WooCategoryRef[];
  brands?: WooBrandRef[];
  images?: WooImageRef[];
  short_description?: string;
  description?: string;
  attributes?: WooAttributeRef[];
  meta_data?: WooMetaDataRef[];
  featured?: boolean;
  on_sale?: boolean;
  date_created?: string;
}

export interface WooCommerceAdapterConfig {
  endpoint?: string;
  consumerKey?: string;
  consumerSecret?: string;
  fetchFn?: typeof fetch;
  logUnmapped?: boolean;
  logger?: (message: string) => void;
  cacheTtlMs?: number;
  timeoutMs?: number;
}

const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 10_000;

function isBrandKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return BRAND_TAXONOMY_KEYS.includes(normalized);
}

function selectLeafWooCategory(
  categories: readonly WooCategoryRef[]
): WooCategoryRef | undefined {
  for (let i = categories.length - 1; i >= 0; i -= 1) {
    const candidate = categories[i];
    const normalizedSlug = candidate.slug.trim().toLowerCase();
    if (
      normalizedSlug &&
      Object.prototype.hasOwnProperty.call(
        COMPONENT_TYPE_SLUG_MAP,
        normalizedSlug
      )
    ) {
      return candidate;
    }
  }
  return categories[categories.length - 1] ?? categories[0];
}

/**
 * Maps a raw WooCommerce REST API v3 product payload into the shared RawAdapterProduct shape.
 */
export function mapWooProductToRaw(woo: WooProductPayload): RawAdapterProduct {
  const categories = woo.categories ?? [];
  const primaryCategory = selectLeafWooCategory(categories);
  const categorySlug = primaryCategory?.slug || "uncategorized";
  const categoryName = primaryCategory?.name || "Uncategorized";
  const subCategorySlugs = categories.map((cat) => cat.slug).filter(Boolean);

  let brandTaxonomy = woo.brands?.[0]?.name?.trim() || undefined;
  const explicitAttributes: KeyValuePair[] = [];

  for (const attr of woo.attributes ?? []) {
    const attrKey = (attr.slug || attr.name || "").trim();
    const attrValue = (attr.options ?? []).join(", ").trim();
    if (!attrKey || !attrValue) {
      continue;
    }
    if (!brandTaxonomy && isBrandKey(attrKey)) {
      brandTaxonomy = attrValue;
    }
    explicitAttributes.push({ key: attrKey, value: attrValue });
  }

  const customFields: KeyValuePair[] = [];
  let warranty: string | undefined;

  for (const meta of woo.meta_data ?? []) {
    const key = (meta.key ?? "").trim();
    if (!key || key.startsWith("_")) {
      continue;
    }
    if (
      typeof meta.value !== "string" &&
      typeof meta.value !== "number" &&
      typeof meta.value !== "boolean"
    ) {
      continue;
    }
    const valStr = String(meta.value).trim();
    if (!valStr) {
      continue;
    }
    if (!brandTaxonomy && isBrandKey(key)) {
      brandTaxonomy = valStr;
    }
    if (key.toLowerCase() === "warranty" && !warranty) {
      warranty = valStr;
    }
    customFields.push({ key, value: valStr });
  }

  const regularPrice =
    parsePriceValue(woo.regular_price) ?? parsePriceValue(woo.price);
  const salePrice = parsePriceValue(woo.sale_price);

  const images: ProductImage[] = (woo.images ?? [])
    .filter((img): img is WooImageRef & { src: string } => Boolean(img.src))
    .map((img) => ({
      url: img.src,
      alt: img.alt || img.name || woo.name,
    }));

  const stockQuantity =
    typeof woo.stock_quantity === "number" ? woo.stock_quantity : undefined;

  return {
    id: String(woo.id),
    sku: (woo.sku ?? "").trim() || `WC-${String(woo.id)}`,
    title: woo.name,
    slug: woo.slug?.trim() || undefined,
    categorySlug,
    categoryName,
    subCategorySlugs,
    brandTaxonomy,
    price: regularPrice,
    salePrice:
      regularPrice !== undefined &&
      salePrice !== undefined &&
      salePrice < regularPrice
        ? salePrice
        : undefined,
    availability: normalizeAvailability(woo.stock_status, stockQuantity),
    stockQuantity,
    images,
    shortDescription: woo.short_description,
    descriptionHtml: woo.description,
    explicitAttributes,
    customFields,
    warranty,
    isFeatured: Boolean(woo.featured),
    isFlashDeal: Boolean(woo.on_sale),
    createdAt: woo.date_created,
  };
}

export class WooCommerceCmsAdapter implements ICMSAdapter {
  readonly providerName = "woocommerce" as const;
  private readonly endpoint: string;
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly fetchFn: typeof fetch;
  private readonly logUnmapped?: boolean;
  private readonly logger?: (message: string) => void;
  private readonly cacheTtlMs: number;
  private readonly timeoutMs: number;
  private cachedProducts: { data: Product[]; expiresAt: number } | null = null;
  private inflightProducts: Promise<Product[]> | null = null;
  private cacheEpoch = 0;

  constructor(config: WooCommerceAdapterConfig = {}) {
    this.endpoint = (config.endpoint ?? process.env.CMS_ENDPOINT ?? "").replace(
      /\/+$/,
      ""
    );
    this.consumerKey = config.consumerKey ?? process.env.CMS_KEY ?? "";
    this.consumerSecret = config.consumerSecret ?? process.env.CMS_SECRET ?? "";
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

  private async requestJson<T>(
    resourcePath: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    if (!this.endpoint) {
      throw new Error(
        "WooCommerce adapter requires CMS_ENDPOINT to be configured."
      );
    }

    const url = new URL(`${this.endpoint}/${resourcePath.replace(/^\/+/, "")}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (this.consumerKey && this.consumerSecret) {
      const token = Buffer.from(
        `${this.consumerKey}:${this.consumerSecret}`,
        "utf8"
      ).toString("base64");
      headers.Authorization = `Basic ${token}`;
    }

    const signal = AbortSignal.timeout(this.timeoutMs);
    const response = await this.fetchFn(url.toString(), { headers, signal });
    if (!response.ok) {
      throw new Error(
        `WooCommerce API error (${response.status} ${response.statusText}) for ${resourcePath}`
      );
    }

    return (await response.json()) as T;
  }

  private async fetchAllRawProducts(): Promise<RawAdapterProduct[]> {
    const perPage = 100;
    const allPayloads: WooProductPayload[] = [];

    for (let page = 1; page <= 25; page += 1) {
      const batch = await this.requestJson<WooProductPayload[]>("products", {
        per_page: String(perPage),
        page: String(page),
        status: "publish",
      });
      if (!Array.isArray(batch) || batch.length === 0) {
        break;
      }
      allPayloads.push(...batch);
      if (batch.length < perPage) {
        break;
      }
    }

    return allPayloads.map(mapWooProductToRaw);
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
    const promise = this.fetchAllRawProducts()
      .then((rawProducts) => {
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
    const [rawCategories, products] = await Promise.all([
      this.requestJson<WooCategoryRef[]>("products/categories", {
        per_page: "100",
      }),
      this.getAllProducts(),
    ]);

    const mapped: RawCmsCategoryInput[] = (
      Array.isArray(rawCategories) ? rawCategories : []
    ).map((cat) => ({
      id: String(cat.id),
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image?.src,
    }));

    return buildCategoriesWithCounts(mapped, products);
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
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      return null;
    }

    const allProducts = await this.getAllProducts();
    const fromCache = allProducts.find((p) => p.slug === normalizedSlug);
    if (fromCache) {
      return fromCache;
    }

    const batch = await this.requestJson<WooProductPayload[]>("products", {
      slug: normalizedSlug,
      status: "publish",
    });
    if (!Array.isArray(batch) || batch.length === 0) {
      return null;
    }
    const normalized = normalizeRawProducts([mapWooProductToRaw(batch[0])], {
      brandConfigs: loadBrandConfigs(),
      overridesMap: loadSkuOverrides(),
      logUnmapped: this.logUnmapped,
      logger: this.logger,
    });
    return normalized[0] ?? null;
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
