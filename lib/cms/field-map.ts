import type { Availability, ComponentType, KeyValuePair } from "./types.ts";

export const VALID_COMPONENT_TYPES: readonly ComponentType[] = [
  "cpu",
  "motherboard",
  "ram",
  "gpu",
  "storage",
  "psu",
  "case",
  "cooler",
  "monitor",
  "keyboard",
  "mouse",
  "other",
] as const;

export const AUDITED_COMPONENT_TYPES: readonly ComponentType[] = [
  "motherboard",
  "cpu",
  "gpu",
  "psu",
  "case",
  "cooler",
  "storage",
] as const;

/**
 * WooCommerce and generic CMS brand taxonomy / attribute keys checked before
 * explicit attributes, title prefix, and SKU prefix fallbacks.
 */
export const BRAND_TAXONOMY_KEYS: readonly string[] = [
  "pa_brand",
  "product_brand",
  "yith_product_brand",
  "pwb-brand",
  "brand",
] as const;

/**
 * Attribute keys that explicitly declare the PC Builder component type in a CMS.
 */
export const COMPONENT_TYPE_ATTRIBUTE_KEYS: readonly string[] = [
  "component_type",
  "componenttype",
  "pc_builder_slot",
  "pcbuilderslot",
  "part_type",
  "parttype",
  "pa_component-type",
  "pa_component_type",
] as const;

/**
 * Maps CMS category and sub-category slugs to canonical PC Builder ComponentType values.
 * Update this single map when onboarding a CMS with different category slugs.
 */
export const COMPONENT_TYPE_SLUG_MAP: Readonly<Record<string, ComponentType>> = {
  // CPU
  cpu: "cpu",
  cpus: "cpu",
  processor: "cpu",
  processors: "cpu",
  "desktop-processor": "cpu",
  "intel-processor": "cpu",
  "amd-processor": "cpu",

  // Motherboard
  motherboard: "motherboard",
  motherboards: "motherboard",
  mainboard: "motherboard",
  mainboards: "motherboard",
  mobo: "motherboard",

  // RAM
  ram: "ram",
  rams: "ram",
  memory: "ram",
  "desktop-ram": "ram",
  "ddr4-ram": "ram",
  "ddr5-ram": "ram",

  // GPU
  gpu: "gpu",
  gpus: "gpu",
  "graphics-card": "gpu",
  "graphics-cards": "gpu",
  vga: "gpu",
  "video-card": "gpu",
  "video-cards": "gpu",

  // Storage
  storage: "storage",
  ssd: "storage",
  ssds: "storage",
  hdd: "storage",
  hdds: "storage",
  "nvme-ssd": "storage",
  "m2-ssd": "storage",
  "internal-storage": "storage",
  "hard-drive": "storage",
  "solid-state-drive": "storage",

  // PSU
  psu: "psu",
  psus: "psu",
  "power-supply": "psu",
  "power-supplies": "psu",
  smps: "psu",

  // Case
  case: "case",
  cases: "case",
  casing: "case",
  "pc-case": "case",
  "pc-cases": "case",
  "computer-case": "case",
  chassis: "case",
  cabinet: "case",

  // Cooler
  cooler: "cooler",
  coolers: "cooler",
  "cpu-cooler": "cooler",
  "cpu-coolers": "cooler",
  "air-cooler": "cooler",
  "liquid-cooler": "cooler",
  "aio-cooler": "cooler",
  cooling: "cooler",

  // Monitor
  monitor: "monitor",
  monitors: "monitor",
  "gaming-monitor": "monitor",
  display: "monitor",

  // Keyboard
  keyboard: "keyboard",
  keyboards: "keyboard",
  "mechanical-keyboard": "keyboard",

  // Mouse
  mouse: "mouse",
  mice: "mouse",
  "gaming-mouse": "mouse",
};

export interface ProviderFieldMap {
  id: string;
  title: string;
  slug: string;
  sku: string;
  regularPrice: string;
  salePrice: string;
  price: string;
  stockStatus: string;
  stockQuantity: string;
  categories: string;
  images: string;
  shortDescription: string;
  descriptionHtml: string;
  attributes: string;
  metaData: string;
  featured: string;
  createdAt: string;
  warranty: string;
}

/**
 * Provider field mappings for external headless CMS integrations.
 */
export const CMS_FIELD_MAPS: Readonly<
  Record<"woocommerce" | "generic-rest", ProviderFieldMap>
> = {
  woocommerce: {
    id: "id",
    title: "name",
    slug: "slug",
    sku: "sku",
    regularPrice: "regular_price",
    salePrice: "sale_price",
    price: "price",
    stockStatus: "stock_status",
    stockQuantity: "stock_quantity",
    categories: "categories",
    images: "images",
    shortDescription: "short_description",
    descriptionHtml: "description",
    attributes: "attributes",
    metaData: "meta_data",
    featured: "featured",
    createdAt: "date_created",
    warranty: "warranty",
  },
  "generic-rest": {
    id: "id",
    title: "title",
    slug: "slug",
    sku: "sku",
    regularPrice: "price",
    salePrice: "salePrice",
    price: "price",
    stockStatus: "availability",
    stockQuantity: "stockQuantity",
    categories: "categories",
    images: "images",
    shortDescription: "shortDescription",
    descriptionHtml: "descriptionHtml",
    attributes: "attributes",
    metaData: "customFields",
    featured: "isFeatured",
    createdAt: "createdAt",
    warranty: "warranty",
  },
};

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLookupKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function matchComponentTypeValue(raw: string): ComponentType | null {
  const normalized = normalizeLookupKey(raw);
  if (!normalized) {
    return null;
  }

  const exact = COMPONENT_TYPE_SLUG_MAP[normalized];
  if (exact) {
    return exact;
  }

  // Fallback keyword checks on slug/label for nested WooCommerce sub-categories
  if (normalized.includes("motherboard") || normalized.includes("mainboard")) {
    return "motherboard";
  }
  if (normalized.includes("cooler") || normalized.includes("cooling")) {
    return "cooler";
  }
  if (normalized.includes("processor") || normalized === "cpu") {
    return "cpu";
  }
  if (normalized.includes("graphics-card") || normalized.includes("video-card") || normalized.includes("gpu")) {
    return "gpu";
  }
  if (normalized.includes("power-supply") || normalized.includes("psu")) {
    return "psu";
  }
  if (normalized.includes("casing") || normalized.includes("pc-case") || normalized.includes("chassis")) {
    return "case";
  }
  if (
    normalized.includes("ssd") ||
    normalized.includes("hdd") ||
    normalized.includes("storage") ||
    normalized.includes("nvme")
  ) {
    return "storage";
  }
  if (normalized.includes("ram") || normalized.includes("memory")) {
    return "ram";
  }
  if (normalized.includes("monitor")) {
    return "monitor";
  }
  if (normalized.includes("keyboard")) {
    return "keyboard";
  }
  if (normalized.includes("mouse") || normalized.includes("mice")) {
    return "mouse";
  }

  return null;
}

export interface DeriveComponentTypeInput {
  explicitComponentType?: string;
  categorySlug?: string;
  subCategorySlugs?: string[];
  attributes?: KeyValuePair[];
}

/**
 * Derives canonical `ComponentType` from CMS sub-categories and attributes.
 * Precedence:
 * 1. Explicit `explicitComponentType` field
 * 2. CMS attribute matching `COMPONENT_TYPE_ATTRIBUTE_KEYS`
 * 3. Deepest matching sub-category slug (checked last-to-first)
 * 4. Primary `categorySlug`
 * 5. Fallback `"other"`
 */
export function deriveComponentType(
  input: DeriveComponentTypeInput
): ComponentType {
  if (input.explicitComponentType) {
    const direct = matchComponentTypeValue(input.explicitComponentType);
    if (direct) {
      return direct;
    }
  }

  if (input.attributes && input.attributes.length > 0) {
    for (const pair of input.attributes) {
      const cleanKey = pair.key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (COMPONENT_TYPE_ATTRIBUTE_KEYS.includes(cleanKey)) {
        const matched = matchComponentTypeValue(pair.value);
        if (matched) {
          return matched;
        }
      }
    }
  }

  if (input.subCategorySlugs && input.subCategorySlugs.length > 0) {
    for (let i = input.subCategorySlugs.length - 1; i >= 0; i -= 1) {
      const matched = matchComponentTypeValue(input.subCategorySlugs[i]);
      if (matched) {
        return matched;
      }
    }
  }

  if (input.categorySlug) {
    const matched = matchComponentTypeValue(input.categorySlug);
    if (matched) {
      return matched;
    }
  }

  return "other";
}

export function normalizeAvailability(
  rawStatus?: string,
  stockQuantity?: number
): Availability {
  const normalized = (rawStatus ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (normalized === "instock" || normalized === "in_stock" || normalized === "available") {
    return "in_stock";
  }
  if (
    normalized === "outofstock" ||
    normalized === "out_of_stock" ||
    normalized === "sold_out" ||
    normalized === "unavailable"
  ) {
    return "out_of_stock";
  }
  if (
    normalized === "onbackorder" ||
    normalized === "backorder" ||
    normalized === "preorder" ||
    normalized === "pre_order"
  ) {
    return "preorder";
  }
  if (normalized === "upcoming" || normalized === "coming_soon") {
    return "upcoming";
  }

  if (typeof stockQuantity === "number") {
    return stockQuantity > 0 ? "in_stock" : "out_of_stock";
  }

  return "in_stock";
}

export function parsePriceValue(raw: unknown): number | undefined {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : undefined;
  }
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^0-9.]/g, "").trim();
    if (!cleaned) {
      return undefined;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

function stripHtmlTags(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts key/value spec pairs from HTML spec tables or bullet lists in CMS descriptions.
 */
export function parseDescriptionSpecs(html?: string): KeyValuePair[] {
  if (!html || !html.trim()) {
    return [];
  }

  const pairs: KeyValuePair[] = [];

  // Match HTML table rows: <tr><th>Key</th><td>Value</td></tr> or <tr><td>Key</td><td>Value</td></tr>
  const rowRegex = /<tr[^>]*>\s*<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let match: RegExpExecArray | null = rowRegex.exec(html);
  while (match !== null) {
    const key = stripHtmlTags(match[1]).replace(/:$/, "").trim();
    const value = stripHtmlTags(match[2]);
    if (key && value) {
      pairs.push({ key, value });
    }
    match = rowRegex.exec(html);
  }

  // Match list items formatted as <li>Key: Value</li>
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  match = liRegex.exec(html);
  while (match !== null) {
    const text = stripHtmlTags(match[1]);
    const colonIndex = text.indexOf(":");
    if (colonIndex > 0 && colonIndex < 60) {
      const key = text.slice(0, colonIndex).trim();
      const value = text.slice(colonIndex + 1).trim();
      if (key && value) {
        pairs.push({ key, value });
      }
    }
    match = liRegex.exec(html);
  }

  return pairs;
}
