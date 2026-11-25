# CMS Adapter Specification

## 1. Overview
The site is 100% CMS-agnostic. Products, categories, brands, and inventory are fetched from an external CMS via a single adapter contract (`ICMSAdapter`).
To switch or connect a CMS:
1. Configure environment variables in `.env.local` (`CMS_PROVIDER=wp-posts`, `woocommerce`, or `generic-rest`, plus `CMS_ENDPOINT` and optional `CMS_KEY`/`CMS_SECRET`).
2. Verify or extend the provider field map and `COMPONENT_TYPE_SLUG_MAP` in `lib/cms/field-map.ts`.
3. Zero React components or page routes need modification.

Adapter selection is handled by `getCmsAdapter()` / `createCmsAdapter()` in `lib/cms/index.ts`, which resolves `CMS_PROVIDER` (defaulting to `"mock"`).

---

## 2. Adapter Interface (`lib/cms/adapter.ts`)
```typescript
export interface ICMSAdapter {
  readonly providerName: CmsProviderName;
  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | null>;
  /** Entire normalized catalog for data-health audits, sitemaps, and diagnostics. */
  getAllProducts(): Promise<Product[]>;
  getProducts(query: CatalogQueryParams): Promise<CatalogQueryResult>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getBrandsByCategory(categorySlug: string): Promise<Brand[]>;
  getFeaturedProducts(limit?: number): Promise<Product[]>;
  getFlashDeals(): Promise<Product[]>;
  /** Aggregated unmapped CMS attribute names discovered across the catalog. */
  getUnmappedAttributes(): Promise<UnmappedAttributeSummary[]>;
}
```

---

## 3. Supported Adapters
- **`mock` (`lib/cms/adapters/mock.ts`)**: Default demo adapter. Supplies 32 intentionally messy raw CMS products across 12 categories (11 non-empty + 1 empty `networking` category) covering all 7 audited PC component types to exercise normalization, brand alias merging, SKU overrides, parsed fallbacks, unmapped attribute tracking, absent prices (`"Call for price"`), and sitemap exclusion.
- **`woocommerce` (`lib/cms/adapters/woocommerce.ts`)**: Integrates with WooCommerce REST API v3 using `CMS_ENDPOINT`, `CMS_KEY`, and `CMS_SECRET`, normalizing attributes, meta fields, HTML description specs, and taxonomies through the shared pipeline.
  - **Leaf-Category Selection (`mapWooProductToRaw`)**: Selects the deepest/last category in `woo.categories` whose normalized slug exists in `COMPONENT_TYPE_SLUG_MAP` (falling back to the last/first entry) for `categorySlug` and `categoryName`, while preserving all raw slugs in `subCategorySlugs`.
  - **Caching, Deduplication & Timeouts**: `WooCommerceCmsAdapter` supports `cacheTtlMs` (default `60_000` ms / 60s) and `timeoutMs` (default `10_000` ms / 10s via `AbortSignal.timeout()`). `getAllProducts()` caches normalized results in memory with TTL expiry, deduplicates concurrent in-flight fetches, and exposes `clearCache()` (with epoch guard so stale in-flight requests do not repopulate cleared cache). `getProductBySlug()` checks cached `getAllProducts()` first (resolving synthesized `${title}-${sku}` slugs without extra HTTP requests) and falls back to `?slug=...&status=publish`.
- **`wp-posts` (`lib/cms/adapters/wp-posts.ts`)**: Integrates with any free WordPress.com site (`https://public-api.wordpress.com/wp/v2/sites/<domain>`) or self-hosted WordPress Core REST API v2 (`/wp-json/wp/v2`) using standard Posts, Categories, Tags, and Featured Media—requiring zero plugins or WooCommerce.
  - Parses product metadata (`Price`, `Sale Price`, `SKU`, `Brand`, `Warranty`, `Availability`, `Stock Quantity`, `Featured`, `Flash Deal`) and hardware attributes (`Socket`, `RAM Type`, `Form Factor`, `TDP`, `Wattage`, `Length`, `Storage Interface`) from HTML specification tables, bullet lists, and `Key: Value` paragraph lines, plus `post_tag` flags (`featured`, `flash-deal`, `out-of-stock`) and `sticky` posts.
  - Filters out empty default `"uncategorized"` and unconfigured boilerplate `"hello-world"` posts automatically; paginates via `X-WP-TotalPages` (up to 10 pages); and shares 60s TTL caching (`cacheTtlMs`), in-flight deduplication, `clearCache()`, and 10s `AbortSignal.timeout()` (`timeoutMs`).
- **`generic-rest` (`lib/cms/adapters/generic-rest.ts`)**: Integrates with any headless REST API via `CMS_ENDPOINT` (optional Bearer token via `CMS_KEY`) using `CMS_FIELD_MAPS["generic-rest"]` and the shared normalization pipeline. Supports the same `cacheTtlMs` (default `60_000` ms), in-flight request deduplication, `clearCache()`, and `timeoutMs` (default `10_000` ms via `AbortSignal.timeout()`) hardening as `WooCommerceCmsAdapter`.

---

## 4. Normalization Pipeline, Category Matching & `lib/logic` Bridge
Every adapter produces `RawAdapterProduct` items and passes them through `normalizeRawProducts()` (`lib/cms/normalize/pipeline.ts`):
1. `deriveComponentType()` (`lib/cms/field-map.ts`) derives `componentType` from CMS sub-categories and attributes; `normalizeRawProduct()` preserves non-empty `subCategorySlugs` on the normalized `Product`.
2. `resolveProductBrand()` (`lib/cms/normalize/brands.ts`) delegates to `lib/logic/resolveBrand` with `data/brands.json`.
3. `normalizeProductAttributes()` (`lib/cms/normalize/attributes.ts`) delegates to `lib/logic/extractAttributes` with per-SKU overrides from `data/overrides.json` and logs/tracks unmapped CMS attribute keys.
4. **Shared Parent-Category Matching (`matchesCategorySlug` in `lib/cms/query-engine.ts`, re-exported from `lib/cms/index.ts`)**: Used uniformly by `queryProducts()`, `buildCategoriesWithCounts()`, and `getCategoryBrands()`. Matches when:
   - `categorySlug` is empty or `"all"`;
   - `categorySlug` directly equals `product.categorySlug`, `product.componentType`, or any slug in `product.subCategorySlugs` (case-insensitive);
   - `categorySlug` is a top-level parent/group slug:
     - `component` -> `componentType` in `cpu`, `motherboard`, `ram`, `gpu`, `storage`, `psu`, `case`, `cooler`;
     - `power` -> `componentType === "psu"` or `categorySlug === "power-supply"`;
     - `accessories` -> `componentType` in `keyboard`, `mouse`, `other`;
     - `gaming` -> `isFlashDeal === true` or `componentType` in `gpu`, `monitor`, `keyboard`, `mouse`;
     - `server-storage` -> `componentType === "storage"`.
5. **Category Brand Projection (`getCategoryBrands` in `lib/cms/normalize/brands.ts`)**: Filters products via `matchesCategorySlug(product, categorySlug)` and projects each matching item with `categorySlug` normalized to the queried slug before passing into `lib/logic/brandVisibility`, enabling accurate brand counts and indexability on both leaf and parent categories without modifying `lib/logic/`.
6. `toCatalogProduct(product, useComponentTypeAsCategory)` (`lib/cms/types.ts`) projects a CMS `Product` into the pure `CatalogProduct` type expected by `lib/logic`:
   - Pass `false` (default) for catalog/brand functions (`brandVisibility`) so `categorySlug` stays the site catalog category slug.
   - Pass `true` for health functions (`evaluateCategoryHealth`, `catalogDataHealthReport`) so `categorySlug` carries the canonical `componentType` slug (`motherboard`, `cpu`, `gpu`, `psu`, `case`, `cooler`, `storage`).

---

## 5. `componentType` Derivation & Mapping (`lib/cms/field-map.ts`)

### Precedence Order (First match wins)
1. Explicit `explicitComponentType` field on the raw product.
2. CMS attribute matching `COMPONENT_TYPE_ATTRIBUTE_KEYS`: `component_type`, `componenttype`, `pc_builder_slot`, `pcbuilderslot`, `part_type`, `parttype`, `pa_component-type`, `pa_component_type`.
3. Deepest matching sub-category slug in `subCategorySlugs` (checked last-to-first).
4. Primary `categorySlug`.
5. Fallback `"other"`.

### Exact `COMPONENT_TYPE_SLUG_MAP` & Keyword Fallbacks

| Canonical `componentType` | Exact Mapped Slugs (`COMPONENT_TYPE_SLUG_MAP`) | Substring Fallback Keywords |
|---|---|---|
| `cpu` | `cpu`, `cpus`, `processor`, `processors`, `desktop-processor`, `intel-processor`, `amd-processor` | `processor`, exact `cpu` |
| `motherboard` | `motherboard`, `motherboards`, `mainboard`, `mainboards`, `mobo` | `motherboard`, `mainboard` |
| `ram` | `ram`, `rams`, `memory`, `desktop-ram`, `ddr4-ram`, `ddr5-ram` | `ram`, `memory` |
| `gpu` | `gpu`, `gpus`, `graphics-card`, `graphics-cards`, `vga`, `video-card`, `video-cards` | `graphics-card`, `video-card`, `gpu` |
| `storage` | `storage`, `ssd`, `ssds`, `hdd`, `hdds`, `nvme-ssd`, `m2-ssd`, `internal-storage`, `hard-drive`, `solid-state-drive` | `ssd`, `hdd`, `storage`, `nvme` |
| `psu` | `psu`, `psus`, `power-supply`, `power-supplies`, `smps` | `power-supply`, `psu` |
| `case` | `case`, `cases`, `casing`, `pc-case`, `pc-cases`, `computer-case`, `chassis`, `cabinet` | `casing`, `pc-case`, `chassis` |
| `cooler` | `cooler`, `coolers`, `cpu-cooler`, `cpu-coolers`, `air-cooler`, `liquid-cooler`, `aio-cooler`, `cooling` | `cooler`, `cooling` |
| `monitor` | `monitor`, `monitors`, `gaming-monitor`, `display` | `monitor` |
| `keyboard` | `keyboard`, `keyboards`, `mechanical-keyboard` | `keyboard` |
| `mouse` | `mouse`, `mice`, `gaming-mouse` | `mouse`, `mice` |
| `other` | *(fallback when no slug or keyword matches)* | — |

---

## 6. Provider Field Maps (`CMS_FIELD_MAPS`)

| Normalized Field | WooCommerce (`woocommerce`) | Generic REST (`generic-rest`) |
|---|---|---|
| ID / Title / Slug / SKU | `id`, `name`, `slug`, `sku` | `id`, `title`, `slug`, `sku` |
| Pricing | `regular_price`, `sale_price`, `price` | `price`, `salePrice`, `price` |
| Stock | `stock_status`, `stock_quantity` | `availability`, `stockQuantity` |
| Categories & Images | `categories`, `images` | `categories`, `images` |
| Descriptions | `short_description`, `description` | `shortDescription`, `descriptionHtml` |
| Attributes & Meta | `attributes`, `meta_data` | `attributes`, `customFields` |
| Flags & Timestamps | `featured`, `date_created`, `warranty` | `isFeatured`, `createdAt`, `warranty` |
