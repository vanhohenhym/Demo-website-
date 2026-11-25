# Brand Resolution System

## 1. Brand Resolution Ladder (`lib/logic/resolve-brand.ts` & `lib/cms/normalize/brands.ts`)
Brands are resolved dynamically from live CMS product data using a deterministic 4-step precedence ladder. Brands are never hardcoded in page routes, menus, or category templates.

### Precedence Steps (First hit wins):
1. **Raw Brand Field**: First non-empty value from:
   - `product.brandTaxonomy` (CMS brand taxonomy keys checked by adapters: `pa_brand`, `product_brand`, `yith_product_brand`, `pwb-brand`, `brand`)
   - Explicit attribute with key `brand`
   - Custom field with key `brand`
   - Placeholder values (`n/a`, `na`, `generic`, `oem`, `no brand`, `unknown`) are ignored as empty.
   - Matched case-insensitively against `data/brands.json` `name` and `aliases`; unmatched non-empty brand strings are preserved and slugified cleanly.
2. **Title Prefix Match**: Matches product title prefix against known brand `name` and `aliases` in `data/brands.json` on a word boundary (end-of-string, space, `-`, or `/`). Longest match wins (ties: first in list). Example: `HPX Laptop` does not match `HP`; `HPE Server` matches `HPE`.
3. **SKU Prefix Match**: Case-insensitive prefix match against `skuPrefixes` in `data/brands.json` (first config in list order wins, e.g. `ASU-` -> `ASUS`, `MSI-` -> `MSI`, `SEA-` -> `Seasonic`).
4. **Fallback**: Resolves to `"Other"` (`brandSlug: "other"`).

---

## 2. Alias Merging
Inconsistent CMS spellings and manufacturer sub-brands are unified into a canonical `name` and `slug` via `data/brands.json`:
- `"Asus"`, `"ASUSTeK"`, `"ASUSTeK Computer"`, `"ASUS ROG"`, `"ASUS TUF"` -> `"ASUS"` (`asus`)
- `"msi"`, `"Micro-Star International"`, `"MSI Gaming"`, `"MSI MAG"`, `"MSI PRO"` -> `"MSI"` (`msi`)
- `"GIGABYTE"`, `"Gigabyte Technology"`, `"AORUS"`, `"Gigabyte AORUS"` -> `"Gigabyte"` (`gigabyte`)
- `"WD"`, `"WD_BLACK"`, `"WD Black"` -> `"Western Digital"` (`western-digital`)

---

## 3. Brand Visibility & SEO Rules (`lib/logic/brand-visibility.ts`)
- **Category Nav Threshold**: A brand appears in a category's brand navigation only if it has `>= MIN_BRAND_PRODUCTS` (default `1`) in that category.
- **Brand Sub-Category Indexability**: A brand sub-category page (`/category/[category]/[brand]`) is marked `indexable: true` and included in `app/sitemap.ts` only when `count >= INDEX_MIN_PRODUCTS` (default `3`).
- **Thin Pages (< 3 products)**: Rendered with `<meta name="robots" content="noindex,follow" />` and excluded from `sitemap.xml`.
- **`"Other"` Brand**: Always appended last when `otherCount >= MIN_BRAND_PRODUCTS`, and **never** indexable (`indexable: false`, excluded from `sitemap.xml`).

---

## 4. `data/brands.json` Enrichment Schema
`data/brands.json` is strictly an enrichment and alias lookup file (currently 17 brand entries). CMS catalog data alone determines which brands appear on the site.

```json
[
  {
    "name": "ASUS",
    "slug": "asus",
    "logo": "/images/brands/asus.png",
    "aliases": ["Asus", "ASUSTeK", "ASUSTeK Computer", "ASUS ROG", "ASUS TUF"],
    "skuPrefixes": ["ASU-", "ASUS-"],
    "featured": true,
    "order": 1
  }
]
```
