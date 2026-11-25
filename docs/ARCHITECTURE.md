# System Architecture

## 1. Directory Structure

```
.
├── AGENTS.md                  # Entry point and instructions for AI agents
├── app/                       # Next.js App Router
│   ├── api/
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
│   │       └── page.tsx       # Product detail page
│   ├── terms/
│   │   └── page.tsx           # Terms & Conditions
│   ├── layout.tsx             # Root layout (Header, Footer, Floating bar, Schema)
│   ├── not-found.tsx          # Custom 404 page
│   ├── opengraph-image.tsx    # Dynamic OpenGraph generator
│   ├── page.tsx               # Homepage
│   ├── robots.ts              # Robots.txt generator
│   └── sitemap.ts             # Dynamic sitemap generator
├── components/
│   ├── layout/                # Header, Nav, Footer, FloatingBar
│   ├── catalog/               # ProductCard, Filters, Facets, Sort, Pagination
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
│   │   ├── adapters/          # mock.ts, woocommerce.ts, generic-rest.ts
│   │   ├── normalize/         # attributes.ts, brands.ts
│   │   ├── adapter.ts         # Interface ICMSAdapter
│   │   ├── field-map.ts       # Field mapping per provider
│   │   ├── index.ts           # Adapter factory driven by CMS_PROVIDER
│   │   └── types.ts           # Normalized domain types
│   ├── logic/                 # Pure TypeScript business logic (from docs/LOGIC)
│   │   ├── vocab.ts           # Central sockets, storage, form factors vocab
│   │   └── ...                # Ported logic functions matching test suites
│   └── seo/                   # Metadata generators, JSON-LD builders, canonical helpers
└── scripts/
    └── data-audit.mjs         # CLI data health auditor producing reports
```

## 2. Data Flow
```
[External CMS / Mock Data]
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
       ├──► [Catalog / Brand Pages] (SSR with ISR revalidation)
       ├──► [Product Detail Page] (SSR with ISR revalidation)
       ├──► [PC Builder Evaluator] (Client-side / SSR hybrid compatibility engine)
       └──► [Data Health Auditor] (Quality coverage scoring)
```

## 3. Rendering Strategy
- **Homepage (`/`)**: ISR (`revalidate = 3600`) with dynamic banner elements.
- **Category & Brand Pages (`/category/[category]`, `/category/[category]/[brand]`)**: SSR with URL search params (`price`, `brand`, `page`, etc.).
- **Product Details (`/product/[slug]`)**: ISR (`revalidate = 3600`) with `generateStaticParams` for popular items and fallback to dynamic SSR for others.
- **PC Builder (`/pc-builder`)**: SSR shell with client-side interactive build state in `localStorage`.
- **Compare (`/compare`)**: Client-side localStorage hydration over SSR table layout.
- **Data Health (`/data-health`)**: Dynamic SSR guarded by `DATA_HEALTH_TOKEN` query/header check.
