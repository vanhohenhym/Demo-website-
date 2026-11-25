# Computer & Electronics E-Commerce Demo (CMS-Agnostic Next.js Storefront)

A production-ready, CMS-agnostic computer and electronics e-commerce storefront built with Next.js App Router. Products, categories, brands, and inventory are fetched dynamically from an external CMS through a unified adapter contract—zero product data is hardcoded in UI components or routes.

---

## Tech Stack

- **Framework**: Next.js 15 (`^15.1.0`, App Router, SSR + ISR)
- **Language**: TypeScript 5 (`strict` mode)
- **UI & Styling**: React 19, Tailwind CSS 3.4, `lucide-react`, `next/image` (`avif` / `webp`)
- **Validation**: Zod (`^3.24.2`)
- **Architecture**: CMS-agnostic `ICMSAdapter` (`mock`, `wp-posts`, `woocommerce`, `generic-rest`) + pure TypeScript domain logic (`lib/logic/`)
- **Testing**: Node 24 native test runner (`node --test tests/**/*.test.ts`)

---

## Quick Start & Scripts

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and adjust values as needed (the default `CMS_PROVIDER=mock` works out of the box with 32 demo products):

```bash
cp .env.example .env.local
```

> **Windows Note**: If Node 24 / `pnpm` binaries are vendored in `.tools` under the workspace root, prefix PowerShell commands with:
> ```powershell
> $env:PATH = "E:\Demo website\.tools;$env:PATH"
> ```

### 3. Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server at `http://localhost:3000` |
| `npm run build` | Build the production Next.js bundle |
| `npm run start` | Start the production server after `npm run build` |
| `npm run typecheck` | Run TypeScript type checking (`tsc --noEmit`) |
| `npm run lint` | Run ESLint (`eslint .`) |
| `npm test` | Run all unit tests via Node 24 native test runner (`node --test tests/**/*.test.ts`) |
| `npm run test:watch` | Run unit tests in watch mode (`node --test --watch tests/**/*.test.ts`) |
| `npm run data:audit` | Audit catalog attribute health (`scripts/data-audit.mjs`) and regenerate `docs/DATA_HEALTH.md` & `reports/data-health.csv` |

---

## Environment Variables Reference

All variables are documented in [docs/ENV.md](docs/ENV.md) and templated in [.env.example](.env.example):

| Variable Name | Required | Default Value | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3000` | Canonical site base URL used for sitemaps, OpenGraph metadata, and canonical links. |
| `CMS_PROVIDER` | No | `mock` | Selected CMS adapter: `mock`, `wp-posts` (`wordpress`), `woocommerce`, or `generic-rest`. |
| `CMS_ENDPOINT` | If WP / WC / REST | `""` | Base API URL of external CMS (e.g. `https://public-api.wordpress.com/wp/v2/sites/your-site.wordpress.com` or `https://my-store.com/wp-json/wc/v3`). |
| `CMS_KEY` | If WC (Optional WP/REST) | `""` | WooCommerce Consumer Key, `wp-posts` Username/Bearer Token, or `generic-rest` Bearer Token. |
| `CMS_SECRET` | If WC (Optional WP) | `""` | WooCommerce Consumer Secret or WordPress Application Password. |
| `DATA_HEALTH_TOKEN` | No | `demo-health-token-secret` | Secret authorization token required to access `/data-health`. |
| `NEXT_PUBLIC_GA_ID` | No | `""` | GA4 Measurement ID (`G-XXXXXXXXXX`). Loads only after explicit Cookie Consent opt-in (`pc_cookie_consent`). |
| `NEXT_PUBLIC_GSC_VERIFICATION` | No | `""` | Google Search Console verification token injected into `metadata.verification.google`. |
| `RESEND_API_KEY` | If Contact Resend | `""` | Resend API key (`https://api.resend.com/emails`). Highest contact transport priority when non-empty. |
| `SMTP_HOST` | If Contact SMTP | `""` | Outgoing SMTP server host for contact inquiries (used when `RESEND_API_KEY` is unset). |
| `SMTP_PORT` | If Contact SMTP | `587` | Outgoing SMTP port (`587` for `STARTTLS`, `465` for implicit TLS). |
| `SMTP_SECURE` | No | `false` | Set `"true"` for implicit TLS (`tls.connect`); automatically `true` when `SMTP_PORT=465`. |
| `SMTP_USER` | If Contact SMTP Auth | `""` | Outgoing SMTP username for `AUTH LOGIN` (also serves as `From` fallback if `CONTACT_FROM_EMAIL` is unset). |
| `SMTP_PASS` | If Contact SMTP Auth | `""` | Outgoing SMTP password for `AUTH LOGIN`. |
| `CONTACT_FROM_EMAIL` | No | `""` (fallback: `SMTP_USER` -> `no-reply@example.com`) | Sender `From` header/envelope address for outgoing contact emails. |
| `CONTACT_RECEIVER_EMAIL` | No | `support@example.com` | Destination inbox address for contact form submissions. |

---

## How to Connect Your CMS

The storefront is decoupled from any specific backend via `ICMSAdapter` (`lib/cms/adapter.ts`). Adapter selection is resolved in `lib/cms/index.ts` (`getCmsAdapter()` / `createCmsAdapter()`), and every adapter passes raw items through the shared normalization pipeline (`normalizeRawProducts()` in `lib/cms/normalize/pipeline.ts`).

### Option 1: Built-in Providers

1. **Mock (`CMS_PROVIDER=mock`, default)**  
   Uses `lib/cms/adapters/mock.ts` with 32 intentionally messy raw products across 12 categories to test attribute normalization, brand merging, SKU overrides, `"Call for price"` fallback, and data health scoring.

2. **WordPress Posts REST v2 (`CMS_PROVIDER=wp-posts`, zero plugins required)**  
   Works on free WordPress.com Simple sites as well as self-hosted WordPress (`/wp-json/wp/v2`). In `.env.local`:
   ```env
   CMS_PROVIDER=wp-posts
   CMS_ENDPOINT=https://public-api.wordpress.com/wp/v2/sites/your-site.wordpress.com
   ```
   `lib/cms/adapters/wp-posts.ts` turns WordPress Posts, Categories, Tags, Featured Media, and `Key: Value` spec lines/tables into normalized catalog products. See [docs/CMS_DATA_GUIDE.md](docs/CMS_DATA_GUIDE.md#5-free-wordpress-posts-mode-cms_providerwp-posts) for the post template.

3. **WooCommerce (`CMS_PROVIDER=woocommerce`)**  
   In `.env.local`:
   ```env
   CMS_PROVIDER=woocommerce
   CMS_ENDPOINT=https://your-store.com/wp-json/wc/v3
   CMS_KEY=ck_your_consumer_key
   CMS_SECRET=cs_your_consumer_secret
   ```
   `lib/cms/adapters/woocommerce.ts` reads WooCommerce REST v3 products, categories, attributes, `meta_data`, and HTML descriptions via `CMS_FIELD_MAPS["woocommerce"]` in `lib/cms/field-map.ts`.

4. **Generic Headless REST (`CMS_PROVIDER=generic-rest`)**  
   In `.env.local`:
   ```env
   CMS_PROVIDER=generic-rest
   CMS_ENDPOINT=https://api.your-cms.com/v1
   CMS_KEY=your_optional_bearer_token
   ```
   `lib/cms/adapters/generic-rest.ts` integrates with any REST API returning JSON payloads mapped via `CMS_FIELD_MAPS["generic-rest"]` in `lib/cms/field-map.ts`.

### Option 2: Implementing a Custom `ICMSAdapter`

1. Create a new adapter file in `lib/cms/adapters/<provider>.ts` implementing `ICMSAdapter` from `lib/cms/adapter.ts` (`getCategories`, `getCategoryBySlug`, `getAllProducts`, `getProducts`, `getProductBySlug`, `getBrandsByCategory`, `getFeaturedProducts`, `getFlashDeals`, `getUnmappedAttributes`).
2. Produce `RawAdapterProduct` objects and pass them through `normalizeRawProducts()` so brand resolution, attribute extraction, and unmapped-key tracking work automatically.
3. Add field mappings or category slug mappings in `lib/cms/field-map.ts` (`CMS_FIELD_MAPS`, `COMPONENT_TYPE_SLUG_MAP`) if your CMS uses different field names or category slugs.
4. Register the new provider key in `createCmsAdapter()` in `lib/cms/index.ts`.

### Brand Aliases, SKU Overrides & 301 Redirects

- **Brand Aliases (`data/brands.json`)**: Define canonical brand names, URL slugs, logos, `aliases` (e.g., `"ASUSTeK"`, `"ASUS ROG"` -> `"ASUS"`), `skuPrefixes`, `featured` flags, and display `order`.
- **Per-SKU Overrides (`data/overrides.json`)**: Keyed by SKU (e.g., `"GIG-GPU-4070S-EAGLE": { "lengthMm": "261 mm", "tdp": "220W" }`). Overrides take highest precedence over CMS attributes until the source record is fixed.
- **301 Redirects (`data/redirects.json`)**: Array of `{ "source", "destination", "permanent": true }` rules emitted as `statusCode: 301` redirects in `next.config.js`.

---

## Data Checklist for Your CMS Editor

Full details and bulk import template: [docs/CMS_DATA_GUIDE.md](docs/CMS_DATA_GUIDE.md) and [docs/templates/attributes-template.csv](docs/templates/attributes-template.csv).

### 1. Required Attributes by PC Component Type

| Component Type (`componentType`) | Required Canonical Key(s) | WooCommerce Taxonomy / Field | Example Values |
|---|---|---|---|
| **Motherboard** (`motherboard`) | `socket`, `ramType`, `formFactor`, `storageInterfaces` | `pa_socket`, `pa_memory-type`, `pa_form-factor`, `storage_interfaces` | `AM5`, `DDR5`, `ATX`, `M.2 NVMe;SATA III` |
| **CPU** (`cpu`) | `socket`, `tdp` | `pa_socket`, `pa_tdp` | `AM5`, `105` |
| **GPU** (`gpu`) | `lengthMm`, `tdp` | `pa_length`, `pa_tdp` | `242`, `200` |
| **PSU** (`psu`) | `wattage` | `pa_wattage` | `750` |
| **Case** (`case`) | `formFactor`, `maxGpuLengthMm` | `pa_form-factor`, `max_gpu_length_mm` | `ATX`, `365` |
| **CPU Cooler** (`cooler`) | `coolerSockets` | `cooler_sockets` | `AM4, AM5, LGA1700, LGA1200` |
| **Storage** (`storage`) | `storageInterface` | `pa_storage-interface` | `M.2 NVMe` |
| **RAM** (`ram`, recommended) | `ramType` | `pa_memory-type` / `ram_type` | `DDR5`, `DDR4` |

### 2. Canonical Vocabularies

- **Sockets**: `AM5`, `AM4`, `AM3+`, `LGA1700`, `LGA1851`, `LGA1200`, `LGA1151`, `LGA2066`, `LGA2011-3`, `LGA4677`, `TR5`, `sTR5`, `sTRX4`, `sTRX5`, `SP3`, `SP5`, `FM2+`
- **RAM Types**: `DDR5`, `DDR4`, `DDR3`, `LPDDR5X`, `LPDDR5`, `LPDDR4X`, `LPDDR4` (never `GDDR`)
- **Form Factors**: `EATX`, `ATX`, `mATX`, `Mini-ITX`
- **Storage Interfaces**: `M.2 NVMe`, `M.2 SATA`, `SATA III`
- **Power (`tdp`, `wattage`)**: Positive whole Watts (`> 0`); `W` and `kW` units are normalized automatically.
- **Dimensions (`lengthMm`, `maxGpuLengthMm`)**: Whole millimeters (`50`–`600`); `mm`, `cm`, and `in`/`"` are converted automatically.

### 3. Data Health Thresholds, Brands & Auditing

- **60% Coverage Threshold**: PC Builder compatibility pre-filtering activates automatically for a component category only when required-attribute coverage is **`>= 60%`** (`>= 90%` is Green/Healthy, `60%–89.9%` is Amber/Warning, `< 60%` is Red/Critical). When below 60%, PC Builder displays all parts in that slot with an explanatory notice instead of hiding unattributed items.
- **Brand Visibility & `"Other"` Exclusion**: Placeholder brands (`N/A`, `Generic`, `OEM`, `Unknown`) resolve to `"Other"`. `"Other"` and any brand with **`< 3` products** in a category are marked non-indexable (`noindex,follow`) and excluded from `sitemap.xml` and primary SEO brand pages.
- **Inspecting Data Health**:
  - **Web Dashboard**: Visit `/data-health?token=demo-health-token-secret` (or your configured `DATA_HEALTH_TOKEN`).
  - **CLI Audit**: Run `npm run data:audit` to regenerate [docs/DATA_HEALTH.md](docs/DATA_HEALTH.md) and [reports/data-health.csv](reports/data-health.csv).

---

## Key Features, Routes & SEO Summary

- **Homepage (`/`)**: ISR (`revalidate = 3600`) with 18-category navigation, Hero Carousel, 16-tile Featured Categories, 20+ Physical Stores banner, Flash Sale & Mega Deal CMS grids with countdown, Editorial SEO sections, and 3-zone Footer.
- **Catalog & Brand Pages (`/category/[category]`, `/category/[category]/[brand]`)**: Dynamic SSR (`force-dynamic`) with URL-driven filters (`price`, `brand`, `availability`, `socket`, `ramType`, `formFactor`, `storageInterface`, `q`), zero-count facet suppression, sort, pagination, `BrandNavStrip`, and canonical/`noindex,follow` rules for filtered or thin pages.
- **Product Detail Page (`/product/[slug]`)**: ISR (`revalidate = 3600`) with priority `next/image` hero, BDT pricing + `"Call for price"` fallback, provenanced specification table (`Explicit`, `Parsed`, `Override`, `CMS Raw`), `"Add to PC Builder"` link, and `Product` + `BreadcrumbList` JSON-LD.
- **Product Compare (`/compare`)**: Compare up to **4 same-category products** with `localStorage` (`pc_compare_items`) persistence, cross-tab sync, category-mismatch confirmation modal, and difference highlighting (`"Show differences only"`).
- **12-Slot PC Builder (`/pc-builder`)**: 12 slots (`cpu`, `cooler`, `motherboard`, `ram`, `storage`, `gpu`, `psu`, `case`, `monitor`, `keyboard`, `mouse`, `others`), Leapter compatibility rules (socket, RAM type, form factor, GPU clearance, PSU wattage + 100W buffer, cooler socket), `"Could not verify"` manual verification toggles, `?builder=1&slot=...` category flow, shareable `?share=` URLs, and `@media print` PDF summary.
- **Contact Form (`/contact`, `POST /api/contact`)**: Client + server Zod validation, silent `honeypot` anti-spam rejection, per-IP rate limiting (`5` req / `10` min -> `429` + `Retry-After`), CRLF/HTML sanitization, and `Resend -> SMTP -> demo` transport precedence.
- **Privacy, Terms & Consent-Gated Analytics (`/privacy-policy`, `/terms`)**: Cookie Consent banner + `CookieSettingsButton` (`pc_cookie_consent`), GA4 loaded only after explicit analytics opt-in with dynamic revocation support, and `NEXT_PUBLIC_GSC_VERIFICATION` Google Search Console verification.
- **Technical SEO (22/22 Complete)**: Full verification matrix in [docs/SEO_CHECKLIST.md](docs/SEO_CHECKLIST.md), covering `robots.ts`, dynamic `sitemap.ts`, `opengraph-image.tsx`, custom `not-found.tsx`, `redirects.json` 301s, security headers, and JSON-LD schemas.

---

## Documentation Index

- [AGENTS.md](AGENTS.md) — AI agent operational rules, phase gates, and logic source-of-truth rules
- [docs/INDEX.md](docs/INDEX.md) — Master index of all documentation files
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Directory structure, data flow, and rendering strategy
- [docs/ROUTES.md](docs/ROUTES.md) — Route registry, rendering modes, and SEO indexing/canonical rules
- [docs/CMS_ADAPTER.md](docs/CMS_ADAPTER.md) — `ICMSAdapter` contract, `componentType` derivation, and provider field maps
- [docs/CMS_DATA_GUIDE.md](docs/CMS_DATA_GUIDE.md) — CMS editor guide for required attributes and canonical vocabularies
- [docs/ENV.md](docs/ENV.md) — Environment variables and mail/analytics precedence
- [docs/SEO_CHECKLIST.md](docs/SEO_CHECKLIST.md) — 22-point technical SEO checklist
- [docs/LOGIC/README.md](docs/LOGIC/README.md) — Leapter business logic specs and test suites
- [docs/PHASES.md](docs/PHASES.md) — Development phases roadmap and acceptance criteria
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — Chronological changelog
