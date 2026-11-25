# Normalized Data Model

## 1. Core Principles
- All external CMS payloads are transformed into normalized TypeScript interfaces defined in `lib/cms/types.ts`, aligned with the pure domain types in `lib/logic/types.ts` (`docs/LOGIC/01-types.md`).
- Zero `any` types across `lib/logic/*` and `lib/cms/*`.
- Every normalized attribute carries provenance: `value`, `source` (`"explicit" | "parsed" | "override"`), and `confidence` (`"high" | "medium" | "low"`).
- Missing data never crashes runtime code: absent `price` displays `"Call for price"`; missing attributes yield `"unknown"` in PC Builder compatibility checks.

---

## 2. Product Entity (`lib/cms/types.ts`)
```typescript
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
  subCategorySlugs?: string[]; // preserved raw CMS category/sub-category slugs for parent & leaf matching
  componentType: ComponentType;
  brand: string;
  brandSlug: string;
  price?: number;       // absent = "Call for price"
  salePrice?: number;   // used only when strictly lower than price
  availability: Availability;
  stockQuantity?: number;
  images: Array<{ url: string; alt: string }>;
  shortDescription?: string;
  descriptionHtml?: string;
  attributes: ProductAttributes;
  unmappedAttributes?: Record<string, string>;
  audit?: ProductAuditMetadata;
  warranty?: string;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  createdAt?: string;
}
```

Use `toCatalogProduct(product, useComponentTypeAsCategory)` in `lib/cms/types.ts` to project `Product` into the flat `CatalogProduct` interface expected by `lib/logic/*`.

---

## 3. Category & Brand Entities
```typescript
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

export interface Brand extends BrandEnrichmentConfig {
  productCount: number;
  isIndexable: boolean; // true if productCount >= INDEX_MIN_PRODUCTS (3) and slug !== "other"
}
```

---

## 4. Query, Facet & Override Types
```typescript
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
}

export interface CatalogQueryResult {
  products: Product[];
  total: number;
  facets: FacetGroup[];
}
```
