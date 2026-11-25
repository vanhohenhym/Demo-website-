export type {
  Attr,
  AttributeConfidence,
  AttributeCoverage,
  AttributeSource,
  Availability,
  BrandConfig,
  BrandVisibilityInput,
  BrandVisibilityItem,
  BrandVisibilityResult,
  CanonicalAttributeKey,
  CatalogDataHealthReportResult,
  CatalogProduct,
  CategoryHealth,
  CheckBuildCompatibilityInput,
  CheckBuildCompatibilityResult,
  CompatibilityCheck,
  CompatibilityStatus,
  EvaluateCategoryHealthResult,
  EvaluatePcBuildInput,
  EvaluatePcBuildResult,
  ExtractAttributesResult,
  FormFactor,
  FormFactorAttribute,
  HealthStatus,
  KeyValuePair,
  NormalizeAttributeInput,
  NormalizeAttributeResult,
  NumberAttribute,
  RawCmsProduct,
  ResolveBrandResult,
  SlotItem,
  TextAttribute,
  TextListAttribute,
  UnrecognizedAttributeValue,
} from "./types.ts";

export {
  ATTRIBUTE_NAME_ALIASES,
  BRAND_PLACEHOLDERS,
  FORM_FACTOR_SIZE_RANK,
  FORM_FACTOR_VOCABULARY,
  RAM_TYPE_PATTERNS,
  SOCKET_VOCABULARY,
  STORAGE_KEYWORD_FALLBACKS,
  STORAGE_VOCABULARY,
} from "./vocab.ts";

export { roundHalfAwayFromZero } from "./round.ts";
export { normalizeAttribute } from "./normalize-attribute.ts";
export { extractAttributes } from "./extract-attributes.ts";
export { resolveBrand } from "./resolve-brand.ts";
export { brandVisibility } from "./brand-visibility.ts";
export { checkBuildCompatibility } from "./check-build-compatibility.ts";
export { evaluatePcBuild } from "./evaluate-pc-build.ts";
export {
  AUDITED_HEALTH_CATEGORY_SLUGS,
  catalogDataHealthReport,
  evaluateCategoryHealth,
} from "./data-health.ts";
