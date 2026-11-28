import type {
  Availability,
  KeyValuePair,
  Product,
  ProductImage,
} from "@/lib/cms/types";

export type CmsProductStatus = "publish" | "draft";

export interface AdminProductRecord {
  id: string;
  sku: string;
  title: string;
  slug: string;
  status: CmsProductStatus;
  categorySlug: string;
  categoryName: string;
  subCategorySlugs?: string[];
  brandTaxonomy?: string;
  price?: number;
  salePrice?: number;
  availability: Availability;
  stockQuantity?: number;
  images: ProductImage[];
  shortDescription?: string;
  descriptionHtml?: string;
  explicitAttributes: KeyValuePair[];
  warranty?: string;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  explicitComponentType?: string;
  createdAt?: string;
  updatedAt?: string;
  normalized?: Product;
}

export interface AdminCategoryRecord {
  id: string;
  name: string;
  slug: string;
  parentSlug?: string;
  description?: string;
  icon?: string;
  image?: string;
  productCount?: number;
}

export interface AdminMediaRecord {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}

export interface ProductFormState {
  id?: string;
  title: string;
  slug: string;
  sku: string;
  status: CmsProductStatus;
  categorySlug: string;
  categoryName: string;
  subCategorySlugs: string[];
  brandTaxonomy: string;
  priceInput: string;
  salePriceInput: string;
  availability: Availability;
  stockQuantityInput: string;
  warranty: string;
  isFeatured: boolean;
  isFlashDeal: boolean;
  shortDescription: string;
  descriptionHtml: string;
  images: ProductImage[];
  explicitAttributes: KeyValuePair[];
  explicitComponentType: string;
}

export interface HardwareSpecPreset {
  id: string;
  label: string;
  key: string;
  placeholder: string;
  suggestions: readonly string[];
  categories: readonly string[];
  helper: string;
}

export const HARDWARE_SPEC_PRESETS: readonly HardwareSpecPreset[] = [
  {
    id: "socket",
    label: "Socket",
    key: "socket",
    placeholder: "AM5",
    suggestions: [
      "AM5",
      "AM4",
      "LGA1700",
      "LGA1851",
      "LGA1200",
      "LGA1151",
      "TR5",
    ],
    categories: ["cpu", "processor", "motherboard"],
    helper: "Canonical CPU / Motherboard socket",
  },
  {
    id: "ramType",
    label: "RAM Type",
    key: "ramType",
    placeholder: "DDR5",
    suggestions: ["DDR5", "DDR4", "DDR3", "LPDDR5X", "LPDDR5"],
    categories: ["motherboard", "ram"],
    helper: "Memory generation (never GDDR)",
  },
  {
    id: "formFactor",
    label: "Form Factor",
    key: "formFactor",
    placeholder: "ATX",
    suggestions: ["EATX", "ATX", "mATX", "Mini-ITX"],
    categories: ["motherboard", "case", "casing"],
    helper: "EATX, ATX, mATX, or Mini-ITX",
  },
  {
    id: "tdp",
    label: "TDP (W)",
    key: "tdp",
    placeholder: "120",
    suggestions: ["65", "105", "120", "170", "253", "285", "450"],
    categories: ["cpu", "processor", "gpu", "graphics-card"],
    helper: "Positive integer in Watts",
  },
  {
    id: "wattage",
    label: "Wattage (W)",
    key: "wattage",
    placeholder: "750",
    suggestions: ["550", "650", "750", "850", "1000", "1200"],
    categories: ["psu", "power-supply"],
    helper: "PSU output capacity in Watts",
  },
  {
    id: "lengthMm",
    label: "Length (mm)",
    key: "lengthMm",
    placeholder: "304",
    suggestions: ["242", "285", "304", "320", "336"],
    categories: ["gpu", "graphics-card"],
    helper: "GPU card length (50–600 mm)",
  },
  {
    id: "maxGpuLengthMm",
    label: "Max GPU Length (mm)",
    key: "maxGpuLengthMm",
    placeholder: "380",
    suggestions: ["320", "340", "380", "410", "430"],
    categories: ["case", "casing"],
    helper: "Case GPU clearance (50–600 mm)",
  },
  {
    id: "coolerSockets",
    label: "Cooler Sockets",
    key: "coolerSockets",
    placeholder: "AM4, AM5, LGA1700, LGA1851",
    suggestions: [
      "AM4, AM5, LGA1700, LGA1851",
      "AM4, AM5, LGA1700, LGA1200",
    ],
    categories: ["cooler", "cpu-cooler"],
    helper: "Comma-separated canonical sockets",
  },
  {
    id: "storageInterface",
    label: "Storage Interface",
    key: "storageInterface",
    placeholder: "M.2 NVMe",
    suggestions: ["M.2 NVMe", "M.2 SATA", "SATA III"],
    categories: ["storage"],
    helper: "Single storage interface",
  },
  {
    id: "storageInterfaces",
    label: "Storage Interfaces (Board)",
    key: "storageInterfaces",
    placeholder: "M.2 NVMe, SATA III",
    suggestions: ["M.2 NVMe, SATA III", "M.2 NVMe, M.2 SATA, SATA III"],
    categories: ["motherboard"],
    helper: "Comma-separated board storage slots",
  },
] as const;

export const COMMON_BRAND_SUGGESTIONS: readonly string[] = [
  "ASUS",
  "MSI",
  "Gigabyte",
  "AMD",
  "Intel",
  "Corsair",
  "Samsung",
  "Kingston",
  "NZXT",
  "DeepCool",
  "G.Skill",
  "Cooler Master",
  "Thermaltake",
  "Lian Li",
  "LG",
  "Dell",
  "Logitech",
  "Razer",
  "Keychron",
  "Western Digital",
  "Seagate",
] as const;

export function slugifyClient(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createEmptyProductForm(
  defaultCategory?: AdminCategoryRecord
): ProductFormState {
  return {
    title: "",
    slug: "",
    sku: "",
    status: "draft",
    categorySlug: defaultCategory?.slug ?? "processor",
    categoryName: defaultCategory?.name ?? "Processor",
    subCategorySlugs: defaultCategory?.parentSlug
      ? [defaultCategory.parentSlug]
      : [],
    brandTaxonomy: "",
    priceInput: "",
    salePriceInput: "",
    availability: "in_stock",
    stockQuantityInput: "10",
    warranty: "3 Years",
    isFeatured: false,
    isFlashDeal: false,
    shortDescription: "",
    descriptionHtml: "",
    images: [],
    explicitAttributes: [],
    explicitComponentType: "",
  };
}

export function productRecordToFormState(
  record: AdminProductRecord
): ProductFormState {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    sku: record.sku,
    status: record.status,
    categorySlug: record.categorySlug,
    categoryName: record.categoryName,
    subCategorySlugs: record.subCategorySlugs ? [...record.subCategorySlugs] : [],
    brandTaxonomy: record.brandTaxonomy ?? "",
    priceInput:
      record.price != null && Number.isFinite(record.price)
        ? String(record.price)
        : "",
    salePriceInput:
      record.salePrice != null && Number.isFinite(record.salePrice)
        ? String(record.salePrice)
        : "",
    availability: record.availability,
    stockQuantityInput:
      record.stockQuantity != null && Number.isFinite(record.stockQuantity)
        ? String(record.stockQuantity)
        : "",
    warranty: record.warranty ?? "",
    isFeatured: Boolean(record.isFeatured),
    isFlashDeal: Boolean(record.isFlashDeal),
    shortDescription: record.shortDescription ?? "",
    descriptionHtml: record.descriptionHtml ?? "",
    images: record.images.map((img) => ({ ...img })),
    explicitAttributes: record.explicitAttributes.map((pair) => ({ ...pair })),
    explicitComponentType: record.explicitComponentType ?? "",
  };
}

export function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

export function parseOptionalPositivePrice(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}
