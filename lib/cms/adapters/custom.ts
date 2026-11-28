import type { ICMSAdapter } from "../adapter.ts";
import { loadBrandConfigs, loadSkuOverrides } from "../config-loader.ts";
import {
  customRecordToRawAdapterProduct,
  getCustomCatalogVersion,
  listCustomCategories,
  listCustomProducts,
  onCustomStoreMutation,
} from "../custom-store.ts";
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
  CmsProductStatus,
  Product,
  UnmappedAttributeSummary,
} from "../types.ts";

export interface CustomCmsAdapterOptions {
  logUnmapped?: boolean;
  logger?: (message: string) => void;
}

export interface CustomCmsPreviewProduct {
  product: Product;
  status: CmsProductStatus;
}

export class CustomCmsAdapter implements ICMSAdapter {
  readonly providerName = "custom" as const;
  private readonly options: CustomCmsAdapterOptions;
  private cachedVersion: string | null = null;
  private cachedPublishedProducts: Product[] | null = null;
  private cachedAllAdminProducts: CustomCmsPreviewProduct[] | null = null;
  private readonly unsubscribeMutation: () => void;

  constructor(options: CustomCmsAdapterOptions = {}) {
    this.options = options;
    this.unsubscribeMutation = onCustomStoreMutation(() => {
      this.clearCache();
    });
  }

  clearCache(): void {
    this.cachedVersion = null;
    this.cachedPublishedProducts = null;
    this.cachedAllAdminProducts = null;
  }

  dispose(): void {
    this.unsubscribeMutation();
    this.clearCache();
  }

  private async loadNormalizedEntries(): Promise<{
    published: Product[];
    allWithStatus: CustomCmsPreviewProduct[];
  }> {
    const version = await getCustomCatalogVersion();
    if (
      this.cachedVersion === version &&
      this.cachedPublishedProducts !== null &&
      this.cachedAllAdminProducts !== null
    ) {
      return {
        published: this.cachedPublishedProducts,
        allWithStatus: this.cachedAllAdminProducts,
      };
    }

    const records = await listCustomProducts({ includeDrafts: true });
    const brandConfigs = loadBrandConfigs();
    const overridesMap = loadSkuOverrides();

    const rawProducts = records.map(customRecordToRawAdapterProduct);
    const normalized = normalizeRawProducts(rawProducts, {
      brandConfigs,
      overridesMap,
      logUnmapped: this.options.logUnmapped,
      logger: this.options.logger,
    });

    const allWithStatus: CustomCmsPreviewProduct[] = normalized.map(
      (product, idx) => ({
        product,
        status: records[idx]?.status ?? "draft",
      })
    );
    const published = allWithStatus
      .filter((entry) => entry.status === "publish")
      .map((entry) => entry.product);

    this.cachedVersion = version;
    this.cachedPublishedProducts = published;
    this.cachedAllAdminProducts = allWithStatus;

    return { published, allWithStatus };
  }

  async getAllProducts(): Promise<Product[]> {
    const { published } = await this.loadNormalizedEntries();
    return [...published];
  }

  async getAllProductsAdmin(): Promise<Product[]> {
    const { allWithStatus } = await this.loadNormalizedEntries();
    return allWithStatus.map((entry) => entry.product);
  }

  async getCategories(): Promise<Category[]> {
    const [rawCategories, published] = await Promise.all([
      listCustomCategories(),
      this.getAllProducts(),
    ]);
    return buildCategoriesWithCounts(rawCategories, published);
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const normalizedSlug = slug.trim().toLowerCase();
    const categories = await this.getCategories();
    return (
      categories.find(
        (cat) => cat.slug.trim().toLowerCase() === normalizedSlug
      ) ?? null
    );
  }

  async getProducts(query: CatalogQueryParams): Promise<CatalogQueryResult> {
    const published = await this.getAllProducts();
    return queryProducts(published, query);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) {
      return null;
    }
    const published = await this.getAllProducts();
    return (
      published.find(
        (product) => product.slug.trim().toLowerCase() === normalizedSlug
      ) ?? null
    );
  }

  async getProductBySlugIncludingDrafts(slug: string): Promise<Product | null> {
    const preview = await this.getProductPreviewBySlug(slug);
    return preview ? preview.product : null;
  }

  async getProductPreviewBySlug(
    slug: string
  ): Promise<CustomCmsPreviewProduct | null> {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) {
      return null;
    }
    const { allWithStatus } = await this.loadNormalizedEntries();
    return (
      allWithStatus.find(
        (entry) =>
          entry.product.slug.trim().toLowerCase() === normalizedSlug
      ) ?? null
    );
  }

  async getBrandsByCategory(categorySlug: string): Promise<Brand[]> {
    const published = await this.getAllProducts();
    return getCategoryBrands(categorySlug, published, {
      brandConfigs: loadBrandConfigs(),
    });
  }

  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    const published = await this.getAllProducts();
    const featured = published.filter((p) => p.isFeatured);
    return featured.slice(0, Math.max(0, limit));
  }

  async getFlashDeals(): Promise<Product[]> {
    const published = await this.getAllProducts();
    return published.filter((product) => {
      const effective = getEffectivePrice(product);
      const hasDiscount =
        product.price !== undefined &&
        effective !== undefined &&
        effective < product.price;
      return Boolean(product.isFlashDeal) || hasDiscount;
    });
  }

  async getUnmappedAttributes(): Promise<UnmappedAttributeSummary[]> {
    const published = await this.getAllProducts();
    return summarizeUnmappedAttributes(published);
  }
}
