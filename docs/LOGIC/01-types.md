# 01 Types

```ts
type Availability = "in_stock" | "out_of_stock" | "preorder" | "upcoming";
type AttributeSource = "explicit" | "parsed" | "override";
type AttributeConfidence = "high" | "medium" | "low";
type HealthStatus = "green" | "amber" | "red" | "no-data";
type CompatibilityStatus = "ok" | "warning" | "error" | "unknown";
type FormFactor = "EATX" | "ATX" | "mATX" | "Mini-ITX";

interface Attr<T> { value: T; source: AttributeSource; confidence: AttributeConfidence } // default source "explicit", confidence "high"
type TextAttribute = Attr<string>;
type FormFactorAttribute = Attr<FormFactor>;
type NumberAttribute = Attr<number>;
type TextListAttribute = Attr<string[]>;

interface CatalogProduct {
  id: string; name: string; sku: string;
  brand: string; brandSlug: string;
  categorySlug: string;            // site category (see adapter contract)
  componentType?: string;          // PC Builder type
  price?: number;                  // absent = "Call for price"
  salePrice?: number;              // used only when strictly lower than price
  availability: Availability;
  socket?: TextAttribute;          // e.g. AM5, LGA1700
  ramType?: TextAttribute;         // e.g. DDR5
  formFactor?: FormFactorAttribute;
  wattage?: NumberAttribute;       // PSU output
  tdp?: NumberAttribute;
  lengthMm?: NumberAttribute;      // GPU length
  maxGpuLengthMm?: NumberAttribute;// case clearance
  coolerSockets?: TextListAttribute;
  storageInterface?: TextAttribute;     // a drive: "M.2 NVMe", "M.2 SATA", "SATA III"
  storageInterfaces?: TextListAttribute;// a motherboard's supported interfaces
}
interface SlotItem { product: CatalogProduct; quantity: number /* >=1, default 1 */ }
interface CompatibilityCheck { ruleId: string; status: CompatibilityStatus; message: string; confidence: AttributeConfidence; verified: boolean /* default false */ }
interface AttributeCoverage { attributeName: string; presentCount: number; totalCount: number; coveragePercent: number /* rounded */ }
interface CategoryHealth { categorySlug: string; componentType: string; productCount: number; coveragePercent: number; status: HealthStatus; attributeCoverages: AttributeCoverage[] }

interface KeyValuePair { key: string; value: string }
interface RawCmsProduct {
  id: string; title: string; sku: string; categorySlug: string;
  componentType?: string;
  brandTaxonomy?: string;
  explicitAttributes: KeyValuePair[];  // default []
  customFields: KeyValuePair[];        // default []
  descriptionSpecs: KeyValuePair[];    // default [] (parsed from description spec tables)
  skuOverrides: KeyValuePair[];        // default []
}
interface BrandConfig { name: string; slug: string; aliases: string[]; skuPrefixes: string[] }
interface BrandVisibilityItem { brand: string; brandSlug: string; count: number; indexable: boolean }
interface UnrecognizedAttributeValue { attributeName: string; rawValue: string; reason: string }
```
