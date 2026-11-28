import type { ICMSAdapter } from "./adapter.ts";
import { CustomCmsAdapter } from "./adapters/custom.ts";
import { GenericRestCmsAdapter } from "./adapters/generic-rest.ts";
import { MockCmsAdapter } from "./adapters/mock.ts";
import { WooCommerceCmsAdapter } from "./adapters/woocommerce.ts";
import { WpPostsCmsAdapter } from "./adapters/wp-posts.ts";
import type { CmsProviderName } from "./types.ts";

export type { ICMSAdapter } from "./adapter.ts";
export {
  AUDITED_COMPONENT_TYPES,
  BRAND_TAXONOMY_KEYS,
  CMS_FIELD_MAPS,
  COMPONENT_TYPE_ATTRIBUTE_KEYS,
  COMPONENT_TYPE_SLUG_MAP,
  VALID_COMPONENT_TYPES,
  deriveComponentType,
  normalizeAvailability,
  parseDescriptionSpecs,
  parsePriceValue,
  slugify,
} from "./field-map.ts";
export {
  getOverridesForSku,
  loadBrandConfigs,
  loadSkuOverrides,
  resetConfigCache,
} from "./config-loader.ts";
export {
  clearUnmappedAttributeLog,
  getLoggedUnmappedAttributes,
  normalizeProductAttributes,
  normalizeSingleAttribute,
} from "./normalize/attributes.ts";
export {
  DEFAULT_INDEX_MIN_PRODUCTS,
  DEFAULT_MIN_BRAND_PRODUCTS,
  getCategoryBrands,
  resolveProductBrand,
} from "./normalize/brands.ts";
export {
  buildCategoriesWithCounts,
  normalizeRawProduct,
  normalizeRawProducts,
} from "./normalize/pipeline.ts";
export {
  getEffectivePrice,
  matchesCategorySlug,
  queryProducts,
  summarizeUnmappedAttributes,
} from "./query-engine.ts";
export {
  COMPONENT_MENU_ITEMS,
  COMPONENT_SUBCATEGORIES,
  COMPONENT_SUBCATEGORY_SLUGS,
  buildMissingComponentSeedCategories,
  resolveComponentCategoryLabel,
  type ComponentNavItem,
} from "./component-categories.ts";
export {
  CustomCmsAdapter,
  type CustomCmsAdapterOptions,
  type CustomCmsPreviewProduct,
} from "./adapters/custom.ts";
export {
  createKvStorageDriver,
  createMemoryStorageDriver,
  createNodeFsStorageDriver,
  customRecordToRawAdapterProduct,
  deleteCustomCategory,
  deleteCustomMedia,
  deleteCustomProduct,
  duplicateCustomProduct,
  exportCustomStoreSnapshot,
  getActiveStorageDriver,
  getCustomCatalogVersion,
  getCustomMedia,
  getCustomProductById,
  getCustomProductBySlug,
  getCustomStoreMutationEpoch,
  importCustomStoreSnapshot,
  listCustomCategories,
  listCustomMedia,
  listCustomProducts,
  onCustomStoreMutation,
  patchCustomProduct,
  resetCustomStoreDriver,
  resetCustomStoreToSeed,
  saveCustomMedia,
  setCustomStoreDriver,
  upsertCustomCategory,
  upsertCustomProduct,
} from "./custom-store.ts";
export { GenericRestCmsAdapter, mapGenericRestProductToRaw } from "./adapters/generic-rest.ts";
export {
  MockCmsAdapter,
  RAW_MOCK_CATEGORIES,
  RAW_MOCK_PRODUCTS,
} from "./adapters/mock.ts";
export { WooCommerceCmsAdapter, mapWooProductToRaw } from "./adapters/woocommerce.ts";
export { WpPostsCmsAdapter, mapWpPostToRaw } from "./adapters/wp-posts.ts";
export { toCatalogProduct } from "./types.ts";
export type {
  AttributeConfidence,
  AttributeSource,
  Availability,
  Brand,
  BrandEnrichmentConfig,
  CatalogQueryParams,
  CatalogQueryResult,
  Category,
  CmsProductStatus,
  CmsProviderName,
  CompatibilityStatus,
  ComponentType,
  CustomCmsCategoryInput,
  CustomCmsMediaInput,
  CustomCmsMediaMetadata,
  CustomCmsMediaRecord,
  CustomCmsProductInput,
  CustomCmsProductRecord,
  CustomCmsSnapshot,
  CustomCmsStorageDriver,
  FacetGroup,
  FacetValue,
  FormFactor,
  HealthStatus,
  KeyValuePair,
  KvNamespaceLike,
  LogicCatalogProduct,
  NormalizedAttribute,
  Product,
  ProductAttributes,
  ProductAuditMetadata,
  ProductImage,
  RawAdapterProduct,
  RawCmsCategoryInput,
  SkuOverridesMap,
  UnmappedAttributeSummary,
  UnrecognizedAttributeRecord,
} from "./types.ts";

export function resolveCmsProviderName(raw?: string): CmsProviderName {
  const normalized = (raw ?? process.env.CMS_PROVIDER ?? "mock")
    .trim()
    .toLowerCase();

  if (normalized === "custom" || normalized === "custom-cms") {
    return "custom";
  }
  if (normalized === "woocommerce" || normalized === "woo") {
    return "woocommerce";
  }
  if (normalized === "generic-rest" || normalized === "rest") {
    return "generic-rest";
  }
  if (
    normalized === "wp-posts" ||
    normalized === "wordpress" ||
    normalized === "wp" ||
    normalized === "wp-rest"
  ) {
    return "wp-posts";
  }
  return "mock";
}

/**
 * Factory creating a CMS adapter selected by `provider` argument or `CMS_PROVIDER` env var.
 * Defaults to `"mock"`.
 */
export function createCmsAdapter(provider?: string): ICMSAdapter {
  const resolved = resolveCmsProviderName(provider);

  switch (resolved) {
    case "custom":
      return new CustomCmsAdapter();
    case "woocommerce":
      return new WooCommerceCmsAdapter();
    case "generic-rest":
      return new GenericRestCmsAdapter();
    case "wp-posts":
      return new WpPostsCmsAdapter();
    case "mock":
    default:
      return new MockCmsAdapter();
  }
}

let cachedAdapter: { provider: CmsProviderName; instance: ICMSAdapter } | null =
  null;

/**
 * Returns a cached CMS adapter for the active `CMS_PROVIDER` environment variable.
 * Automatically switches if `process.env.CMS_PROVIDER` changes between calls.
 */
export function getCmsAdapter(provider?: string): ICMSAdapter {
  const resolved = resolveCmsProviderName(provider);
  if (cachedAdapter && cachedAdapter.provider === resolved) {
    return cachedAdapter.instance;
  }
  const instance = createCmsAdapter(resolved);
  cachedAdapter = { provider: resolved, instance };
  return instance;
}

export function resetCmsAdapterCache(): void {
  cachedAdapter = null;
}
