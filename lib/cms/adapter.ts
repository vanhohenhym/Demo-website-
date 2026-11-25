import type {
  Brand,
  CatalogQueryParams,
  CatalogQueryResult,
  Category,
  CmsProviderName,
  Product,
  UnmappedAttributeSummary,
} from "./types.ts";

export interface ICMSAdapter {
  readonly providerName: CmsProviderName;
  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | null>;
  /** Returns the entire normalized catalog for data-health audits, sitemaps, and diagnostics. */
  getAllProducts(): Promise<Product[]>;
  getProducts(query: CatalogQueryParams): Promise<CatalogQueryResult>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getBrandsByCategory(categorySlug: string): Promise<Brand[]>;
  getFeaturedProducts(limit?: number): Promise<Product[]>;
  getFlashDeals(): Promise<Product[]>;
  /** Returns aggregated unmapped CMS attribute names discovered across the catalog. */
  getUnmappedAttributes(): Promise<UnmappedAttributeSummary[]>;
}
