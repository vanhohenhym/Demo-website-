# Section: Secondary Flash Sale Band (Phase 3 — Mini-Phase 4)

**Reference Image**: `media_1795120423357_6b9d1bcc.jpg` (Image 4 of 9)  
**Status**: Implemented (Phase 3 Mini-Phase 4)

---

## 1. Layout & Responsive Breakpoints

Reuses the exact `FlashSaleSection` + `ProductCard` responsive grid architecture from Mini-Phase 3 (`docs/SECTIONS/flash-sale-rows.md`), stacked directly below the primary `blue` Flash Sale band inside `app/page.tsx`'s `space-y-9` vertical rhythm:

| Viewport | Breakpoint | Container & Header | Body Grid (`FlashSalePosterCard` `orange` + `ProductCard`s) |
|---|---|---|---|
| **Mobile** | `< 640px` (`default`) | `.flash-sale-frame rounded-2xl p-4 shadow-card`; wrapping header (`flex flex-wrap items-center justify-between gap-3`) with `text-lg font-bold` title + `text-xs` subtitle left and solid blue `Show All` CTA right | 1-column stack (`grid-cols-1 items-stretch gap-3`); `orange` campaign poster (`min-h-[280px]`) stacked above up to 4 `ProductCard` tiles (`h-44` visual frame) |
| **Small / Tablet** | `640px – 767px` (`sm`) | `sm:p-5`; `sm:text-xl` heading + `sm:text-[13px]` subtitle | 2-column grid (`sm:grid-cols-2 sm:gap-3.5`); poster `sm:min-h-[300px]`, card visual frame `sm:h-48`; empty state spans `sm:col-span-1` |
| **Medium / Tablet** | `768px – 1023px` (`md`) | `sm:p-5` full-width header split | 3-column grid (`md:grid-cols-3`); empty state spans `md:col-span-2` |
| **Desktop** | `>= 1024px` (`lg`) | Full-width periwinkle-lavender gradient-bordered band inside `max-w-site` (`1320px`) | 5-column equal-height row (`lg:grid-cols-5 gap-3 sm:gap-3.5`): Col 1 warm-orange vertical campaign poster (`posterVariant="orange"`), Cols 2–5 up to 4 distinct `ProductCard` tiles (or empty state spanning `lg:col-span-4` when `products.length === 0`) |

---

## 2. Component Reuse & Orange Poster Composition

Zero new components were introduced; Mini-Phase 4 reuses `FlashSaleSection` (`components/home/FlashSaleSection.tsx`) and `ProductCard` (`components/catalog/ProductCard.tsx`) with identical prop contracts:

```text
app/page.tsx [Async Server Component, revalidate = 3600]
└── Secondary FlashSaleSection (posterVariant="orange")
    ├── Header Row:
    │   ├── <h2> "11.11 | Peripherals & Upgrade Flash Sale"
    │   ├── <p> "Enjoy Discount on Power, Cooling, Storage & Gaming Gear!"
    │   └── <Link href="/category/monitor"> "Show All"
    └── 5-Column Grid (grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5)
        ├── Col 1: FlashSalePosterCard (variant="orange", inverted vertical layout)
        │   ├── Top FestiveTrimBar (variant="orange": #fde047 diamonds + #ef4a23 dots)
        │   ├── Top Copy Block:
        │   │   ├── Festive Badge Pill ("11.11 | FLASH SALE", bg-brand-navy/85, text-amber-300, amber-400 dot)
        │   │   ├── posterSubtitle ("Save Big on Everyday PC & Lifestyle Upgrades")
        │   │   └── Dark-Navy Ribbon Pill ("Gaming & Tech Deals", border-amber-300/70 bg-[#081b3e]/95)
        │   ├── Bottom Studio-Pedestal Hardware/Gadget SVG (viewBox="0 0 180 116": gaming mouse, dual-fan display/cooler, smart gadget on 3 warm-orange pedestals + bottom-4 bg-amber-300/35 glow)
        │   └── Bottom FestiveTrimBar (variant="orange")
        └── Cols 2–5: Up to 4 × ProductCard (distinct live CMS deals from Band 2 slice)
```

---

## 3. Colors, Typography, Spacing & Tailwind Tokens

Zero new Tailwind tokens were required — Mini-Phase 4 reuses the tokens added in Mini-Phase 3 (`tailwind.config.ts`):
- **Poster Surface Gradient**: `bg-gradient-to-b from-brand-flashPosterOrangeFrom via-brand-orange to-brand-flashPosterOrangeTo` (`#c62808` → `#ef4a23` → `#f26419`)
- **Poster Ribbon Pill**: `border-amber-300/70 bg-[#081b3e]/95 text-white`
- **Poster Badge & Trim Accents**: `bg-brand-navy/85`, `text-amber-300`, `bg-amber-400`, `#fde047` diamond trim + `#ef4a23` dots, `bottom-4 bg-amber-300/35` radial blur glow
- **Outer Frame & Cards**: `.flash-sale-frame` (`#eef0ff` → `#e6eaff` lavender surface with 1.5px `#ef4a23` → `#38bdf8` → `#3749bb` gradient border + `forced-colors: active` fallback), `brand.badgePurple` (`#6e2594`), `brand.blue` (`#3749bb`) / `brand.blueDark` (`#244b7d`), `brand.orange` (`#ef4a23`), `tabular-nums`.

---

## 4. Dynamic CMS Data Slicing & Deduplication

- **Zero Hardcoded Products**: Both Flash Sale bands pull strictly from `getCmsAdapter()` in `app/page.tsx`.
- **Non-Overlapping Band 1 / Band 2 Pipeline (`app/page.tsx`)**:
  1. Fetches `const flashDeals = await adapter.getFlashDeals()`.
  2. Defines a lazy `getFeaturedFallback()` helper calling `adapter.getFeaturedProducts(8)` at most once if either band has fewer than 4 items.
  3. **Band 1 (`primaryFlashProducts`)**: takes `flashDeals.slice(0, 4)`, supplemented from `getFeaturedFallback()` (deduplicated via `seenPrimary`) if `< 4`.
  4. **Band 2 (`secondaryFlashProducts`)**: builds `primaryIds = new Set(primaryFlashProducts.map(item => item.id))`, takes `flashDeals.slice(4).filter(item => !primaryIds.has(item.id)).slice(0, 4)`, and if `< 4`, supplements from `getFeaturedFallback()` excluding both `primaryIds` and already-selected Band 2 IDs (`seenSecondary`).
  5. Result: Band 1 and Band 2 never display duplicate products; if fewer than 4 items remain (or zero), `FlashSaleSection` renders cleanly without empty broken slots (or shows the dashed empty-state card when `0`).

---

## 5. Implementing Files
- `components/home/FlashSaleSection.tsx` (refined `orange` poster variant in `FlashSalePosterCard`; props contract unchanged)
- `app/page.tsx` (non-overlapping CMS deal slicing + secondary `<FlashSaleSection posterVariant="orange" />`)
- `components/catalog/ProductCard.tsx` (reused untouched from Mini-Phase 3)
