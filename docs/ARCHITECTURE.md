# System Architecture

## 1. Directory Structure

```
.
├── AGENTS.md                  # Entry point and instructions for AI agents
├── cloudflare.config.ts       # Cloudflare Workers / vinext bindings (CMS_STORE KV, CMS_PROVIDER)
├── vite.config.ts             # Vite + @cloudflare/vite-plugin configuration for vinext
├── app/                       # Next.js App Router
│   ├── admin/
│   │   └── page.tsx           # Built-in WordPress-style Custom CMS Admin dashboard
│   ├── api/
│   │   ├── cms/               # Custom CMS REST endpoints (auth, products, categories, media, seed)
│   │   └── contact/           # Contact form submission endpoint (rate limited, Zod)
│   ├── category/
│   │   └── [category]/
│   │       ├── page.tsx       # Category catalog with filters & pagination
│   │       └── [brand]/
│   │           └── page.tsx   # Brand sub-category page
│   ├── compare/
│   │   └── page.tsx           # Multi-product comparison matrix
│   ├── contact/
│   │   └── page.tsx           # Contact Us page
│   ├── data-health/
│   │   └── page.tsx           # Data health dashboard (token protected)
│   ├── pc-builder/
│   │   └── page.tsx           # PC Builder slot picker & compatibility evaluator
│   ├── privacy-policy/
│   │   └── page.tsx           # Privacy Policy page
│   ├── product/
│   │   └── [slug]/
│   │       └── page.tsx       # Product detail page (supports ?preview=1 when admin-authenticated)
│   ├── terms/
│   │   └── page.tsx           # Terms & Conditions
│   ├── layout.tsx             # Root layout (Header, Footer, Floating bar, Schema)
│   ├── not-found.tsx          # Custom 404 page
│   ├── opengraph-image.tsx    # Dynamic OpenGraph generator
│   ├── page.tsx               # Homepage
│   ├── robots.ts              # Robots.txt generator
│   └── sitemap.ts             # Dynamic sitemap generator
├── components/
│   ├── admin/                 # Custom CMS Admin UI, ProductEditor, LiveProductPreview, MediaLibraryModal, CategoryManager
│   ├── layout/                # Header, Nav, Footer, FloatingBar
│   ├── catalog/               # ProductCard, SafeProductImage, Filters, Facets, Sort, Pagination
│   ├── compare/               # CompareBar, CompareTable
│   ├── pc-builder/            # SlotRow, CompatibilitySummary, ShareModal
│   ├── seo/                   # JsonLd, Breadcrumbs
│   └── ui/                    # Button, Input, Modal, Badge
├── data/
│   ├── brands.json            # Brand metadata, logos, aliases, featured status
│   ├── overrides.json         # Per-SKU attribute correction overrides
│   └── redirects.json         # 301 redirect map for legacy URLs
├── docs/                      # Central memory system & Leapter business logic
├── lib/
│   ├── cms/                   # CMS abstraction layer
│   │   ├── adapters/          # custom.ts, mock.ts, wp-posts.ts, woocommerce.ts, generic-rest.ts
│   │   ├── normalize/         # attributes.ts, brands.ts, pipeline.ts
│   │   ├── adapter.ts         # Interface ICMSAdapter
│   │   ├── admin-auth.ts      # HMAC cookie + Bearer token auth for /admin & /api/cms/*
│   │   ├── custom-store.ts    # Cloudflare KV (CMS_STORE) / Node (.data/custom-cms.json) store
│   │   ├── field-map.ts       # Field mapping per provider
│   │   ├── image-url.ts       # Safe renderable image URL validator
│   │   ├── index.ts           # Adapter factory driven by CMS_PROVIDER
│   │   └── types.ts           # Normalized domain & custom CMS types
│   ├── logic/                 # Pure TypeScript business logic (from docs/LOGIC)
│   │   ├── vocab.ts           # Central sockets, storage, form factors vocab
│   │   └── ...                # Ported logic functions matching test suites
│   └── seo/                   # Metadata generators, JSON-LD builders, canonical helpers
└── scripts/
    └── data-audit.mjs         # CLI data health auditor producing reports
```

## 2. Data Flow
```
[Built-in Custom Store (KV / .data) or External CMS]
       │
       ▼
[CMS Adapter: fetchProducts / fetchCategories]
       │
       ▼
[Attribute Extraction Ladder & Normalization]
 (Explicit taxonomy -> Meta/Custom fields -> Spec table -> Title regex -> SKU overrides)
       │
       ▼
[Brand Resolution Ladder]
 (Brand taxonomy -> Attribute -> Title prefix -> SKU prefix -> "Other")
       │
       ▼
[Normalized Product Domain Object]
       │
       ├──► [Catalog / Brand Pages] (SSR `force-dynamic`)
       ├──► [Product Detail Page] (SSR `force-dynamic`)
       ├──► [PC Builder Evaluator] (Client-side / SSR hybrid compatibility engine)
       └──► [Data Health Auditor] (Quality coverage scoring)
```

## 3. Rendering Strategy
- **Homepage (`/`)**: Dynamic SSR (`force-dynamic`) so live CMS product creates, edits, and deletes reflect immediately across Next.js and Cloudflare Workers (`vinext`).
- **Category & Brand Pages (`/category/[category]`, `/category/[category]/[brand]`)**: SSR (`force-dynamic`) with URL search params (`price`, `brand`, `page`, etc.).
- **Product Details (`/product/[slug]`)**: Dynamic SSR (`force-dynamic`) with live CMS lookup and admin-authenticated `?preview=1` draft/live preview mode.
- **PC Builder (`/pc-builder`)**: SSR shell with client-side interactive build state in `localStorage`.
- **Compare (`/compare`)**: Client-side localStorage hydration over SSR table layout.
- **CMS Admin (`/admin`)**: Client-hydrated dashboard (`noindex,nofollow`) backed by `/api/cms/*` REST endpoints and `pc_cms_admin` httpOnly cookie auth.
- **Data Health (`/data-health`)**: Dynamic SSR guarded by `DATA_HEALTH_TOKEN` query/header check.
