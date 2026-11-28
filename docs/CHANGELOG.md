# Changelog

All notable changes to this project will be documented in this file.

## [2026-11-28] - Component Sub-Category Menu & `/category/component` Navigation
### Added
- `lib/cms/component-categories.ts`: Canonical `COMPONENT_SUBCATEGORIES` (16 PC component categories: `Processor`, `CPU Cooler`, `Motherboard`, `Graphics Card`, `RAM (Desktop)`, `RAM (Laptop)`, `Power Supply`, `Hard Disk Drive`, `Portable Hard Disk Drive`, `SSD`, `Portable SSD`, `Casing`, `Casing Cooler`, `Optical Disk Drive`, `Vertical GPU Holder`, `Water / Liquid Cooling`), `COMPONENT_MENU_ITEMS` (+ `Show All Component`), `resolveComponentCategoryLabel()`, and `buildMissingComponentSeedCategories()` re-exported via `lib/cms/index.ts`.
- `components/catalog/ComponentNavStrip.tsx`: Sub-category pill strip (`Components: Processor | CPU Cooler | ... | Show All Component`) displayed on `/category/component`.
### Changed
- `components/layout/Header.tsx`: Added hover/focus-within `Component` dropdown menu on desktop (17 items with orange `▸` chevrons on the first 13 sub-trees, `lg:overflow-visible` on nav wrapper) and collapsible `Component Categories` section inside `<MobileNavDrawer>`.
- `app/category/[category]/page.tsx` & `app/category/[category]/[brand]/page.tsx`: Replaced `"Brands:"` `<BrandNavStrip>` with `<ComponentNavStrip>` on `/category/component`, and resolved exact labels from `resolveComponentCategoryLabel()` (e.g. `RAM (Desktop)`, `Water / Liquid Cooling`, `SSD`).
- `lib/cms/field-map.ts`, `lib/cms/query-engine.ts`, `lib/cms/adapters/mock.ts`, `lib/cms/custom-store.ts`: Registered all 16 Component slugs in `COMPONENT_TYPE_SLUG_MAP` and `RAW_MOCK_CATEGORIES`, enhanced `matchesCategorySlug()` for split RAM/Storage/Cooler and `component` parent queries, and auto-merged missing `COMPONENT_SUBCATEGORIES` into already-seeded KV/JSON catalogs.
- `tests/catalog/query-and-url.test.ts` & `tests/cms/custom-cms.test.ts`: Added tests for Component sub-category list completeness, `matchesCategorySlug()` split category resolution, and KV/JSON store hydration.
- Updated `docs/COMPONENTS.md`, `docs/CMS_ADAPTER.md`, and `docs/CHANGELOG.md`.

## [2026-11-28] - Built-In Custom CMS, Admin Dashboard (`/admin`), Cloudflare KV Store & Live Preview
### Added
- `lib/cms/custom-store.ts` & `lib/cms/adapters/custom.ts`: Unified `CustomCmsStorageDriver` (`env.CMS_STORE` Cloudflare KV binding via dynamic `cloudflare:workers` import in production, `.data/custom-cms.json` + in-memory fallback locally) and `CustomCmsAdapter` (`providerName = "custom"`) with auto-seeding from mock data, serialized write lock, automatic cache invalidation, strict published-only storefront filtering, and draft/live preview methods (`getAllProductsAdmin`, `getProductBySlugIncludingDrafts`, `getProductPreviewBySlug`).
- `lib/cms/admin-auth.ts`: HMAC-SHA256 httpOnly cookie (`pc_cms_admin`) + `Authorization: Bearer` / `?token=` authorization resolving `CMS_ADMIN_TOKEN || DATA_HEALTH_TOKEN` (explicit token required in `NODE_ENV === "production"`, `demo-health-token-secret` fallback in non-prod).
- `app/api/cms/*`: Added REST API routes `auth/route.ts`, `products/route.ts`, `products/[id]/route.ts`, `categories/route.ts`, `media/route.ts`, `media/[id]/route.ts` (public cached binary `GET` + auth-guarded `DELETE`), `seed/route.ts` (JSON backup export, import, and demo seed reset), and `_revalidate.ts` (`revalidateCmsStorefront()` calling `revalidatePath` on mutations).
- `app/admin/page.tsx` & `components/admin/*`: Added WordPress-style Custom CMS Admin & Live Preview Dashboard (`AdminLoginCard.tsx`, `AdminCmsApp.tsx`, `ProductEditor.tsx`, `LiveProductPreview.tsx`, `MediaLibraryModal.tsx`, `CategoryManager.tsx`, `types.ts`) with `noindex,nofollow` metadata, drag-and-drop media upload, structured hardware spec presets, and keystroke-live Catalog Card / PDP preview.
- `tests/cms/custom-cms.test.ts` & `tests/cms/custom-api.test.ts`: Added unit tests covering KV/file storage, draft isolation, CRUD, media upload/fetch, auth guards, and snapshot reset/import.
### Changed
- `cloudflare.config.ts`: Added `CMS_STORE: bindings.kv()`, switched `CMS_PROVIDER` to `bindings.text("custom")`, and retained `CMS_ENDPOINT` fallback, `accountId`, and `compatibilityFlags: ["nodejs_compat"]`.
- `.env.example`, `.env.local`, `.gitignore`: Added `custom` provider option and `CMS_ADMIN_TOKEN`, configured `.env.local` for `CMS_PROVIDER=custom`, and ignored `.data/`.
- `app/robots.ts` & `components/layout/Footer.tsx`: Disallowed `/admin` and `/admin/*` in `robots.txt` and added a subtle `"CMS Admin"` link (`/admin`) in the footer utility row.
- `lib/cms/adapters/mock.ts`, `lib/cms/types.ts`, `lib/cms/index.ts`, `lib/cms/image-url.ts`, `components/catalog/SafeProductImage.tsx`, `app/page.tsx`, `app/product/[slug]/page.tsx`: Exported mock seed arrays, registered `"custom"` provider, enabled safe relative `/api/cms/media/<id>` image URLs (`unoptimized` in `SafeProductImage`), switched `app/page.tsx` to `force-dynamic` with `revalidatePath` calls on CMS API mutations (`products`, `products/[id]`, `categories`, `seed`), and added authenticated `?preview=1` draft/live PDP banner (`noindex,nofollow`).
- Updated `docs/ROUTES.md`, `docs/CMS_ADAPTER.md`, `docs/CMS_DATA_GUIDE.md`, `docs/COMPONENTS.md`, `docs/ENV.md`, `docs/ARCHITECTURE.md`, `README.md`, `docs/CHANGELOG.md`, and `docs/INDEX.md`.

## [2026-11-25] - Cloudflare Workers Migration (`vinext` + Typed `cf` Config)
### Added
- `vite.config.ts` & `cloudflare.config.ts`: Configured `vinext` with `workersCacheCdnAdapter()`, `@cloudflare/vite-plugin`, `nodejs_compat`, `demo-website` Worker name, `accountId`, and `CMS_PROVIDER` / `CMS_ENDPOINT` text bindings for WordPress REST v2 (`wp-posts`).
- `pnpm-workspace.yaml`: Approved `workerd` build scripts cleanly under pnpm v11 while keeping `.npmrc`/`.pnpmrc` minimal (`node-linker=hoisted`).
### Changed
- `package.json` & `postcss.config.cjs`: Added `"type": "module"`, `"packageManager": "pnpm@11.28.5"`, and `dev:vinext` / `build:vinext` / `start:vinext` / `deploy:vinext` scripts alongside existing `next` scripts; migrated `postcss.config.js` to `postcss.config.cjs`.
- `lib/cms/config-loader.ts` & `next.config.js` & `tests/seo/redirects-and-metadata.test.ts`: Replaced runtime `node:fs` / `require()` reads of `data/*.json` with bundled ESM JSON imports (`with { type: "json" }`) so both Cloudflare Workers (`workerd`) and Next.js run identically.
- `eslint.config.mjs` & `.gitignore`: Ignored Vite/Cloudflare build directories (`dist/`, `.vinext/`, `.cloudflare/`) and `*.zip` archives.

## [2026-11-25] - WordPress Posts REST v2 Adapter (`wp-posts`) & Live Site Integration
### Added
- `lib/cms/adapters/wp-posts.ts` (`WpPostsCmsAdapter`, `mapWpPostToRaw`): Free WordPress REST API v2 adapter supporting WordPress.com Simple sites (`https://public-api.wordpress.com/wp/v2/sites/<domain>`) and self-hosted WordPress (`/wp-json/wp/v2`) without plugins or WooCommerce. Extracts pricing, SKU, brand, warranty, availability, featured/flash-deal flags, images (`wp:featuredmedia` + inline `<img>`), and hardware attributes from HTML tables, lists, `Key: Value` lines, `meta`, and tags with 60s TTL caching, in-flight deduplication, pagination, and 10s timeouts.
- `.env.local`: Configured `CMS_PROVIDER=wp-posts` and `CMS_ENDPOINT=https://public-api.wordpress.com/wp/v2/sites/shahriarnadimcom.wordpress.com` (git-ignored & excluded from deploy archive).
### Changed
- `lib/cms/types.ts` & `lib/cms/index.ts`: Registered `"wp-posts"` (`wordpress`, `wp`, `wp-rest` aliases) in `CmsProviderName`, `resolveCmsProviderName()`, `createCmsAdapter()`, and barrel exports.
- `tests/cms/cms-layer.test.ts`: Added unit tests covering `wp-posts` provider switching, post/category/media/spec normalization, `"hello-world"` & empty `"uncategorized"` filtering, and TTL caching.
- Updated `.env.example`, `README.md`, `docs/CMS_ADAPTER.md`, `docs/CMS_DATA_GUIDE.md`, `docs/ENV.md`, `docs/CHANGELOG.md`, and `docs/INDEX.md`.

## [2026-11-25] - Catalog Audit Bugfix Pass (Search, Compare, Builder, WooCommerce, Sitemap & Countdown)
### Added
- `lib/cms/image-url.ts` (`isRenderableImageUrl`) & `components/catalog/SafeProductImage.tsx`: Client-safe `next/image` wrapper with `onError` SVG fallback shared by `ProductCard` and `/product/[slug]`.
### Changed
- `components/layout/Header.tsx`, `app/not-found.tsx`, `app/category/[category]/page.tsx`, `app/category/[category]/[brand]/page.tsx`: Changed global search `<form>` target to `/category/all` (`"All Products"`) so site-wide searches match monitors, peripherals, laptops, and all categories cleanly while keeping `/category/all?q=...` `noindex,follow`.
- `components/compare/CompareTable.tsx`: Gated and auto-reset `showDifferencesOnly` when `count < 2` so removing down to 1 item never leaves an empty comparison table.
- `lib/cms/types.ts`, `lib/pc-builder/builder.ts`, `lib/catalog/url-params.ts`, `components/catalog/FilterSidebar.tsx`, `app/category/[category]/page.tsx`, `app/category/[category]/[brand]/page.tsx`: Added explicit `prefilter=1` flag on automated PC Builder compatibility links and stripped/disabled pre-filtering only when `prefilter === "1"` so manual sidebar facet filters work on `< 60%` coverage categories.
- `lib/catalog/url-params.ts`: Locked `baseOverrides.brand` precedence in `parseCatalogSearchParams()` so `?brand=` query params cannot override `/category/[category]/[brand]`.
- `lib/cms/adapters/woocommerce.ts`: Updated `getProductBySlug()` to check cached `getAllProducts()` before querying `?slug=...` so synthesized `${title}-${sku}` slugs resolve cleanly without redundant HTTP calls.
- `lib/cms/query-engine.ts`: Ignored stray `slot` query params unless `builder === "1"`.
- `app/sitemap.ts`: Included populated top-level nav parent categories (`SITEMAP_PARENT_CATEGORIES`: `component`, `power`, `accessories`, `gaming`, `server-storage`) without duplicating CMS categories or including `all`.
- `app/page.tsx` & `components/home/MegaDealCountdown.tsx`: Replaced rolling `Date.now() + 5d21h25m09s` target fallback with deterministic `DEFAULT_MEGA_DEAL_TARGET_ISO` (`NEXT_PUBLIC_MEGA_DEAL_END_ISO` override).
- Added/updated unit tests in `tests/catalog/query-and-url.test.ts`, `tests/pc-builder/builder.test.ts`, `tests/cms/cms-layer.test.ts`, and `tests/seo/seo-checklist.test.ts`; updated `docs/{ROUTES,FILTERS_COMPARE,PC_BUILDER,CMS_ADAPTER,COMPONENTS,SEO_CHECKLIST,TODO,CHANGELOG,INDEX}.md`.

## [2026-11-25] - Post-Phase-8 Bugfix & Production Hardening
### Added
- `components/layout/MobileNavDrawer.tsx`: `"use client"` wrapper around the native `popover="auto"` mobile menu that automatically closes on `a[href]` click or `usePathname()` route change.
- `lib/cms/query-engine.ts` (`matchesCategorySlug`, re-exported from `lib/cms/index.ts`): Shared category/parent-category matcher supporting `all`, direct `categorySlug`/`componentType`/`subCategorySlugs`, and top-level groups (`component`, `power`, `accessories`, `gaming`, `server-storage`).
- `lib/seo/metadata.ts` (`normalizeBaseUrl`): Exported base URL normalizer preventing double-slash URLs when `NEXT_PUBLIC_SITE_URL` includes trailing slashes.
### Changed
- **CMS Filtering, Brand Projection & Adapter Hardening**:
  - `lib/cms/types.ts` & `lib/cms/normalize/pipeline.ts`: Preserved `subCategorySlugs?: string[]` on normalized `Product` and wired `matchesCategorySlug()` into `buildCategoriesWithCounts()`.
  - `lib/cms/query-engine.ts`: Wired `matchesCategorySlug()` into `queryProducts()` for all queries (enabling `/category/component?q=...` global search and parent-category browsing outside Builder Mode).
  - `lib/cms/normalize/brands.ts` & `app/sitemap.ts`: Updated `getCategoryBrands()` and `sitemap()` to project `matchesCategorySlug()` matches with normalized `categorySlug` before delegating to `brandVisibility`.
  - `components/catalog/BrandNavStrip.tsx`, `app/category/[category]/page.tsx`, `app/category/[category]/[brand]/page.tsx`: Added optional `sockets`, `ramTypes`, `formFactors`, and `storageInterfaces` props to `BrandNavStrip` so clicking brand pills in PC Builder Mode (`?builder=1&slot=...`) preserves active compatibility filters.
  - `lib/cms/adapters/woocommerce.ts` & `lib/cms/adapters/generic-rest.ts`: Added 60s TTL product caching (`cacheTtlMs`), in-flight fetch deduplication, epoch-guarded `clearCache()`, and 10s `AbortSignal.timeout()` (`timeoutMs`); added `selectLeafWooCategory()` in `mapWooProductToRaw()` to pick the deepest `COMPONENT_TYPE_SLUG_MAP` leaf category while preserving all `subCategorySlugs`.
- **Navigation, PC Builder, Security & SEO Hardening**:
  - `data/redirects.json`: Expanded to 12 permanent `statusCode: 301` redirect rules by adding `/offers` -> `/category/component`, `/deals` -> `/category/component`, `/account` -> `/contact`, and `/cart` -> `/pc-builder`.
  - `components/layout/Header.tsx`, `components/home/HeroSection.tsx`, `components/layout/FloatingActions.tsx`: Replaced dead links (`/offers`, `/deals`, `/account`, `/cart`) with valid routes, wired `<MobileNavDrawer />` into `Header`, and switched the second floating action tile to `Builder` (`/pc-builder` with `Cpu` icon).
  - `app/pc-builder/page.tsx`, `app/category/[category]/page.tsx`, `app/category/[category]/[brand]/page.tsx`: Enforced DEVIATION D6 unrounded `< 60%` coverage guard (`health.status === "red" || health.status === "no-data"`) before enabling PC Builder pre-filtering.
  - `components/pc-builder/PcBuilderClient.tsx` & `app/product/[slug]/page.tsx`: Made `printDate` hydration-safe via `useEffect`, fixed soft-navigation `?add=`/`?share=` sync via composite `queryKey` + `lastAppliedQueryKeyRef`, and mapped `componentType: "other"` -> `"others"` builder slot on PDPs.
  - `app/data-health/page.tsx`: Hardened production authorization so `NODE_ENV === "production"` requires an explicit `DATA_HEALTH_TOKEN` with zero demo fallback.
  - `lib/seo/metadata.ts` & `lib/seo/schema.ts`: Normalized trailing slashes in `constructMetadata()` (`canonical`, `metadataBase`, `openGraph`, `twitter`), switched `schema.ts` to `import type { Product }`, updated `Organization.logo` to `${BASE_URL}/opengraph-image`, and restricted `Product.image` to absolute `http://`/`https://` URLs.
  - `app/globals.css`, `components/contact/ContactForm.tsx`, `app/not-found.tsx`: Hardened `:focus-visible` selector (`:where(a, button, input, textarea, select, [tabindex="0"]):focus-visible`) and explicit `focus-visible:outline focus-visible:outline-2` rings.
- **Tests & Documentation**:
  - Expanded unit tests in `tests/catalog/query-and-url.test.ts`, `tests/cms/cms-layer.test.ts`, `tests/seo/redirects-and-metadata.test.ts`, and `tests/seo/seo-checklist.test.ts`.
  - Refreshed `docs/DATA_HEALTH.md` and `reports/data-health.csv` via `npm run data:audit`.
  - Updated `docs/DATA_MODEL.md`, `docs/CMS_ADAPTER.md`, `docs/FILTERS_COMPARE.md`, `docs/PC_BUILDER.md`, `docs/ROUTES.md`, `docs/COMPONENTS.md`, `docs/SEO_CHECKLIST.md`, `docs/ENV.md`, `docs/CHANGELOG.md`, and verified `docs/INDEX.md`.

## [2026-11-23] - Phase 8: Final Audit & README
### Added
- `README.md`: Comprehensive project and client deployment guide covering tech stack, quick start & npm scripts, environment variables reference, step-by-step `"How to Connect Your CMS"` (`mock`, `woocommerce`, `generic-rest`, custom `ICMSAdapter`, `data/brands.json`, `data/overrides.json`, `data/redirects.json`), `"Data Checklist for Your CMS Editor"` (required attributes, canonical vocabularies, 60% PC Builder pre-filter threshold, `"Other"` / `< 3` brand exclusion, `/data-health` & `npm run data:audit`), routes & SEO summary, and documentation index.
- `tests/seo/seo-checklist.test.ts`: End-to-end technical SEO unit test suite covering `app/robots.ts`, `app/sitemap.ts`, `lib/seo/schema.ts` (`getOrganizationSchema`, `getProductSchema`, `getItemListSchema`), and `lib/seo/metadata.ts` (`constructMetadata`).
### Changed
- Refreshed `docs/DATA_HEALTH.md` and `reports/data-health.csv` via `npm run data:audit`.
- Updated `docs/PHASES.md`, `docs/TODO.md`, `docs/CHANGELOG.md`, and `docs/INDEX.md` for Phase 8.

## [2026-11-23] - Phase 7: Pages, Tracking & Contact
### Added
- `lib/contact/schema.ts`: Shared Zod `contactSchema` (`name`, `email`, `phone`, `subject`, `message`, `honeypot`), `ContactSubmission`, `ContactFieldName`, `ContactFieldErrors`, and `extractFieldErrors`.
- `lib/contact/rate-limit.ts`: In-memory IP rate limiter (`createRateLimiter` defaulting to 5 requests per 10 minutes with expired-entry pruning above 500 entries, `extractClientIp`, `contactRateLimiter`).
- `lib/contact/mailer.ts`: Multi-transport contact email dispatcher (`resolveEmailTransportConfig` precedence: `RESEND_API_KEY` -> `SMTP_HOST` -> `demo` fallback), `sanitizeHeaderValue`, `buildContactEmailContent`, `sendViaResend` (native `fetch`), `sendViaSmtp` (native `node:net`/`node:tls` with `EHLO`, `STARTTLS`, implicit TLS on `SMTP_SECURE=true`/port `465`, `AUTH LOGIN`, `DATA` dot-stuffing, `QUIT`), and `sendContactEmail`.
- `lib/contact/handler.ts`: `handleContactRequest` handling JSON parsing, rate limiting (`429` + `Retry-After`), honeypot & field validation (`400`), email dispatch (`200` `demo`/`resend`/`smtp`), and transport failures (`502`).
- `lib/analytics/consent.ts`: Consent helpers (`COOKIE_CONSENT_STORAGE_KEY = "pc_cookie_consent"`, `COOKIE_CONSENT_EVENT`, `COOKIE_CONSENT_OPEN_EVENT`, `parseConsentRecord`, `createConsentRecord`, `readStoredConsent`, `writeStoredConsent`, `hasAnalyticsConsent`, `isValidGaMeasurementId`).
- `components/analytics/CookieConsent.tsx`: Hydration-safe non-blocking bottom-left preference region (`"Essential Only"` / `"Accept Analytics"`, saved-preference badge & close button, reopen event listener, cross-tab `storage` sync, `aria-live="polite"` feedback).
- `components/analytics/CookieSettingsButton.tsx`: Client trigger button (`label = "Cookie Settings"`) dispatching `COOKIE_CONSENT_OPEN_EVENT`.
- `components/analytics/GoogleAnalytics.tsx`: Consent-gated GA4 loader (`next/script` `afterInteractive`, Consent Mode defaults with ad storage denied, `anonymize_ip: true`, `allow_google_signals: false`, dynamic revocation via `ga-disable-${id}` + `gtag("consent", "update")`).
- `tests/contact/contact.test.ts`, `tests/analytics/consent.test.ts`, `tests/seo/redirects-and-metadata.test.ts`: 28 new unit tests (240/240 total across 48 suites) covering contact schema/rate-limit/Resend/SMTP/handler, consent storage & GA4 ID XSS protection, `data/redirects.json`, `next.config.js` `redirects()`/`headers()`, and dynamic `NEXT_PUBLIC_GSC_VERIFICATION` metadata.
### Changed
- `app/api/contact/route.ts`: Delegated `POST` handling directly to `handleContactRequest(request)`.
- `components/contact/ContactForm.tsx` & `app/globals.css`: Upgraded form with shared `contactSchema` validation, `noValidate` + explicit `aria-invalid`, email/phone hints above inputs, conditional `aria-describedby` error IDs, 400ms debounced `aria-live="polite"` blur announcements, focus-first-invalid on client/400 submit, server `fieldErrors` mapping, `role="status"`/`role="alert"` banners, and `.contact-input:user-invalid`.
- `app/contact/page.tsx`: Preserved single `<h1>`, `Breadcrumbs`, support cards, and `<ContactForm />`; added 5-showroom `Our Branch Locations` directory grid.
- `app/privacy-policy/page.tsx` & `app/terms/page.tsx`: Added `#cookies` browser storage table (`pc_compare_items`, `pc_builder_state`, `pc_cookie_consent`, `_ga, _ga_*`) and `<CookieSettingsButton />` on `/privacy-policy`, plus quick-jump anchor pills and all 7 `scroll-mt-24` sections matching footer targets (`#pricing`, `#warranty`, `#delivery`, `#refund`, `#emi`, `#star-points`, `#pc-builder`) on `/terms`.
- `components/layout/Footer.tsx` & `app/layout.tsx`: Added `<CookieSettingsButton />` to Footer bottom copyright strip and mounted `<CookieConsent />` + `<GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_ID} />` in `RootLayout`.
- `data/redirects.json` & `next.config.js`: Expanded `redirects.json` to 8 permanent redirect rules, mapped to `statusCode: 301` (without `permanent` collision) in `redirects()`, and added global `headers()` (`Referrer-Policy`, `Permissions-Policy`).
- Updated `.env.example`, `docs/ENV.md`, `docs/PHASES.md`, `docs/SEO_CHECKLIST.md`, `docs/COMPONENTS.md`, `docs/ROUTES.md`, `docs/TODO.md`, `docs/CHANGELOG.md`, and `docs/INDEX.md`.

## [2026-11-23] - Phase 6: PC Builder
### Added
- `lib/pc-builder/builder.ts`: Pure TypeScript PC Builder engine (`PC_BUILDER_STORAGE_KEY = "pc_builder_state"`, `PREFILTER_MIN_COVERAGE_PERCENT = 60`, `BUILDER_SLOTS` 12-slot definition, `evaluateBuilderState`, `getChooseHref`, `encodeShareState`/`decodeShareState`, `parseBuilderStorage`, state mutators).
- `tests/pc-builder/builder.test.ts`: 9 unit tests covering 12-slot definitions, quantity clamping, compatibility & wattage evaluation, out-of-stock/absent-price exclusion, manual verification toggles, share encoding/decoding, and corrupt-storage recovery.
- `components/pc-builder/PcBuilderClient.tsx`: `"use client"` PC Builder workspace with `localStorage` (`pc_builder_state`) persistence, cross-tab `storage` sync, SSR `pendingAdd`/`sharedBuild` hydration, live totals/wattage, `"Print Summary"`, `"Share Build"`, `"Clear Build"`, and `hidden print:block` summary header.
- `components/pc-builder/BuilderSlotRow.tsx`: `"use client"` slot row with Required/Optional & exclusion badges, quantity `-`/`+` controls (`ram`, `storage`, `monitor`, `others`), and Choose/Change/Remove actions.
- `components/pc-builder/CompatibilitySummary.tsx`: `"use client"` compatibility panel with `"Unverified checks: N"`, `"Ignore compatibility"` switch, `"Could not verify"` badge + `"I verified this manually"` checkbox toggle, and `"based on detected data"` indicator.
### Changed
- `lib/cms/query-engine.ts`: Mapped `slot === "others"` to `componentType === "other"` and allowed `?builder=1&slot=...` under parent categories (`component`, `power`, `accessories`) to match by slot `componentType`.
- `app/pc-builder/page.tsx`: Wired `force-dynamic` SSR resolution for `?add=&slot=` and `?share=`, per-slot `evaluateCategoryHealth` coverage calculation, and `<PcBuilderClient />`.
- `app/category/[category]/page.tsx` & `app/category/[category]/[brand]/page.tsx`: Enforced 60% `PREFILTER_MIN_COVERAGE_PERCENT` threshold in Builder Mode banner with explanatory notice and `"Ignore compatibility filter"` `<Link>` toggle.
- Updated `docs/PHASES.md`, `docs/PC_BUILDER.md`, `docs/COMPONENTS.md`, `docs/ROUTES.md`, `docs/TODO.md`, and `docs/CHANGELOG.md`.

## [2026-11-23] - Phase 5: Product Compare
### Added
- `lib/compare/compare.ts`: Pure TypeScript compare engine (`COMPARE_STORAGE_KEY`, `COMPARE_CHANGE_EVENT`, `MAX_COMPARE_ITEMS = 4`, `serializeCompareProduct`, `addToCompareList`, `replaceCompareList`, `removeFromCompareList`, `parseCompareStorage`, `buildCompareRows`).
- `tests/compare/compare.test.ts`: 14 unit tests covering serialization, max-4 capacity, deduplication, same-category lock, corrupt-storage recovery, and `buildCompareRows()` difference highlighting.
- `components/compare/CompareProvider.tsx`: Client context provider (`CompareProvider`, `useCompare`) managing `pc_compare_items` in `localStorage`, cross-tab `storage` events, same-tab `pc-compare-change` events, and `pendingConflict` state.
- `components/compare/CompareButton.tsx`: `"use client"` toggle button (`variant="card" | "detail"`) with `aria-pressed`, accessible label, and `"Max 4 items"` status feedback.
- `components/compare/CompareBar.tsx`: `"use client"` floating bottom `no-print` drawer with item thumbnails/brand badges, remove/clear actions, `"Compare Now"` -> `/compare`, `aria-live="polite"` announcements, and native `<dialog>` `showModal()` confirmation for category-mismatch replacement.
- `components/compare/CompareTable.tsx`: `"use client"` accessible comparison matrix with sticky `"Specification"` column, `bg-amber-50/80` + `"Differs"` badge highlighting, `"Show differences only"` toggle, `"Add more"` CTA, and empty/1-item states.
### Changed
- `app/layout.tsx`: Wrapped body content in `<CompareProvider>` and mounted `<CompareBar />`.
- `components/layout/FloatingActions.tsx`: Synced `COMPARE` badge count with `useCompare()`.
- `components/catalog/ProductCard.tsx`: Added `<CompareButton product={product} variant="card" />` at `relative z-10` without breaking stretched card link or `builderMode`.
- `app/product/[slug]/page.tsx`: Added `<CompareButton product={product} variant="detail" />` beside PC Builder / Browse actions.
- `app/compare/page.tsx`: Wired `<CompareTable />` inside SSR shell with `Breadcrumbs`, single `<h1>`, and `noIndex: true`.
- Updated `docs/PHASES.md`, `docs/FILTERS_COMPARE.md`, `docs/COMPONENTS.md`, `docs/ROUTES.md`, `docs/TODO.md`, `docs/INDEX.md`, and `docs/CHANGELOG.md`.

## [2026-11-23] - Phase 4: Catalog Features & Live SSR/ISR Routes
### Added
- `lib/catalog/url-params.ts`: Deterministic URL search parameter parser (`parseCatalogSearchParams`), serializer (`buildCatalogUrl`), `ALLOWED_LIMITS` (`[12, 24, 48, 96]`, default `24`), and `hasNonCanonicalFilterParams` helper for SEO canonical/noindex rules.
- `tests/catalog/query-and-url.test.ts`: 10 unit tests covering catalog query filtering, zero-count facet suppression, and URL parameter parsing/serialization (189/189 total tests passing).
- `components/catalog/BrandNavStrip.tsx`: Server Component rendering dynamic `Brand (count)` pills from `getBrandsByCategory()` with `"All Brands"`, active `aria-current="page"`, and preserved `?builder=1&slot=...`.
- `components/catalog/FilterSidebar.tsx`: Client Component driving URL search param updates (`useRouter().push(buildCatalogUrl(...))`) with keyword `<search>` form, Price Range (`min`/`max` + Apply), Availability (`in-stock`/`all`), Brand checkboxes (hidden when `lockedBrandSlug` is set), dynamic attribute facets (`socket`, `ramType`, `formFactor`, `storageInterface`) hiding zero-count options/groups, mobile drawer, and `Clear All Filters`.
- `components/catalog/SortSelector.tsx`: Client Component for Show (`12`/`24`/`48`/`96`) and Sort By (`Default`, `price-asc`, `price-desc`, `newest`, `name-asc`).
- `components/catalog/Pagination.tsx`: Accessible `<nav aria-label="Pagination">` with `<Link>` page numbers, Prev/Next, ellipsis windowing, and `aria-current="page"`.
### Changed
- `lib/cms/types.ts` & `lib/cms/query-engine.ts`: Extended `CatalogQueryParams` and `queryProducts` with `q` token search, attribute filters (`sockets`, `ramTypes`, `formFactors`, `storageInterfaces`), selected states, and zero-count facet/group suppression.
- `components/catalog/ProductCard.tsx`: Polished `focus-visible` ring on the `"Add to PC Builder"` CTA.
- `app/category/[category]/page.tsx` & `app/category/[category]/[brand]/page.tsx`: Wired live SSR (`dynamic = "force-dynamic"`) via `getCmsAdapter()`, Builder Mode banner, `Breadcrumbs`, `ItemList` JSON-LD, single `<h1>`, and SEO `generateMetadata` (`noIndex: true` + clean base `canonicalPath` on filtered URLs, empty categories, and `< 3`-product or `"other"` brand pages).
- `app/product/[slug]/page.tsx`: Wired live ISR (`revalidate = 3600`) via `getProductBySlug(slug)` with `notFound()` fallback, `Product` JSON-LD, `Breadcrumbs`, single `<h1>`, priority `next/image` or SVG fallback, `"Call for price"` fallback, normalized spec `<table>` with source badges, `"Add to PC Builder"` link, and up to 4 related CMS products.
- Updated `docs/PHASES.md`, `docs/FILTERS_COMPARE.md`, `docs/ROUTES.md`, `docs/COMPONENTS.md`, `docs/SEO_CHECKLIST.md`, and `docs/TODO.md`.

## [2026-11-23] - Phase 3 Mini-Phase 9: Editorial SEO Closing Block & Full Dark-Navy Footer (Image 9 — All 9 Phase 3 Sections Built)
### Added
- `docs/SECTIONS/footer-full.md`: Mini-Phase 9 spec documenting `includeClosingSection`, full 3-zone dark-navy Star Tech Footer, App/Social strip, copyright row, responsive breakpoints, accessibility landmarks, and valid route links.
### Changed
- `components/home/EditorialSeoSection.tsx`: Implemented `includeClosingSection` block (`<h3>` `Best Price, Product, After-sales Customer Service, & Fastest Delivery` with `EditorialLink` routes to `/category/component` and `/contact`).
- `app/page.tsx`: Enabled `<EditorialSeoSection includeMiddleSections includeClosingSection />`, completing all 9 homepage design sections while preserving `revalidate = 3600`, single `<h1>`, and zero hardcoded products.
- `components/layout/Footer.tsx`: Recreated Image 9's full dark-navy (`#081621`) Star Tech footer — 3-zone top grid (`SUPPORT` bordered `16793` & `Find Our Stores` pills, 3-col 12-link `ABOUT US` `<nav>` mapped strictly to valid routes, `STAY CONNECTED` `<address>`), middle `Google Play` & `App Store` badges + 4 circular social buttons (WhatsApp, Facebook, YouTube, Instagram), and bottom copyright + `Powered By: Star Tech` bar (0 new Tailwind tokens).
- Updated `docs/SECTIONS/README.md` (all 9/9 marked `Implemented`), `docs/PHASES.md` (`IN_PROGRESS (Mini-Phase 9 of 9 Ready for Approval — All 9 Design Sections Built)`), `docs/COMPONENTS.md` (`EditorialSeoSection`, `Footer`), `docs/TODO.md` (`T-004` + resume checkpoint), and `docs/INDEX.md`.

## [2026-11-22] - Phase 3 Mini-Phase 8: Editorial SEO Body Sections (Image 8)
### Added
- `docs/SECTIONS/editorial-seo-body.md`: Mini-Phase 8 spec documenting `includeMiddleSections` activation, all 6 Image 8 `<h3>` blocks, internal category/brand/PC Builder link inventory, and accessibility/heading continuity.
### Changed
- `components/home/EditorialSeoSection.tsx`: Activated `includeMiddleSections` rendering all 6 Image 8 `<h3>` subsections (`Best Office Equipment Shop`, `Largest Gadget Shop`, `Top Mobile Shop`, `Best Home Appliance Shop`, `Best Lifestyle & Healthcare Products Shop`, `Trusted Online Shopping From Bangladesh at The Best E-Commerce Website`) using `EditorialLink` (`#c83712` underlined WCAG AA links) while keeping `includeClosingSection` reserved for Mini-Phase 9.
- `app/page.tsx`: Enabled `<EditorialSeoSection includeMiddleSections />` (preserving Mini-Phases 1–7, `revalidate = 3600`, single `<h1>`, and leaving Footer untouched for Mini-Phase 9).
- Updated `docs/SECTIONS/README.md`, `docs/PHASES.md` (`Mini-Phase 8 of 9`), `docs/COMPONENTS.md`, and `docs/INDEX.md`.

## [2026-11-22] - Phase 3 Mini-Phase 7: Mega Deal Show All CTA & Editorial SEO Intro (Image 7)
### Added
- `components/home/EditorialSeoSection.tsx`: Server Component sitting on the transparent `#f2f4f8` canvas (`includeMiddleSections`/`includeClosingSection` props defaulting `false` for Mini-Phases 8–9) rendering Image 7's 3 semantic intro blocks (`<h2>` + 2 `<h3>` headings, zero skipped levels) with WCAG AA underlined `#c83712` internal category, brand, contact, and PC Builder links (`EditorialLink`).
- `docs/SECTIONS/mega-deal-cta-editorial-intro.md`: Mini-Phase 7 spec for full-width Mega Deal `Show all` CTA activation, `EditorialSeoSection` intro blocks, heading hierarchy, internal link inventory, and contrast treatment.
### Changed
- `components/home/MegaDealSection.tsx`: Refined bottom `Show all` CTA button text scale (`text-xs sm:text-sm`) to match Image 7.
- `app/page.tsx`: Activated `showAllHref="/category/component"` and `showAllLabel="Show all"` on `<MegaDealSection />` and replaced the temporary editorial placeholder with `<EditorialSeoSection />` (0 hardcoded products, single `<h1>`, `revalidate = 3600`).
- Updated `docs/SECTIONS/README.md`, `docs/PHASES.md` (`Mini-Phase 7 of 9`), `docs/COMPONENTS.md`, `docs/SEO_CHECKLIST.md` (item 18), and `docs/INDEX.md`.

## [2026-11-22] - Phase 3 Mini-Phase 6: Mega Deal 3×5 Multi-Row Grid, Gift Badges & Price Polish (Image 6)
### Added
- `docs/SECTIONS/mega-deal-grid.md`: Mini-Phase 6 spec covering 3×5 responsive multi-row grid rhythm, `Save`/`Gift` purple badge precedence, `"FREE GIFT"` blue gradient strip, finite price validation & `"Call for price"` fallback, and 15-item non-overlapping CMS selection.
### Changed
- `components/catalog/ProductCard.tsx`: Added optional `giftLabel?: string` prop with automatic CMS gift detection (`attributes.freeGift?.value`, `unmappedAttributes?.gift` / `free_gift`), top-left purple badge precedence (`badgeLabel` → `Save` → `Gift: <text>`), bottom-left `"FREE GIFT"` blue gradient strip (`from-brand-blue to-brand-sky`) with dynamic `OfficialWarrantyBadge` clearance, `Number.isFinite` price validation for `"Call for price"`, and `mt-auto pt-3` bottom-aligned price baselines (0 new Tailwind tokens).
- `components/home/MegaDealSection.tsx`: Tuned multi-row vertical spacing (`gap-y-3.5 sm:gap-y-4`) for crisp 3×5 desktop rhythm; kept `showAllHref` optional and omitted on `app/page.tsx` until Mini-Phase 7.
- `app/page.tsx`: Expanded `megaDealProducts` from 5 to 15 unique live CMS items (3 full 5-col desktop rows) excluding all 8 items in Flash Sale Bands 1–2 (23 distinct live CMS items total, 0 overlap, 0 hardcoded products).
- Updated `docs/SECTIONS/README.md`, `docs/PHASES.md` (`Mini-Phase 6 of 9`), `docs/COMPONENTS.md`, `docs/TODO.md` (updated `T-004` and recorded user live `http://localhost:3000/` preview preference), and `docs/INDEX.md`.

## [2026-11-22] - Phase 3 Mini-Phase 5: 11.11 Mega Deal Header, Countdown & 5-Col Grid (Image 5)
### Added
- `components/home/MegaDealCountdown.tsx`: Hydration-safe Client Component rendering `Ending In:` above 4 split-digit crimson tile groups (`Days`, `Hours`, `Minutes`, `Seconds`, `#c8232c`, `tabular-nums`) inside semantic `<time dateTime="P...DT...H...M...S">` with deterministic SSR fallback (`05d 21h 25m 09s`), client `useEffect` 1-second interval + cleanup, and zero `aria-live` tick spam.
- `components/home/MegaDealSection.tsx`: Reusable Server Component (ready for Mini-Phases 5–7) wrapping header + `MegaDealCountdown`, full-width copper campaign ribbon banner (`Up to 30,000৳ OFF`, `11.11` + lightning bolt + `Mega Savings Festival`, `Free Delivery · 64 Districts`), 5-column responsive `ProductCard` grid with empty state, and optional bottom `Show all` CTA (omitted unless `showAllHref` is passed).
- `docs/SECTIONS/mega-deal-header.md`: Complete Mini-Phase 5 responsive breakpoints, component contracts, hydration/accessibility notes, tokens, and CMS selection spec.
### Changed
- Added 3 Mega Deal color tokens (`countdownRed: "#c8232c"`, `megaRibbonFrom: "#8c2b06"`, `megaRibbonMid: "#d95b12"`) to `tailwind.config.ts`.
- Updated `app/page.tsx` to fetch `getFlashDeals()` + `getAllProducts()` in parallel, build a deduplicated 5-product live CMS slice prioritizing unused deals/catalog items not shown in Flash Sale Bands 1–2 (zero hardcoded products), and mount `<MegaDealSection products={megaDealProducts} />` directly below the secondary `<FlashSaleSection />`.
- Updated `docs/SECTIONS/README.md`, `docs/PHASES.md` (`Mini-Phase 5 of 9`), `docs/PROJECT.md`, `docs/COMPONENTS.md`, and `docs/INDEX.md`.

## [2026-11-22] - Phase 3 Mini-Phase 4: Secondary Flash Sale Band (Image 4)
### Added
- `docs/SECTIONS/flash-sale-secondary.md`: Mini-Phase 4 layout, component reuse (`FlashSaleSection` `orange` variant + `ProductCard`), responsive breakpoints, and non-overlapping CMS slicing spec.
### Changed
- `components/home/FlashSaleSection.tsx`: Refined the `orange` variant inside `FlashSalePosterCard` (props contract unchanged; zero new Tailwind tokens) to match Image 4's inverted vertical layout — top festive badge + promo subtitle + dark-navy ribbon pill above a warm-orange studio-pedestal hardware/gadget showcase SVG, framed by top/bottom `FestiveTrimBar` strips.
- `app/page.tsx`: Wired the secondary `<FlashSaleSection posterVariant="orange" />` band (`11.11 | Peripherals & Upgrade Flash Sale`, `showAllHref="/category/monitor"`) directly below the primary `blue` band, fed by a non-overlapping live CMS slice (`flashDeals.slice(4)` excluding Band 1 IDs, lazily supplemented from `getFeaturedProducts(8)` if `< 4`; zero hardcoded products).
- Updated `docs/SECTIONS/README.md`, `docs/PHASES.md` (`Mini-Phase 4 of 9`), `docs/COMPONENTS.md`, and `docs/INDEX.md`.

## [2026-11-22] - Phase 3 Mini-Phase 3: Flash Sale & ProductCard (Image 3)
### Added
- `components/catalog/ProductCard.tsx`: Reusable Server-compatible product card with top-left deep purple `Save` pill (`#6e2594`, auto-computed savings or `badgeLabel` override), `next/image` with component-type-aware inline SVG fallback (`ProductComponentArtwork` for all 12 `ComponentType` values, preventing broken mock `/images/...` 404s), bottom-right Official Warranty shield mini-badge, stretched accessible `<Link>`, `tabular-nums` effective/strikethrough pricing with `"Call for price"` fallback, and optional `builderMode` PC Builder CTA.
- `components/home/FlashSaleSection.tsx`: Reusable periwinkle-lavender gradient-bordered Flash Sale band (`.flash-sale-frame`) with header (`title`, `subtitle`, blue `Show All` CTA), 5-column desktop grid (Col 1 vertical `blue`/`orange` campaign poster + Cols 2–5 up to 4 `ProductCard`s), and empty-state fallback when zero deals are returned.
- `docs/SECTIONS/flash-sale-rows.md`: Complete Mini-Phase 3 layout, responsive breakpoints, component hierarchy, Tailwind/CSS tokens, and dynamic CMS data flow spec.
### Changed
- Added Flash Sale & badge tokens (`badgePurple`, `flashBg`, `flashBgEnd`, `flashPosterBlueFrom`, `flashPosterBlueTo`, `flashPosterOrangeFrom`, `flashPosterOrangeTo`) to `tailwind.config.ts` and `.flash-sale-frame` multi-stop gradient border + `forced-colors` fallback to `app/globals.css`.
- Converted `app/page.tsx` to an `async` Server Component fetching live CMS deals via `getCmsAdapter().getFlashDeals()` (supplemented from `getFeaturedProducts(4)` when `< 4`; zero hardcoded products) and wired primary `<FlashSaleSection />` below `<StoreLocatorBanner />`.
- Updated `docs/SECTIONS/README.md`, `docs/PHASES.md` (`Mini-Phase 3 of 9`), `docs/PROJECT.md`, `docs/COMPONENTS.md`, `docs/SEO_CHECKLIST.md` (items 11, 12, 18), and `docs/INDEX.md`.

## [2026-11-22] - Phase 3 Checkpoint (After Mini-Phase 2)
### Changed
- Prepared session resume checkpoint across `docs/SECTIONS/README.md` (mapped all 9 uploaded homepage screenshots with exact paths, status, and design continuity rules), `docs/PHASES.md` (`Checkpointed — Mini-Phases 1–2 of 9 DONE; Next: Mini-Phase 3 / Image 3`), and `docs/TODO.md` (marked `T-001`–`T-003` Completed, updated `T-004`, added `Session Resume Checkpoint`).

## [2026-11-22] - Phase 3 Mini-Phase 2: Featured Categories & Store Locator Banner (Image 2)
### Added
- `components/home/FeaturedCategories.tsx`: 16-tile Featured Category grid (8×2 desktop / 4-col tablet / 2-col mobile, equal-height white cards with 16 bespoke 1.5px monochrome line-art SVG icons and valid `/category/*` links, `role="list"` for Safari VoiceOver).
- `components/home/StoreLocatorBanner.tsx`: Full-width cyan-to-royal-blue gradient banner (`20+ Physical Stores`) with white map-pin icon and warm gold `Find Our Store` pill CTA linking to `/contact`.
- `docs/SECTIONS/featured-categories-stores.md`: Complete Mini-Phase 2 layout, responsive breakpoints, token, and accessibility spec.
### Changed
- Added Store Locator color tokens (`storeCyan`, `storeBlue`, `storeNavy`, `storeGold`, `storeGoldHover`) to `tailwind.config.ts`.
- Wired `<FeaturedCategories />` and `<StoreLocatorBanner />` into `app/page.tsx`, replacing Phase 1 placeholders while preserving Mini-Phase 1 above and SEO placeholder below.
- Updated `docs/SECTIONS/README.md`, `docs/PHASES.md` (`Mini-Phase 2 of 9`), `docs/PROJECT.md`, `docs/COMPONENTS.md`, and `docs/INDEX.md`.

## [2026-11-22] - Phase 3 Mini-Phase 1: Hero & Header (Image 1)
### Added
- **Hero & Top-of-Page Sections**:
  - `components/home/HeroSection.tsx`: 2-column desktop hero grid (`lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_340px]`) with 5-slide CSS scroll-snap carousel (Slide 1: City IT Mega Fair 2026 inline SVG artwork + 4 promotional slides; prev/next, pause/play, 5 dash indicators, polite live region) and 2 right stacked promo cards (Feedback/Complain + Laptop Mela).
  - `components/home/AnnouncementBar.tsx`: Full-width white pill notice ticker with hover/focus pause, visible Pause/Play button, and `prefers-reduced-motion` static fallback.
  - `components/home/QuickServiceBar.tsx`: Responsive 4-column quick-service helper cards (`Laptop Finder`, `Raise a Complain`, `AC Ton Calculator`, `Servicing Center`) with `#ef4a23` circular icon badges.
- **Section Documentation**: Created `docs/SECTIONS/hero-header.md` covering layout, breakpoints, component hierarchy, Tailwind tokens, accessibility patterns, and implementing files.
### Changed
- Upgraded `components/layout/Header.tsx` (custom orbital Star Tech SVG lockup, `<search>` form, `Offers`/`11.11`/`Account`/gradient `PC Builder` CTA, native `popover="auto"` mobile drawer, and `#ffffff` 18-category navigation bar) and `components/layout/FloatingActions.tsx` (bottom-right `#081621` `COMPARE` & `CART` tiles with `#ef4a23` count badges).
- Extended `tailwind.config.ts` and `app/globals.css` with reusable brand gradient/accent tokens, `rounded-card`/`rounded-control`, `shadow-card`/`shadow-cardHover`/`shadow-nav`/`shadow-dock`, scroll-snap carousel, opt-in marquee keyframes, and popover drawer transitions.
- Wired Mini-Phase 1 sections into `app/page.tsx` while preserving single `<h1>` and placeholder lower sections for Images 2–9.
- Updated `docs/PHASES.md` (Phase 2 `COMPLETED`, Phase 3 `IN_PROGRESS — Mini-Phase 1 of 9`), `docs/PROJECT.md`, `docs/COMPONENTS.md`, `docs/SECTIONS/README.md`, and `docs/INDEX.md`.

## [2026-11-21] - Phase 2: CMS Data Layer & Business Logic
### Added
- **Pure Business Logic (`lib/logic/*`)**: Implemented all Leapter specs (`docs/LOGIC/01-types.md` through `08-data-health.md`) and DEVIATIONS D1–D8 in pure TypeScript with zero framework imports and zero I/O:
  - `lib/logic/types.ts`, `lib/logic/vocab.ts`, `lib/logic/round.ts`
  - `lib/logic/normalize-attribute.ts`, `lib/logic/extract-attributes.ts`
  - `lib/logic/resolve-brand.ts`, `lib/logic/brand-visibility.ts`
  - `lib/logic/check-build-compatibility.ts`, `lib/logic/evaluate-pc-build.ts`
  - `lib/logic/data-health.ts`, `lib/logic/index.ts`
- **CMS Data Layer (`lib/cms/*`)**: Built CMS-agnostic adapter contract, provider field mapping, `componentType` derivation, normalization bridge, and 3 adapters:
  - `lib/cms/adapter.ts`, `lib/cms/types.ts`, `lib/cms/field-map.ts`, `lib/cms/config-loader.ts`, `lib/cms/query-engine.ts`, `lib/cms/index.ts`
  - `lib/cms/normalize/attributes.ts`, `lib/cms/normalize/brands.ts`, `lib/cms/normalize/pipeline.ts`
  - `lib/cms/adapters/mock.ts` (32 intentionally messy products across 12 categories / 7 audited PC component types), `lib/cms/adapters/woocommerce.ts`, `lib/cms/adapters/generic-rest.ts`
  - Populated `data/brands.json` (17 brand enrichment entries with aliases and SKU prefixes) and `data/overrides.json` (2 per-SKU attribute fixes)
- **Data Health Audit & Live Sitemap**:
  - Wired `scripts/data-audit.mjs` (`npm run data:audit`) to run against live CMS adapter + `catalogDataHealthReport`, generating `docs/DATA_HEALTH.md` and `reports/data-health.csv`.
  - Wired `app/data-health/page.tsx` (`DATA_HEALTH_TOKEN` protected, `noindex,nofollow`) with live per-category & per-attribute coverage badges (unrounded D6 thresholds), missing attributes list, brand `"Other"` list, parsed fallback list, and unmapped CMS attributes table using accessible responsive table markup.
  - Wired `app/sitemap.ts` to live CMS adapter + `brandVisibility` so only non-empty categories (>= 1 product), indexable brand pages (>= 3 products, excluding `"Other"`), and active products are included.
- **Unit Test Suites (`tests/logic/*`, `tests/cms/*`)**: Added 179 passing tests covering all 79 JSON cases in `docs/LOGIC/tests/*.test.json`, D1–D8 deviations, messy normalizer inputs, and CMS adapter/normalization/brand/override behavior.
### Changed
- Updated `tsconfig.json` (`allowImportingTsExtensions: true`) for seamless Node 24 native TS test/script execution alongside `tsc` and Next.js build.
- Updated `docs/PHASES.md`, `docs/PROJECT.md` (recorded `https://www.startech.com.bd/` visual/catalog demo reference), `docs/CMS_DATA_GUIDE.md`, `docs/templates/attributes-template.csv`, `docs/CMS_ADAPTER.md`, `docs/BRANDS.md`, `docs/DATA_MODEL.md`, `docs/DATA_HEALTH.md`, `docs/SEO_CHECKLIST.md`, and `docs/INDEX.md`.

## [2026-11-21] - Phase 1 Re-Check & Hardening
### Fixed
- Removed all hardcoded placeholder products and hardcoded brand checkboxes from `app/category/[category]/page.tsx`, `app/category/[category]/[brand]/page.tsx`, and `app/product/[slug]/page.tsx`; replaced with friendly empty states (`noindex,follow`) and excluded empty categories from `app/sitemap.ts`.
- Enabled full `next/core-web-vitals` and `next/typescript` ESLint rules in `eslint.config.mjs` and resolved all 7 TypeScript/lint errors and 2 unused-var warnings.
- Aligned `lib/cms/types.ts`, `lib/seo/schema.ts`, `data/brands.json`, `docs/DATA_MODEL.md`, and `docs/CMS_DATA_GUIDE.md` with `docs/LOGIC/01-types.md` (`Availability`, `FormFactor` = `EATX`, optional `price`/`salePrice`, `skuPrefixes`, zero `any` types).
- Fixed default OpenGraph image path in `lib/seo/metadata.ts` (`/api/og` -> `/opengraph-image`), added `noFollow` option for `/data-health` (`noindex,nofollow`), and removed edge runtime warning from `app/opengraph-image.tsx`.
- Extracted `components/contact/ContactForm.tsx` so `app/contact/page.tsx` exports unique SEO metadata; applied modern web accessibility & form practices (`<search>`, explicit `<label htmlFor>`, `autocomplete`, `role="status"`/`role="alert"`, skip link in `app/layout.tsx`, `scope` attributes on `<th>`, Next.js `<Link>` instead of raw `<a>`).
- Added `.gitignore` and `.env.example`, removed unused `vitest.config.ts`, and aligned `docs/SEO_CHECKLIST.md`, `docs/COMPONENTS.md`, and `docs/INDEX.md` with actual Phase 1 state.

## [2026-11-20] - Phase 1: Foundation
### Added
- Next.js 15 App Router scaffold with TypeScript, Tailwind CSS, Zod, and Vitest.
- Memory system documentation suite in `/docs`:
  - `AGENTS.md`: Core operating rules, phase gates, logic instructions.
  - `docs/INDEX.md`: Master table of contents and doc summaries.
  - `docs/PHASES.md`: Phase status tracking and acceptance criteria.
  - `docs/PROJECT.md`: Project goals, tech stack, and Star Tech design tokens.
  - `docs/ARCHITECTURE.md`: Directory structure, data flow, rendering strategy.
  - `docs/ROUTES.md`: Complete route registry, rendering modes, and SEO rules.
  - `docs/COMPONENTS.md`: Component registry with prop definitions and usages.
  - `docs/DATA_MODEL.md`: Normalized domain interfaces (Product, Category, Brand, Attribute).
  - `docs/CMS_ADAPTER.md`: CMS adapter contracts and field mapping architecture.
  - `docs/CMS_DATA_GUIDE.md`: Client-facing attribute guide and WooCommerce slugs.
  - `docs/DATA_HEALTH.md`: Baseline data health audit template.
  - `docs/BRANDS.md`: Multi-step brand resolution ladder and visibility thresholds.
  - `docs/FILTERS_COMPARE.md`: URL search param specifications and compare logic.
  - `docs/PC_BUILDER.md`: 12 component slots and Leapter compatibility rules.
  - `docs/SEO_CHECKLIST.md`: Comprehensive SEO audit checklist.
  - `docs/ENV.md`: Environment variables specification.
  - `docs/SECTIONS/README.md`: Design section catalog for Phase 3.
  - `docs/TODO.md`: Open tasks registry.
- Core route skeletons:
  - Homepage (`app/page.tsx`)
  - Category catalog (`app/category/[category]/page.tsx`)
  - Brand in category catalog (`app/category/[category]/[brand]/page.tsx`)
  - Product detail (`app/product/[slug]/page.tsx`)
  - PC Builder (`app/pc-builder/page.tsx`)
  - Product Compare (`app/compare/page.tsx`)
  - Data Health dashboard (`app/data-health/page.tsx`)
  - Contact Us (`app/contact/page.tsx` & `app/api/contact/route.ts`)
  - Privacy Policy (`app/privacy-policy/page.tsx`)
  - Terms & Conditions (`app/terms/page.tsx`)
- SEO helpers and infrastructure:
  - Dynamic Robots handler (`app/robots.ts`)
  - Dynamic Sitemap generator (`app/sitemap.ts`)
  - Dynamic OpenGraph Image generator (`app/opengraph-image.tsx`)
  - Custom 404 handler (`app/not-found.tsx`)
  - JSON-LD schemas (`components/seo/JsonLd.tsx`, `lib/seo/schema.ts`)
  - Metadata builder (`lib/seo/metadata.ts`)
  - Breadcrumbs component (`components/seo/Breadcrumbs.tsx`)
- Data files:
  - `data/brands.json`
  - `data/overrides.json`
  - `data/redirects.json`
