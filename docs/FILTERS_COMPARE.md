# Filters, Facets, Pagination & Comparison

## 1. Filter Parameters (URL-Driven State)
All filter states are strictly preserved in URL search parameters to ensure server-side rendering, shareability, and full browser history support.

| Parameter | Type | Accepted Values / Format | Example |
|---|---|---|---|
| `price` | Range | `min-max` (also accepts `minPrice` / `maxPrice` aliases) | `price=10000-50000` |
| `brand` | Multi-select | Comma-separated brand slugs | `brand=asus,msi` |
| `availability` | Single-select | `in-stock`, `all` | `availability=in-stock` |
| `socket` | Multi-select | Comma-separated normalized CPU/motherboard sockets | `socket=AM5,LGA1700` |
| `ramType` | Multi-select | Comma-separated memory types | `ramType=DDR5,DDR4` |
| `formFactor` | Multi-select | Comma-separated motherboard/case/PSU form factors | `formFactor=ATX,Micro-ATX` |
| `storageInterface` | Multi-select | Comma-separated storage interfaces | `storageInterface=NVMe,SATA` |
| `q` | String | Keyword search across name, SKU, brand, category, short description | `q=ryzen` |
| `sort` | Single-select | `price-asc`, `price-desc`, `newest`, `name-asc` | `sort=price-asc` |
| `page` | Integer | `>= 1` (default `1`) | `page=2` |
| `limit` | Integer | `12`, `24`, `48`, `96` (default `24`) | `limit=24` |
| `builder` | Flag | `1` (indicates PC Builder selection mode) | `builder=1` |
| `slot` | String | Target component slot name (enforced by `queryProducts()` only when `builder=1`) | `slot=motherboard` |
| `prefilter` | Flag | `1` (marks automated PC Builder pre-filter vs manual sidebar filters; excluded from `noindex`) | `prefilter=1` |

---

## 2. Facet Display Rules & Parent-Category Scope
- **Global Search & Parent-Category Browsing**: Global search forms (`Header`, `app/not-found.tsx`) submit to `/category/all?q=...` (`"All Products"`) so site-wide searches match every product category (monitors, keyboards, mice, laptops, desktops, and components). Top-level group routes (`/category/component`, `/category/power`, `/category/accessories`, `/category/gaming`, `/category/server-storage`, `/category/all`) use shared `matchesCategorySlug()` (`lib/cms/query-engine.ts`) in `queryProducts()` for all catalog queries (not only Builder Mode).
- **Locked Brand Route Precedence**: On `/category/[category]/[brand]`, `parseCatalogSearchParams()` (`lib/catalog/url-params.ts`) locks `result.brand = baseOverrides.brand` and ignores `?brand=` query overrides so mismatched brands cannot appear under a brand `<h1>`.
- **Parent-Category Brand Navigation Counts**: `getCategoryBrands()` (`lib/cms/normalize/brands.ts`) projects products matched via `matchesCategorySlug()` into `brandVisibility`, so `BrandNavStrip` and `/category/[category]/[brand]` render accurate brand counts and indexability on both parent and leaf categories.
- **Dynamic Counts**: Each facet option displays its matching product count (e.g., `ASUS (14)`).
- **Zero-Count Suppression**: Filter options with `0` matching products and empty facet groups are completely hidden from `queryProducts` facets and `FilterSidebar` to prevent dead-end filtering.
- **SEO Canonicalization**: `hasNonCanonicalFilterParams()` in `lib/catalog/url-params.ts` detects `price`, `minPrice`, `maxPrice`, `brand`, `availability`, `socket`, `ramType`, `formFactor`, `storageInterface`, `q`, `sort`, `page`, and `limit`. Any URL containing these parameters emits a `canonical` link pointing to the clean base URL (`/category/[category]` or `/category/[category]/[brand]`) and `noindex,follow`. (`builder`, `slot`, and `prefilter` preserve PC Builder context across navigation.)

---

## 3. Product Compare Engine
- **Core Module (`lib/compare/compare.ts`)**: Exports `MAX_COMPARE_ITEMS` (`4`), `COMPARE_STORAGE_KEY` (`"pc_compare_items"`), `COMPARE_CHANGE_EVENT` (`"pc-compare-change"`), `serializeCompareProduct()`, `addToCompareList()`, `replaceCompareList()`, `removeFromCompareList()`, `parseCompareStorage()`, and `buildCompareRows()`.
- **Capacity & Deduplication**: Maximum of 4 products simultaneously; duplicate product IDs return `status: "duplicate"` without mutating the list.
- **Category Lock & Confirmation Dialog**: Products compared must share the exact same `categorySlug`. Adding a product from a different category sets `pendingConflict` in `CompareProvider` and opens a native `<dialog>` (`showModal()`) in `CompareBar` prompting `"Keep Current"` (auto-focused) or `"Replace List"`.
- **Persistence & Cross-Tab / Same-Tab Sync**: Saved in client `localStorage` under `pc_compare_items` with safe corrupt-payload recovery in `parseCompareStorage()`. `CompareProvider` listens to browser `storage` events (cross-tab) and `pc-compare-change` `CustomEvent` (same-tab) so `CompareBar`, `CompareButton`, `CompareTable`, and `FloatingActions` stay synchronized.
- **Floating Compare Drawer (`CompareBar`)**: Persistent `no-print` drawer anchored at the bottom of the viewport when `count > 0` (with right padding clearing `FloatingActions`), showing item thumbnails/brand badges, titles, per-item remove buttons, `"Clear All"`, `"Compare Now"` -> `/compare`, and a centralized `aria-live="polite"` status region.
- **Difference Highlighting (`CompareTable` on `/compare`)**: `buildCompareRows()` builds Price, Availability, Brand, SKU, Warranty, and normalized attribute rows (`socket`, `ramType`, `formFactor`, `tdp`, `wattage`, `lengthMm`, `maxGpuLengthMm`, `coolerSockets`, `storageInterface`, `storageInterfaces`), omitting all-empty rows and setting `hasDifference: true` when values differ. `CompareTable` highlights differing rows (`bg-amber-50/80` + `"Differs"` badge), gates `"Show differences only"` on `count >= 2` (resetting it automatically when `count < 2` so dropping to 1 item never strands an empty table), provides a sticky `"Specification"` column, `"Add more"` CTA, and empty/1-item states.
