import { getEffectivePrice } from "../cms/query-engine.ts";
import type {
  Availability,
  Product,
  ProductAttributes,
} from "../cms/types.ts";

export const COMPARE_STORAGE_KEY = "pc_compare_items";
export const COMPARE_CHANGE_EVENT = "pc-compare-change";
export const MAX_COMPARE_ITEMS = 4;

export interface CompareItem {
  id: string;
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  brand: string;
  brandSlug: string;
  price?: number;
  salePrice?: number;
  availability: Availability;
  imageUrl?: string;
  imageAlt?: string;
  warranty?: string;
  attributes: ProductAttributes;
}

export interface CompareRow {
  key: string;
  label: string;
  values: string[];
  hasDifference: boolean;
}

export type AddCompareStatus =
  | "added"
  | "duplicate"
  | "full"
  | "category_mismatch";

export interface AddToCompareResult {
  status: AddCompareStatus;
  nextList: CompareItem[];
  conflictCategory?: string;
}

const AVAILABILITY_LABELS: Record<Availability, string> = {
  in_stock: "In Stock",
  out_of_stock: "Out of Stock",
  preorder: "Pre-Order",
  upcoming: "Upcoming",
};

interface AttributeRowSpec {
  key: keyof Pick<
    ProductAttributes,
    | "socket"
    | "ramType"
    | "formFactor"
    | "tdp"
    | "wattage"
    | "lengthMm"
    | "maxGpuLengthMm"
    | "coolerSockets"
    | "storageInterface"
    | "storageInterfaces"
  >;
  label: string;
  unit?: string;
}

const ATTRIBUTE_ROW_SPECS: readonly AttributeRowSpec[] = [
  { key: "socket", label: "Socket" },
  { key: "ramType", label: "RAM Type" },
  { key: "formFactor", label: "Form Factor" },
  { key: "tdp", label: "TDP", unit: "W" },
  { key: "wattage", label: "Wattage", unit: "W" },
  { key: "lengthMm", label: "Length", unit: "mm" },
  { key: "maxGpuLengthMm", label: "Max GPU Length", unit: "mm" },
  { key: "coolerSockets", label: "Supported Sockets" },
  { key: "storageInterface", label: "Storage Interface" },
  { key: "storageInterfaces", label: "Storage Interfaces" },
];

/**
 * Serializes a full CMS Product into a compact CompareItem safe for localStorage.
 */
export function serializeCompareProduct(product: Product): CompareItem {
  const firstImage = product.images[0];
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    categorySlug: product.categorySlug,
    categoryName: product.categoryName,
    brand: product.brand,
    brandSlug: product.brandSlug,
    price: product.price,
    salePrice: product.salePrice,
    availability: product.availability,
    imageUrl: firstImage?.url,
    imageAlt: firstImage?.alt ?? product.name,
    warranty: product.warranty,
    attributes: { ...product.attributes },
  };
}

/**
 * Adds an item to the compare list enforcing deduplication, category lock, and max 4 capacity.
 */
export function addToCompareList(
  list: CompareItem[],
  item: CompareItem
): AddToCompareResult {
  if (list.some((existing) => existing.id === item.id)) {
    return { status: "duplicate", nextList: list };
  }

  if (list.length > 0 && list[0].categorySlug !== item.categorySlug) {
    return {
      status: "category_mismatch",
      nextList: list,
      conflictCategory: list[0].categorySlug,
    };
  }

  if (list.length >= MAX_COMPARE_ITEMS) {
    return { status: "full", nextList: list };
  }

  return { status: "added", nextList: [...list, item] };
}

/**
 * Replaces the compare list with a single new item (used after category-mismatch confirmation).
 */
export function replaceCompareList(item: CompareItem): CompareItem[] {
  return [item];
}

/**
 * Removes an item from the compare list by product ID.
 */
export function removeFromCompareList(
  list: CompareItem[],
  id: string
): CompareItem[] {
  return list.filter((item) => item.id !== id);
}

function isValidCompareItem(value: unknown): value is CompareItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.name === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.categorySlug === "string" &&
    candidate.categorySlug.length > 0
  );
}

/**
 * Safely parses serialized compare items from localStorage, recovering from corrupt payloads.
 */
export function parseCompareStorage(
  raw: string | null | undefined
): CompareItem[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const valid: CompareItem[] = [];
  const seenIds = new Set<string>();
  let lockedCategory: string | null = null;

  for (const entry of parsed) {
    if (!isValidCompareItem(entry)) {
      continue;
    }
    if (seenIds.has(entry.id)) {
      continue;
    }
    if (lockedCategory === null) {
      lockedCategory = entry.categorySlug;
    } else if (entry.categorySlug !== lockedCategory) {
      continue;
    }

    seenIds.add(entry.id);
    valid.push({
      ...entry,
      attributes:
        typeof entry.attributes === "object" && entry.attributes !== null
          ? entry.attributes
          : {},
    });

    if (valid.length >= MAX_COMPARE_ITEMS) {
      break;
    }
  }

  return valid;
}

function formatPriceValue(item: CompareItem): string {
  const effective = getEffectivePrice(item as Product);
  if (effective === undefined) {
    return "Call for price";
  }
  return `৳${effective.toLocaleString("en-US")}`;
}

function formatAvailabilityValue(availability: Availability): string {
  return AVAILABILITY_LABELS[availability] ?? "—";
}

function formatAttributeValue(
  item: CompareItem,
  spec: AttributeRowSpec
): string {
  const attr = item.attributes?.[spec.key];
  if (!attr || attr.value === undefined || attr.value === null) {
    return "—";
  }
  const val = attr.value;
  if (Array.isArray(val)) {
    const cleaned = val
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
    return cleaned.length > 0 ? cleaned.join(", ") : "—";
  }
  if (typeof val === "number") {
    return spec.unit ? `${val} ${spec.unit}` : String(val);
  }
  const str = String(val).trim();
  if (!str) {
    return "—";
  }
  return spec.unit ? `${str} ${spec.unit}` : str;
}

function computeHasDifference(values: string[]): boolean {
  if (values.length < 2) {
    return false;
  }
  return new Set(values).size > 1;
}

function createRow(
  key: string,
  label: string,
  values: string[]
): CompareRow | null {
  if (values.every((v) => v === "—")) {
    return null;
  }
  return {
    key,
    label,
    values,
    hasDifference: computeHasDifference(values),
  };
}

/**
 * Builds comparison table rows from compare items, flagging differences and omitting empty rows.
 */
export function buildCompareRows(items: CompareItem[]): CompareRow[] {
  if (items.length === 0) {
    return [];
  }

  const candidates: Array<CompareRow | null> = [
    createRow(
      "price",
      "Price",
      items.map((item) => formatPriceValue(item))
    ),
    createRow(
      "availability",
      "Availability",
      items.map((item) => formatAvailabilityValue(item.availability))
    ),
    createRow(
      "brand",
      "Brand",
      items.map((item) => (item.brand?.trim() ? item.brand.trim() : "—"))
    ),
    createRow(
      "sku",
      "SKU",
      items.map((item) => (item.sku?.trim() ? item.sku.trim() : "—"))
    ),
    createRow(
      "warranty",
      "Warranty",
      items.map((item) => (item.warranty?.trim() ? item.warranty.trim() : "—"))
    ),
    ...ATTRIBUTE_ROW_SPECS.map((spec) =>
      createRow(
        spec.key,
        spec.label,
        items.map((item) => formatAttributeValue(item, spec))
      )
    ),
  ];

  return candidates.filter((row): row is CompareRow => row !== null);
}
