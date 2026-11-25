export type Availability = "in_stock" | "out_of_stock" | "preorder" | "upcoming";
export type AttributeSource = "explicit" | "parsed" | "override";
export type AttributeConfidence = "high" | "medium" | "low";
export type HealthStatus = "green" | "amber" | "red" | "no-data";
export type CompatibilityStatus = "ok" | "warning" | "error" | "unknown";
export type FormFactor = "EATX" | "ATX" | "mATX" | "Mini-ITX";

export type CanonicalAttributeKey =
  | "socket"
  | "coolerSockets"
  | "ramType"
  | "formFactor"
  | "wattage"
  | "tdp"
  | "maxGpuLengthMm"
  | "lengthMm"
  | "storageInterfaces"
  | "storageInterface";

export interface Attr<T> {
  value: T;
  source: AttributeSource;
  confidence: AttributeConfidence;
}

export type TextAttribute = Attr<string>;
export type FormFactorAttribute = Attr<FormFactor>;
export type NumberAttribute = Attr<number>;
export type TextListAttribute = Attr<string[]>;

export interface CatalogProduct {
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
  socket?: TextAttribute;
  ramType?: TextAttribute;
  formFactor?: FormFactorAttribute;
  wattage?: NumberAttribute;
  tdp?: NumberAttribute;
  lengthMm?: NumberAttribute;
  maxGpuLengthMm?: NumberAttribute;
  coolerSockets?: TextListAttribute;
  storageInterface?: TextAttribute;
  storageInterfaces?: TextListAttribute;
}

export interface SlotItem {
  product: CatalogProduct;
  quantity: number;
}

export interface CompatibilityCheck {
  ruleId: string;
  status: CompatibilityStatus;
  message: string;
  confidence: AttributeConfidence;
  verified: boolean;
}

export interface AttributeCoverage {
  attributeName: string;
  presentCount: number;
  totalCount: number;
  coveragePercent: number;
}

export interface CategoryHealth {
  categorySlug: string;
  componentType: string;
  productCount: number;
  coveragePercent: number;
  status: HealthStatus;
  attributeCoverages: AttributeCoverage[];
}

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface RawCmsProduct {
  id: string;
  title: string;
  sku: string;
  categorySlug: string;
  componentType?: string;
  brandTaxonomy?: string;
  explicitAttributes?: KeyValuePair[];
  customFields?: KeyValuePair[];
  descriptionSpecs?: KeyValuePair[];
  skuOverrides?: KeyValuePair[];
}

export interface BrandConfig {
  name: string;
  slug: string;
  aliases: string[];
  skuPrefixes: string[];
}

export interface BrandVisibilityItem {
  brand: string;
  brandSlug: string;
  count: number;
  indexable: boolean;
}

export interface UnrecognizedAttributeValue {
  attributeName: string;
  rawValue: string;
  reason: string;
}

export interface NormalizeAttributeInput {
  rawName: string;
  rawValue: string;
  categoryHint?: string;
  componentType?: string;
  source?: AttributeSource;
}

export interface NormalizeAttributeResult {
  canonicalKey?: CanonicalAttributeKey;
  matched: boolean;
  rejectionReason: string;
  textResult?: TextAttribute;
  numberResult?: NumberAttribute;
  listResult?: TextListAttribute;
}

export interface ExtractAttributesResult {
  socket?: TextAttribute;
  ramType?: TextAttribute;
  formFactor?: FormFactorAttribute;
  storageInterface?: TextAttribute;
  wattage?: NumberAttribute;
  tdp?: NumberAttribute;
  lengthMm?: NumberAttribute;
  maxGpuLengthMm?: NumberAttribute;
  coolerSockets?: TextListAttribute;
  storageInterfaces?: TextListAttribute;
  unmappedAttributes: string[];
  unrecognizedValues: UnrecognizedAttributeValue[];
}

export interface ResolveBrandResult {
  brand: string;
  brandSlug: string;
}

export interface BrandVisibilityInput {
  categorySlug: string;
  products: CatalogProduct[];
  minBrandProducts?: number;
  indexMinProducts?: number;
}

export interface BrandVisibilityResult {
  brands: BrandVisibilityItem[];
  totalCategoryProducts: number;
  categoryIndexable: boolean;
}

export interface CheckBuildCompatibilityInput {
  cpu?: CatalogProduct;
  motherboard?: CatalogProduct;
  ram?: CatalogProduct;
  ramQuantity?: number;
  gpu?: CatalogProduct;
  psu?: CatalogProduct;
  pcCase?: CatalogProduct;
  cooler?: CatalogProduct;
  storageItems?: SlotItem[];
  verifiedRules?: string[];
}

export interface CheckBuildCompatibilityResult {
  checks: CompatibilityCheck[];
  errorCount: number;
  warningCount: number;
  unverifiedCount: number;
}

export interface EvaluatePcBuildInput extends CheckBuildCompatibilityInput {
  extras?: SlotItem[];
  ignoreCompatibility?: boolean;
}

export interface EvaluatePcBuildResult extends CheckBuildCompatibilityResult {
  totalPrice: number;
  itemCount: number;
  excludedItemIds: string[];
}

export interface EvaluateCategoryHealthResult {
  health: CategoryHealth;
  otherBrandCount: number;
  parsedProductCount: number;
}

export interface CatalogDataHealthReportResult {
  categoryHealths: CategoryHealth[];
  otherBrandCount: number;
  parsedProductCount: number;
  overallStatus: HealthStatus;
}
