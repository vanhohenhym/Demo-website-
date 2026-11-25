# Section: Flash Sale Row & Reusable ProductCard (Phase 3 — Mini-Phase 3)

**Reference Image**: `media_1795120409280_5b418f66.jpg` (Image 3 of 9)  
**Status**: Implemented (Phase 3 Mini-Phase 3)

---

## 1. Layout & Responsive Breakpoints

| Viewport | Breakpoint | `FlashSaleSection` Container & Header | `FlashSaleSection` Body Grid (`FlashSalePosterCard` + `ProductCard`s) |
|---|---|---|---|
| **Mobile** | `< 640px` (`default`) | `.flash-sale-frame rounded-2xl p-4 shadow-card`; header wraps cleanly (`flex flex-wrap items-center justify-between gap-3`) with `text-lg font-bold` title + `text-xs` subtitle left and solid blue `Show All` CTA right | 1-column stack (`grid-cols-1 items-stretch gap-3`); vertical campaign poster (`min-h-[280px]`) stacked above up to 4 `ProductCard` tiles (`h-44` visual frame) |
| **Small / Tablet** | `640px – 767px` (`sm`) | `sm:p-5`; `sm:text-xl` heading + `sm:text-[13px]` subtitle | 2-column grid (`sm:grid-cols-2 sm:gap-3.5`); poster `sm:min-h-[300px]`, card visual frame `sm:h-48`; empty-state panel spans `sm:col-span-1` |
| **Medium / Tablet** | `768px – 1023px` (`md`) | `sm:p-5` full-width header split | 3-column grid (`md:grid-cols-3`); empty-state panel spans `md:col-span-2` |
| **Desktop** | `>= 1024px` (`lg`) | Full-width periwinkle-lavender gradient-bordered band inside `max-w-site` (`1320px`) container | 5-column equal-height row (`lg:grid-cols-5 gap-3 sm:gap-3.5`): Col 1 vertical campaign poster (`FlashSalePosterCard`), Cols 2–5 up to 4 `ProductCard` tiles (or empty-state panel spanning `lg:col-span-4` when `products.length === 0`) |

---

## 2. Component Hierarchy & Contracts

```text
app/page.tsx [Async Server Component, revalidate = 3600]
└── FlashSaleSection (components/home/FlashSaleSection.tsx) [Server Component]
    ├── Header Row: <h2> title + <p> subtitle + <Link> "Show All" CTA
    └── 5-Column Grid (grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5)
        ├── Col 1: FlashSalePosterCard (links to showAllHref)
        │   ├── FestiveTrimBar (top decorative SVG strip, blue or orange accent)
        │   ├── Inline SVG Hardware Focal Artwork + Ambient Glow
        │   ├── Campaign Badge Pill (posterBadge) + posterSubtitle + Ornamental Pill (posterTitle)
        │   └── FestiveTrimBar (bottom decorative SVG strip)
        └── Cols 2–5: Up to 4 × ProductCard (components/catalog/ProductCard.tsx) [Server Component]
            ├── Top-left Purple Pill Badge (badgeLabel or auto-computed "Save: X৳ (-Y%)")
            ├── Visual Frame (h-44 sm:h-48):
            │   ├── next/image (fill, responsive sizes, priority) for http(s):// or data:image/ URLs
            │   ├── ProductComponentArtwork (12 ComponentType SVG fallbacks + brand tag) otherwise
            │   └── OfficialWarrantyBadge (bottom-right shield mini-badge when product.warranty is set)
            └── Product Details:
                ├── <h3><Link href="/product/${product.slug}"> (line-clamp-2, stretched card hit area)
                ├── Price Row (tabular-nums): bold orange effective price + muted <del> regular price, or "Call for price"
                └── Optional PC Builder CTA ("Add to PC Builder" when builderMode=true)
```

### Component Props
- **`FlashSaleSectionProps`** (`components/home/FlashSaleSection.tsx`):
  - `title: string`
  - `subtitle: string`
  - `showAllHref: string`
  - `products: readonly Product[]`
  - `posterVariant?: "blue" | "orange"` (default `"blue"`, enabling Mini-Phase 4 reuse)
  - `posterTitle: string`
  - `posterSubtitle: string`
  - `posterBadge?: string` (default `"11.11 FLASH SALE"`)
- **`ProductCardProps`** (`components/catalog/ProductCard.tsx`):
  - `product: Product`
  - `priority?: boolean` (default `false`)
  - `badgeLabel?: string` (optional override for the top-left purple pill; auto-computes savings when omitted)
  - `builderMode?: boolean` (default `false`; renders `/pc-builder?add=<slug>&slot=<slot>` CTA at `relative z-10`)
  - `slot?: string`

---

## 3. Colors, Typography, Spacing & Tailwind Tokens

### Newly Added Tokens (`tailwind.config.ts` → `theme.extend.colors.brand`)
- `brand.badgePurple`: `#6e2594` (top-left `Save` / promo pill badge background)
- `brand.flashBg`: `#eef0ff` (Flash Sale container vertical lavender gradient start)
- `brand.flashBgEnd`: `#e6eaff` (Flash Sale container vertical lavender gradient end)
- `brand.flashPosterBlueFrom`: `#061b44` (blue campaign poster gradient start)
- `brand.flashPosterBlueTo`: `#0b3582` (blue campaign poster gradient end)
- `brand.flashPosterOrangeFrom`: `#c62808` (orange campaign poster gradient start — ready for Mini-Phase 4)
- `brand.flashPosterOrangeTo`: `#f26419` (orange campaign poster gradient end — ready for Mini-Phase 4)

### Custom CSS Utility (`app/globals.css`)
- `.flash-sale-frame`: `border: 1.5px solid transparent;` with double-layer `background`:
  - `linear-gradient(180deg, #eef0ff 0%, #e6eaff 100%) padding-box`
  - `linear-gradient(125deg, #ef4a23 0%, #38bdf8 48%, #3749bb 100%) border-box`
- `@media (forced-colors: active)` fallback resets `.flash-sale-frame` to `border-color: CanvasText; background: Canvas;`.

### Reused Tokens & Typography
- **Primary Prices & Hover Links**: `brand.orange` (`#ef4a23`), bold `text-[15px]` (`text-sm` for `"Call for price"`) with `tabular-nums`.
- **Regular Strikethrough Price**: `<del>` in `text-xs font-medium text-brand-textMuted` (`#6b7280`) with `<span className="sr-only">Regular price: </span>`.
- **CTA & Accents**: `brand.blue` (`#3749bb`) / `brand.blueDark` (`#244b7d`), `rounded-control` (`4px`), `shadow-card` / `shadow-cardHover`.
- **Card Surface**: `rounded-lg border border-brand-border/60 bg-white shadow-card hover:shadow-cardHover`.

---

## 4. Dynamic CMS Data Flow & Safety Rules

- **Zero Hardcoded Products**: Neither `app/page.tsx`, `FlashSaleSection.tsx`, nor `ProductCard.tsx` contains hardcoded products.
- **CMS Adapter Pipeline (`app/page.tsx`)**:
  1. Calls `const adapter = getCmsAdapter()` and `await adapter.getFlashDeals()`.
  2. Takes up to 4 deals (`flashDeals.slice(0, 4)`).
  3. If fewer than 4 flash deals are returned, supplements with deduplicated products from `await adapter.getFeaturedProducts(4)` up to 4 total.
  4. If zero products exist, `FlashSaleSection` renders a clean dashed empty-state card with a `Browse Catalog` CTA linking to `showAllHref`.
- **Safe Image Handling (`ProductCard.tsx`)**:
  - Uses `next/image` (`fill`, `sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"`, `priority={priority}`) only when `product.images[0]?.url` starts with `https://`, `http://`, or `data:image/`.
  - Safely falls back to component-type-aware inline SVG hardware artwork (`ProductComponentArtwork` covering `motherboard`, `cpu`, `gpu`, `psu`, `ram`, `storage`, `cooler`, `case`, `monitor`, `keyboard`, `mouse`, and `other`) with `React.useId()`-scoped `<linearGradient>` IDs and `role="img"` + `aria-label={imageAlt}` when images are missing or relative mock `/images/...` paths — preventing 404s.
- **Savings & Missing-Price Logic**:
  - Savings badge displays `badgeLabel` if passed; otherwise auto-computes `Save: ${savings}৳ (-${percent}%)` when `price != null && salePrice != null && salePrice < price && price > 0`, or omits the pill.
  - Missing `product.price == null` gracefully displays `"Call for price"` in `text-brand-orange`.
- **Accessibility**:
  - Stretched link `<Link href="/product/${product.slug}">` inside `<h3>` (`after:absolute after:inset-0`) with `focus-within:ring-2 focus-within:ring-brand-orange/60` and zero nested interactive elements (`builderMode` CTA sits at `relative z-10`).
  - Decorative SVGs carry `aria-hidden="true"` and `focusable="false"`; hover scale honors `motion-reduce:transition-none motion-reduce:group-hover:scale-100`.

---

## 5. Implementing Files
- `components/catalog/ProductCard.tsx`
- `components/home/FlashSaleSection.tsx`
- `tailwind.config.ts`
- `app/globals.css`
- `app/page.tsx`
