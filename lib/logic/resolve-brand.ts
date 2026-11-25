import type { BrandConfig, KeyValuePair, RawCmsProduct, ResolveBrandResult } from "./types.ts";
import { BRAND_PLACEHOLDERS } from "./vocab.ts";

function isIgnoredBrandValue(raw: string | undefined): boolean {
  if (raw == null) {
    return true;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return true;
  }
  return BRAND_PLACEHOLDERS.includes(trimmed.toLowerCase());
}

function findBrandInPairs(pairs: readonly KeyValuePair[] | undefined): string | undefined {
  if (pairs == null) {
    return undefined;
  }
  for (const pair of pairs) {
    if (pair.key.trim().toLowerCase() === "brand" && !isIgnoredBrandValue(pair.value)) {
      return pair.value;
    }
  }
  return undefined;
}

function slugifyUnknownBrand(rawBrand: string): string {
  const lower = rawBrand.trim().toLowerCase();
  let slug = "";
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if ((ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9")) {
      slug += ch;
    } else if (ch === " " || ch === "-") {
      slug += "-";
    }
  }
  return slug;
}

export function resolveBrand(
  product: RawCmsProduct,
  brandList: readonly BrandConfig[] = [],
): ResolveBrandResult {
  // Step 1: raw brand (first non-empty, non-placeholder wins)
  let rawBrand: string | undefined;
  if (!isIgnoredBrandValue(product.brandTaxonomy)) {
    rawBrand = product.brandTaxonomy;
  } else {
    const fromExplicit = findBrandInPairs(product.explicitAttributes);
    if (fromExplicit != null) {
      rawBrand = fromExplicit;
    } else {
      const fromCustom = findBrandInPairs(product.customFields);
      if (fromCustom != null) {
        rawBrand = fromCustom;
      }
    }
  }

  if (rawBrand != null) {
    const rawLower = rawBrand.trim().toLowerCase();
    let matchedCfg: BrandConfig | undefined;

    for (const cfg of brandList) {
      if (cfg.name.trim().toLowerCase() === rawLower) {
        matchedCfg = cfg;
      } else {
        for (const alias of cfg.aliases) {
          if (alias.trim().toLowerCase() === rawLower) {
            matchedCfg = cfg;
            break;
          }
        }
      }
    }

    if (matchedCfg != null) {
      return { brand: matchedCfg.name, brandSlug: matchedCfg.slug };
    }

    return {
      brand: rawBrand.trim(),
      brandSlug: slugifyUnknownBrand(rawBrand),
    };
  }

  // Step 2: title prefix (longest match wins; ties keep first in list)
  const lowerTitle = product.title.trim().toLowerCase();
  let bestCfg: BrandConfig | undefined;
  let bestLen = 0;

  for (const cfg of brandList) {
    const candidates = [cfg.name, ...cfg.aliases];
    for (const candidate of candidates) {
      const cand = candidate.trim().toLowerCase();
      if (cand.length === 0) {
        continue;
      }
      if (lowerTitle.startsWith(cand)) {
        const nextChar = lowerTitle[cand.length];
        const validBoundary =
          lowerTitle.length === cand.length ||
          nextChar === " " ||
          nextChar === "-" ||
          nextChar === "/";
        if (validBoundary && cand.length > bestLen) {
          bestLen = cand.length;
          bestCfg = cfg;
        }
      }
    }
  }

  if (bestCfg != null) {
    return { brand: bestCfg.name, brandSlug: bestCfg.slug };
  }

  // Step 3: SKU prefix (first config in list order wins)
  const upperSku = product.sku.trim().toUpperCase();
  for (const cfg of brandList) {
    for (const prefix of cfg.skuPrefixes) {
      const upperPrefix = prefix.trim().toUpperCase();
      if (upperPrefix.length > 0 && upperSku.startsWith(upperPrefix)) {
        return { brand: cfg.name, brandSlug: cfg.slug };
      }
    }
  }

  // Step 4: fallback
  return { brand: "Other", brandSlug: "other" };
}
