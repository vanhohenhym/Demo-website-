export type ComponentType =
  | "cpu"
  | "motherboard"
  | "ram"
  | "gpu"
  | "storage"
  | "psu"
  | "case"
  | "cooler"
  | "monitor"
  | "keyboard"
  | "mouse"
  | "other";

export type Availability = "in_stock" | "out_of_stock" | "preorder" | "upcoming";
export type AttributeSource = "explicit" | "parsed" | "override";
export type AttributeConfidence = "high" | "medium" | "low";
export type HealthStatus = "green" | "amber" | "red" | "no-data";
export type CompatibilityStatus = "ok" | "warning" | "error" | "unknown";
export type FormFactor = "EATX" | "ATX" | "mATX" | "Mini-ITX";

export interface NormalizedAttribute<T = unknown> {
  value: T;
  source: AttributeSource;
  confidence: AttributeConfidence;
  rawKey?: string;
  rawValue?: unknown;
}

export interface ProductAttributes {
  socket?: NormalizedAttribute<string>;
  ramType?: NormalizedAttribute<string>;
  formFactor?: NormalizedAttribute<FormFactor>;
  tdp?: NormalizedAttribute<number>;
  lengthMm?: NormalizedAttribute<number>;
  wattage?: NormalizedAttribute<number>;
  maxGpuLengthMm?: NormalizedAttribute<number>;
  coolerSockets?: NormalizedAttribute<string[]>;
  storageInterface?: NormalizedAttribute<string>;
  storageInterfaces?: NormalizedAttribute<string[]>;
  [customKey: string]: NormalizedAttribute<unknown> | undefined;
}

export interface ProductImage {
  url: string;
  alt: string;
}

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface UnrecognizedAttributeRecord {
  attributeName: string;
  rawValue: string;
  reason: string;
}

export interface UnmappedAttributeSummary {
  attributeName: string;
  count: number;
  sampleProductIds: string[];
  sampleValues: string[];
}

export interface ProductAuditMetadata {
  unmappedAttributeNames: string[];
  unrecognizedAttributes: UnrecognizedAttributeRecord[];
  hasParsedAttributes: boolean;
  hasOverrideAttributes: boolean;
  rawBrandInput?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  subCategorySlugs?: string[];
  componentType: ComponentType;
  brand: string;
  brandSlug: string;
  /** Regular price. Absent = "Call for price" */
  price?: number;
  /** Sale price. Used only when strictly lower than price */
  salePrice?: number;
  availability: Availability;
  stockQuantity?: number;
  images: ProductImage[];
  shortDescription?: string;
  descriptionHtml?: string;
  attributes: ProductAttributes;
  /** Raw CMS attributes that did not map to any canonical attribute key */
  unmappedAttributes?: Record<string, string>;
  /** Detailed normalization & audit diagnostics for /data-health and data:audit */
  audit?: ProductAuditMetadata;
  warranty?: string;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  productCount: number;
  parentSlug?: string;
}

export interface BrandEnrichmentConfig {
  name: string;
  slug: string;
  logo?: string;
  aliases: string[];
  skuPrefixes: string[];
  featured?: boolean;
  order?: number;
}

export interface Brand {
  name: string;
  slug: string;
  logo?: string;
  aliases: string[];
  skuPrefixes: string[];
  productCount: number;
  featured?: boolean;
  order?: number;
  isIndexable: boolean;
}

export type SkuOverridesMap = Record<string, Record<string, string>>;

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  selected?: boolean;
}

export interface FacetGroup {
  key: string;
  title: string;
  type: "checkbox" | "range" | "radio";
  values: FacetValue[];
  min?: number;
  max?: number;
}

export interface CatalogQueryParams {
  category: string;
  q?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  sockets?: string[];
  ramTypes?: string[];
  formFactors?: string[];
  storageInterfaces?: string[];
  availability?: "in-stock" | "all";
  sort?: "price-asc" | "price-desc" | "newest" | "name-asc";
  page?: number;
  limit?: number;
  builder?: "1";
  slot?: string;
  prefilter?: "1";
}

export interface CatalogQueryResult {
  products: Product[];
  total: number;
  facets: FacetGroup[];
}

export type CmsProviderName =
  | "mock"
  | "woocommerce"
  | "generic-rest"
  | "wp-posts"
  | "custom";

export type CmsProductStatus = "publish" | "draft";

export interface CustomCmsProductRecord {
  id: string;
  sku: string;
  title: string;
  slug: string;
  status: CmsProductStatus;
  categorySlug: string;
  categoryName: string;
  subCategorySlugs?: string[];
  explicitComponentType?: string;
  brandTaxonomy?: string;
  price?: number;
  salePrice?: number;
  availability: Availability;
  stockQuantity?: number;
  images: ProductImage[];
  shortDescription?: string;
  descriptionHtml?: string;
  explicitAttributes: KeyValuePair[];
  customFields?: KeyValuePair[];
  descriptionSpecs?: KeyValuePair[];
  warranty?: string;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomCmsProductInput {
  id?: string;
  sku?: string;
  title?: string;
  slug?: string | null;
  status?: CmsProductStatus;
  categorySlug?: string;
  categoryName?: string;
  subCategorySlugs?: string[] | null;
  explicitComponentType?: string | null;
  brandTaxonomy?: string | null;
  price?: number | null;
  salePrice?: number | null;
  availability?: Availability;
  stockQuantity?: number | null;
  images?: ProductImage[];
  shortDescription?: string | null;
  descriptionHtml?: string | null;
  explicitAttributes?: KeyValuePair[];
  customFields?: KeyValuePair[];
  descriptionSpecs?: KeyValuePair[];
  warranty?: string | null;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomCmsCategoryInput {
  id?: string;
  name: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  parentSlug?: string | null;
}

export interface CustomCmsMediaMetadata {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}

export interface CustomCmsMediaRecord extends CustomCmsMediaMetadata {
  bytesBase64: string;
}

export interface CustomCmsMediaInput {
  id?: string;
  filename: string;
  mimeType: string;
  bytesBase64: string;
  sizeBytes?: number;
}

export interface CustomCmsSnapshot {
  version: 1;
  seededAt: string;
  updatedAt: string;
  categories: RawCmsCategoryInput[];
  products: CustomCmsProductRecord[];
  media: CustomCmsMediaRecord[];
}

export interface KvNamespaceLike {
  get(key: string, type?: "text"): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface CustomCmsStorageDriver {
  readonly kind: "cloudflare-kv" | "node-fs" | "memory";
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface RawCmsCategoryInput {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  parentSlug?: string;
}

/**
 * Raw CMS product representation produced by each provider adapter
 * before attribute extraction and brand resolution run.
 */
export interface RawAdapterProduct {
  id: string;
  sku: string;
  title: string;
  slug?: string;
  categorySlug: string;
  categoryName: string;
  subCategorySlugs?: string[];
  explicitComponentType?: string;
  brandTaxonomy?: string;
  price?: number;
  salePrice?: number;
  availability: Availability;
  stockQuantity?: number;
  images: ProductImage[];
  shortDescription?: string;
  descriptionHtml?: string;
  explicitAttributes: KeyValuePair[];
  customFields: KeyValuePair[];
  descriptionSpecs?: KeyValuePair[];
  warranty?: string;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  createdAt?: string;
}

/**
 * Logic-layer CatalogProduct projection aligned with docs/LOGIC/01-types.md.
 */
export interface LogicCatalogProduct {
  id: string;
  name: string;
  sku: string;
  brand: string;
  brandSlug: string;
  categorySlug: string;
  componentType?: string;
  price?: number;
  salePrice?: number;
  availability: Availability;
  socket?: NormalizedAttribute<string>;
  ramType?: NormalizedAttribute<string>;
  formFactor?: NormalizedAttribute<FormFactor>;
  wattage?: NormalizedAttribute<number>;
  tdp?: NormalizedAttribute<number>;
  lengthMm?: NormalizedAttribute<number>;
  maxGpuLengthMm?: NormalizedAttribute<number>;
  coolerSockets?: NormalizedAttribute<string[]>;
  storageInterface?: NormalizedAttribute<string>;
  storageInterfaces?: NormalizedAttribute<string[]>;
}

/**
 * Converts a normalized CMS Product into the flat CatalogProduct shape expected by lib/logic.
 * Pass `useComponentTypeAsCategory = true` when feeding `evaluateCategoryHealth` / `catalogDataHealthReport`.
 */
export function toCatalogProduct(
  product: Product,
  useComponentTypeAsCategory = false
): LogicCatalogProduct {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    brand: product.brand,
    brandSlug: product.brandSlug,
    categorySlug: useComponentTypeAsCategory
      ? product.componentType
      : product.categorySlug,
    componentType: product.componentType,
    price: product.price,
    salePrice: product.salePrice,
    availability: product.availability,
    socket: product.attributes.socket,
    ramType: product.attributes.ramType,
    formFactor: product.attributes.formFactor,
    wattage: product.attributes.wattage,
    tdp: product.attributes.tdp,
    lengthMm: product.attributes.lengthMm,
    maxGpuLengthMm: product.attributes.maxGpuLengthMm,
    coolerSockets: product.attributes.coolerSockets,
    storageInterface: product.attributes.storageInterface,
    storageInterfaces: product.attributes.storageInterfaces,
  };
}
