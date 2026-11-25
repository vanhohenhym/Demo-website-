# Section: 11.11 Mega Deal Header, Live Countdown, Campaign Ribbon & 5-Col Grid (Phase 3 — Mini-Phase 5)

**Reference Image**: `media_1795120435387_33cda144.jpg` (Image 5 of 9)  
**Status**: Implemented (Phase 3 Mini-Phase 5)

---

## 1. Layout & Responsive Breakpoints

| Viewport | Breakpoint | Header & `MegaDealCountdown` | `MegaDealRibbonBanner` | 5-Column `ProductCard` Grid |
|---|---|---|---|---|
| **Mobile** | `< 640px` (`default`) | `.flash-sale-frame rounded-2xl p-4 shadow-card`; header stacks vertically (`flex-col gap-3`) with `text-lg font-bold` heading + `text-xs` subtitle above left-aligned (`items-start`) countdown timer | `rounded-2xl` dark `#2c1419` outer frame (`p-1`), inner `rounded-xl` dashed-amber copper gradient pill stacked vertically (`flex-col items-center gap-3 px-4 py-3`); vertical divider hidden (`hidden sm:inline-block`) | 1-column stack (`grid-cols-1 items-stretch gap-3`) |
| **Small / Tablet** | `640px – 767px` (`sm`) | `sm:p-5`; horizontal header split (`sm:flex-row sm:items-center sm:justify-between`) with right-aligned (`sm:items-end`) countdown (`sm:min-w-[22px] sm:text-sm` digit tiles) | `sm:px-7 sm:py-3.5`; center divider visible (`sm:inline-block`); larger `sm:text-3xl` `11.11` emblem | 2-column grid (`sm:grid-cols-2 sm:gap-3.5`) |
| **Medium / Tablet** | `768px – 1023px` (`md`) | Horizontal header split | Full pill shape (`md:rounded-full`) with horizontal 3-part layout (`md:flex-row md:gap-4`): left discount pill, center emblem + title, right delivery pill | 3-column grid (`md:grid-cols-3`) |
| **Desktop** | `>= 1024px` (`lg`) | Full-width lavender gradient-bordered band inside `max-w-site` (`1320px`) | Full-width horizontal pill (`md:rounded-full`) spanning above all 5 product columns | 5-column equal-height grid (`lg:grid-cols-5 gap-3 sm:gap-3.5`) reusing `ProductCard` |

---

## 2. Component Hierarchy & Contracts

```text
app/page.tsx [Async Server Component, revalidate = 3600]
└── MegaDealSection (components/home/MegaDealSection.tsx) [Server Component]
    ├── Header Row:
    │   ├── Left: <h2> "11.11 Mega Deal" + <p> "Enjoy Exciting Discounts on your desired Products!"
    │   └── Right: MegaDealCountdown (components/home/MegaDealCountdown.tsx) [Client Component]
    │       ├── <span> "Ending In:"
    │       └── <time dateTime="P...DT...H...M...S" aria-label="...">
    │           └── 4 units (Days, Hours, Minutes, Seconds), each with 2 split crimson digit tiles
    ├── MegaDealRibbonBanner (full-width decorative campaign pill)
    │   ├── Left Navy Pill: "Up to 30,000৳ OFF"
    │   ├── Center: "11.11" + Lightning SVG + Divider + "Mega Savings Festival" / "Genuine Tech & Official Warranty"
    │   └── Right Navy Pill: "Free Delivery · 64 Districts"
    ├── 5-Column Grid: products.map → ProductCard (components/catalog/ProductCard.tsx)
    │   (or dashed empty-state card when products.length === 0)
    └── Optional Full-Width Bottom Show All CTA (rendered ONLY when showAllHref is provided — activated in Mini-Phase 7)
```

### Component Props
- **`MegaDealCountdownProps`** (`components/home/MegaDealCountdown.tsx`):
  - `targetDateIso?: string` (ISO-8601 end timestamp; falls back to `INITIAL_FALLBACK_MS` = 5d 21h 25m 09s from mount when omitted or invalid)
  - `label?: string` (default `"Ending In:"`)
- **`MegaDealSectionProps`** (`components/home/MegaDealSection.tsx`):
  - `title?: string` (default `"11.11 Mega Deal"`)
  - `subtitle?: string` (default `"Enjoy Exciting Discounts on your desired Products!"`)
  - `targetDateIso?: string`
  - `products: readonly Product[]`
  - `showAllHref?: string` (omitted in Mini-Phase 5; activates full-width blue bottom CTA in Mini-Phase 7)
  - `showAllLabel?: string` (default `"Show all"`)

---

## 3. Hydration-Safe & Accessible Countdown Design

- **Zero SSR/Client Mismatch**: `MegaDealCountdown` initializes state from a deterministic constant (`INITIAL_COUNTDOWN = { days: 5, hours: 21, minutes: 25, seconds: 9 }`) with zero `Date.now()` calls during render so SSR HTML and initial client hydration match 100%.
- **Live Client Ticking**: Inside `useEffect`, computes `targetTimestamp` from `Date.parse(targetDateIso)` (or `Date.now() + INITIAL_FALLBACK_MS`), calls `update()` immediately, ticks every `1000ms` via `window.setInterval` (clamped at `>= 0` and max `99` days), and cleans up via `window.clearInterval` on unmount.
- **No Screen-Reader Tick Spam**: Deliberately avoids `aria-live` on the 1-second timer. Wraps the counter in semantic `<time dateTime={isoDuration} aria-label={accessibleSummary}>` while marking the split visual digit boxes `aria-hidden="true"`.

---

## 4. Colors, Typography, Spacing & Tailwind Tokens

### Newly Added Tokens (`tailwind.config.ts` → `theme.extend.colors.brand`)
- `brand.countdownRed`: `#c8232c` (individual split digit tile background in `MegaDealCountdown`)
- `brand.megaRibbonFrom`: `#8c2b06` (campaign ribbon horizontal copper gradient outer stops)
- `brand.megaRibbonMid`: `#d95b12` (campaign ribbon horizontal copper gradient center stop)

### Reused Tokens & Styling
- **Outer Frame**: Reuses `.flash-sale-frame` (`#eef0ff` → `#e6eaff` lavender surface, 1.5px `#ef4a23` → `#38bdf8` → `#3749bb` gradient border, `@media (forced-colors: active)` fallback).
- **Ribbon Trim & Pills**: Dark `#2c1419` outer border frame (`ring-1 ring-amber-300/35`), inner `border-dashed border-amber-300/75`, ambient `bg-amber-300/20 blur-xl` glow, navy side pills (`border-amber-300/80 bg-[#0b2047]`).
- **Digit & Price Alignment**: `tabular-nums` on split countdown digits, ribbon `30,000৳` / `11.11` / `64 Districts`, and `ProductCard` pricing.

---

## 5. Dynamic CMS Data Flow

- **Zero Hardcoded Products**: `app/page.tsx` fetches `adapter.getFlashDeals()` and `adapter.getAllProducts()` in parallel via `Promise.all`.
- **Distinct Mega Deal Selection (`app/page.tsx`)**:
  1. Tracks `usedInFlashBands` (all IDs rendered in Flash Sale Bands 1 and 2).
  2. Constructs `megaDealPool` prioritizing:
     - remaining unused `flashDeals` not in `usedInFlashBands`,
     - then `allProducts` not in `usedInFlashBands`,
     - then `allProducts` as a final safety fallback for tiny catalogs.
  3. Deduplicates via `seenMega` and selects the first 5 unique products for Mini-Phase 5 (`<MegaDealSection products={megaDealProducts} />`).
  4. Reuses `ProductCard` directly (with auto-computed purple `Save` pill, Official Warranty shield, `tabular-nums` prices, `"Call for price"` fallback, and safe image/SVG handling).

---

## 6. Implementing Files
- `components/home/MegaDealCountdown.tsx`
- `components/home/MegaDealSection.tsx`
- `tailwind.config.ts`
- `app/page.tsx`
