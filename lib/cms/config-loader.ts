import rawBrandsJson from "../../data/brands.json" with { type: "json" };
import rawOverridesJson from "../../data/overrides.json" with { type: "json" };
import type {
  BrandEnrichmentConfig,
  KeyValuePair,
  SkuOverridesMap,
} from "./types.ts";

let cachedBrands: BrandEnrichmentConfig[] | null = null;
let cachedOverrides: SkuOverridesMap | null = null;

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function parseBrandConfigEntry(item: unknown): BrandEnrichmentConfig | null {
  if (typeof item !== "object" || item === null) {
    return null;
  }
  const rec = item as Record<string, unknown>;
  if (typeof rec.name !== "string" || typeof rec.slug !== "string") {
    return null;
  }
  return {
    name: rec.name,
    slug: rec.slug,
    logo: typeof rec.logo === "string" ? rec.logo : undefined,
    aliases: isStringArray(rec.aliases) ? rec.aliases : [],
    skuPrefixes: isStringArray(rec.skuPrefixes) ? rec.skuPrefixes : [],
    featured: typeof rec.featured === "boolean" ? rec.featured : undefined,
    order: typeof rec.order === "number" ? rec.order : undefined,
  };
}

/**
 * Loads brand enrichment rules from `data/brands.json`.
 * Never throws if the optional file is missing; returns an empty list.
 */
export function loadBrandConfigs(forceReload = false): BrandEnrichmentConfig[] {
  if (cachedBrands !== null && !forceReload) {
    return cachedBrands;
  }

  try {
    const parsed: unknown = rawBrandsJson;
    if (!Array.isArray(parsed)) {
      cachedBrands = [];
      return cachedBrands;
    }

    const configs: BrandEnrichmentConfig[] = [];
    for (const item of parsed) {
      const entry = parseBrandConfigEntry(item);
      if (entry) {
        configs.push(entry);
      }
    }
    cachedBrands = configs;
    return cachedBrands;
  } catch {
    cachedBrands = [];
    return cachedBrands;
  }
}

/**
 * Loads per-SKU attribute overrides from `data/overrides.json`.
 * Never throws if the optional file is missing; returns an empty map.
 */
export function loadSkuOverrides(forceReload = false): SkuOverridesMap {
  if (cachedOverrides !== null && !forceReload) {
    return cachedOverrides;
  }

  try {
    const parsed: unknown = rawOverridesJson;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      cachedOverrides = {};
      return cachedOverrides;
    }

    const result: SkuOverridesMap = {};
    for (const [sku, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        continue;
      }
      const normalizedEntry: Record<string, string> = {};
      for (const [key, val] of Object.entries(entry as Record<string, unknown>)) {
        if (val !== undefined && val !== null) {
          normalizedEntry[key] = String(val);
        }
      }
      result[sku] = normalizedEntry;
    }

    cachedOverrides = result;
    return cachedOverrides;
  } catch {
    cachedOverrides = {};
    return cachedOverrides;
  }
}

/**
 * Resolves per-SKU override key/value pairs for a single product SKU.
 * Checks exact match first, then trimmed case-insensitive match.
 */
export function getOverridesForSku(
  sku: string,
  overridesMap?: SkuOverridesMap
): KeyValuePair[] {
  const map = overridesMap ?? loadSkuOverrides();
  const trimmedSku = sku.trim();
  if (!trimmedSku) {
    return [];
  }

  let matched = map[trimmedSku];
  if (!matched) {
    const upperSku = trimmedSku.toUpperCase();
    for (const [key, value] of Object.entries(map)) {
      if (key.trim().toUpperCase() === upperSku) {
        matched = value;
        break;
      }
    }
  }

  if (!matched) {
    return [];
  }

  return Object.entries(matched).map(([key, value]) => ({
    key,
    value,
  }));
}

export function resetConfigCache(): void {
  cachedBrands = null;
  cachedOverrides = null;
}
