# 04 resolve_brand

**Inputs:** `product: RawCmsProduct`, `brandList: BrandConfig[]` (default []).
**Outputs:** `brand` (default `"Other"`), `brandSlug` (default `"other"`).

## Step 1: raw brand (first non-empty wins)
1. `product.brandTaxonomy`
2. explicitAttributes entry whose key (lowercased, trimmed) is `brand`
3. customFields entry whose key is `brand`

A value is ignored (treated as empty) if blank or, lowercased and trimmed, one of: `n/a`, `na`, `generic`, `oem`, `no brand`, `unknown`.

If a raw brand was found:
- Compare lowercased/trimmed against each `cfg.name` and each `cfg.aliases`. On a match: `brand = cfg.name`, `brandSlug = cfg.slug`. (If several configs match, the last wins. Keep brandList free of duplicates.)
- No match: `brand = rawBrand` (trimmed); `brandSlug` = lowercase, keep `a-z0-9`, turn space and `-` into `-`, drop everything else.
- **Return.** Nothing below runs.

## Step 2: title prefix
`lowerTitle = lower(trim(title))`. For every `cfg.name` and alias (lowercased, trimmed): it matches when `lowerTitle` starts with it AND (the title is exactly that length OR the next character is space, `-` or `/`). The LONGEST match wins (ties: first in list). On a match: `brand = cfg.name`, `brandSlug = cfg.slug`, return.
(`HPX Laptop` must NOT match `HP`; `HPE Server` must match `HPE`, not `HP`.)

## Step 3: SKU prefix
`upper(trim(sku))` starts with `upper(trim(prefix))` for any `cfg.skuPrefixes`; first config in list order wins. Return.

## Step 4: fallback
`brand = "Other"`, `brandSlug = "other"`.

## Tests
`tests/resolve-brand.test.json` (12 cases).
