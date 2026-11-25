# Section: Mega Deal Multi-Row Product Grid, Gift Badges & Price Fallbacks (Phase 3 — Mini-Phase 6)

**Reference Image**: `media_1795120453217_f5a71bd3.jpg` (Image 6 of 9)  
**Status**: Implemented (Phase 3 Mini-Phase 6)

---

## 1. Layout & Responsive Breakpoints

Extends `MegaDealSection` (`components/home/MegaDealSection.tsx`) and `ProductCard` (`components/catalog/ProductCard.tsx`) into a dense 3-row × 5-column e-commerce product matrix inside the `.flash-sale-frame` container (with `showAllHref` still omitted until Mini-Phase 7):

| Viewport | Breakpoint | Grid Columns & Spacing (`MegaDealSection.tsx`) | Row Count (15 Items) & Card Rhythm (`ProductCard.tsx`) |
|---|---|---|---|
| **Mobile** | `< 640px` (`default`) | `grid-cols-1 items-stretch gap-3 gap-y-3.5` | 15 stacked full-width cards; `h-44` image frame, `mt-auto pt-3` price row |
| **Small / Tablet** | `640px – 767px` (`sm`) | `sm:grid-cols-2 sm:gap-3.5 sm:gap-y-4` | 8 rows (7 full rows + 1 card); `sm:h-48` image frame |
| **Medium / Tablet** | `768px – 1023px` (`md`) | `md:grid-cols-3` | 5 full rows of 3 equal-height cards |
| **Desktop** | `>= 1024px` (`lg`) | `lg:grid-cols-5` inside `max-w-site` (`1320px`) | 3 crisp full rows of 5 equal-height (`h-full`) cards with uniform image frames and bottom-aligned price baselines (`mt-auto space-y-2.5 pt-3`) |

---

## 2. `Save` / `Gift` Badge Precedence & `"FREE GIFT"` Ribbon (`ProductCard.tsx`)

### Updated Props Contract (`ProductCardProps`)
- `product: Product`
- `priority?: boolean` (default `false`)
- `badgeLabel?: string`
- `giftLabel?: string` *(new in Mini-Phase 6 — backwards-compatible)*
- `builderMode?: boolean` (default `false`)
- `slot?: string`

### Automatic Gift Detection (`resolveGiftText`)
1. Explicit `giftLabel` prop (trimmed, if non-empty)
2. `product.attributes.freeGift?.value` (when a non-empty string)
3. `product.unmappedAttributes?.gift` or `product.unmappedAttributes?.free_gift` (when a non-empty string)

### Top-Left Purple Pill Precedence (`bg-brand-badgePurple` `#6e2594`)
1. Explicit `badgeLabel` override (trimmed)
2. Auto-computed discount savings `Save: X৳ (-Y%)` (when `price` and `salePrice` are finite numbers with `salePrice < price` and `price > 0`)
3. Formatted gift badge `Gift: <giftText>` (`formatGiftBadge` avoids doubling an existing `Gift:` prefix)
4. Omitted cleanly when none apply

Styled with `max-w-[calc(100%-0.75rem)] truncate rounded-r-full bg-brand-badgePurple px-2.5 py-0.5 text-[11px] font-semibold leading-tight text-white shadow-sm tabular-nums`.

### Bottom-Left `"FREE GIFT"` Blue Gradient Strip (`FreeGiftRibbon`)
- Rendered at `bottom-2 left-2 z-10` whenever `resolvedGift` is non-null.
- Reuses `bg-gradient-to-r from-brand-blue to-brand-sky text-white` (zero new Tailwind tokens).
- Includes decorative gift-box inline SVG (`aria-hidden="true"` `focusable="false"`), uppercase `FREE GIFT` label, and truncated `giftText`.
- Uses dynamic horizontal clearance (`max-w-[calc(100%-6.25rem)]` when `OfficialWarrantyBadge` is also present, else `max-w-[calc(100%-1rem)]`) so the strip and warranty shield never overlap.

---

## 3. Price Safety & Baseline Alignment

- Validates `hasValidPrice = product.price != null && Number.isFinite(product.price)` and `Number.isFinite(product.salePrice)` before formatting.
- **Absent / Invalid Price (`!hasValidPrice`)**: Renders `"Call for price"` in `text-sm font-bold text-brand-orange` — never renders `NaN`, `undefined`, or `0৳`.
- **Discounted Price**: Renders effective `salePrice` (`text-[15px] font-bold text-brand-orange`) + `<del>` regular `price` (`text-xs font-medium text-brand-textMuted` with `<span className="sr-only">Regular price: </span>`).
- **Standard Price**: Renders a single `text-[15px] font-bold text-brand-orange` price with no empty strikethrough slot.
- **Multi-Row Alignment**: `div.flex.flex-1.flex-col` + `div.mt-auto.space-y-2.5.pt-3` pins every card's price row to the bottom baseline regardless of 1-line vs 2-line titles.

---

## 4. Dynamic 15-Item Non-Overlapping CMS Selection (`app/page.tsx`)

- **Zero Hardcoded Products**: Fetches `adapter.getFlashDeals()` and `adapter.getAllProducts()` in parallel via `getCmsAdapter()`.
- **Deduplication Across Homepage Bands**:
  - `usedInFlashBands` excludes all 8 product IDs displayed in Flash Sale Band 1 (4) and Band 2 (4).
  - `unusedMegaPool` prioritizes remaining unused `flashDeals`, followed by remaining `allProducts` (falling back to `allProducts` only if `unusedMegaPool.length === 0`).
  - Selects up to **15** unique items (`seenMega`), yielding 23 distinct live CMS items across Band 1 (4) + Band 2 (4) + Mega Deal (15) with **0 overlap** (gracefully handling smaller or larger external CMS catalogs).
  - Naturally exercises discounted deals, standard-priced items, and absent-price `"Call for price"` items straight from live CMS data.
- **Mini-Phase 7 Boundary**: `<MegaDealSection products={megaDealProducts} />` continues to omit `showAllHref` so the bottom `Show all` CTA stays inactive until Mini-Phase 7.

---

## 5. Implementing Files
- `components/catalog/ProductCard.tsx`
- `components/home/MegaDealSection.tsx`
- `app/page.tsx`
