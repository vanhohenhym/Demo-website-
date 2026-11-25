# Section: Hero & Header (Phase 3 — Mini-Phase 1)

**Reference Image**: `media_1795120370174_77b5bc7c.jpg` (Image 1 of 9)  
**Status**: Implemented (Phase 3 Mini-Phase 1)

---

## 1. Layout & Responsive Breakpoints

| Viewport | Breakpoint | Header & Category Nav | Hero Grid | Announcement Bar | Quick Service Cards | Floating Actions Dock |
|---|---|---|---|---|---|---|
| **Mobile** | `< 640px` (`default`) | Single dark navy top bar with mobile menu button (`popover="auto"` drawer `#mobile-nav-drawer`), Star Tech SVG lockup, compact PC Builder CTA, and full-width `<search>` bar; white 18-category bar scrolls horizontally (`overflow-x-auto no-scrollbar`) | Stacked single column: 5-slide carousel on top, 2 promo cards below | Full-width white pill ticker with Pause/Play button | 1-column vertical stack (`grid-cols-1 gap-4`) | Fixed bottom-right (`right-3 bottom-4`), stacked `58×58px` `COMPARE` & `CART` tiles |
| **Tablet** | `640px – 1023px` (`sm` / `md`) | Search bar widens in top row; right utility links progressively surface; category bar remains single-row scrollable | Carousel on top; 2 promo cards in balanced 2-column row below | Full-width white pill ticker | 2-column grid (`sm:grid-cols-2 gap-4`) | Fixed bottom-right (`sm:right-4 sm:bottom-5`) |
| **Desktop** | `>= 1024px` (`lg` / `xl`) | Max-width `1320px` (`max-w-site`): Logo left, centered white rounded search bar, right utility group (`Offers`, `11.11`, `Account`, gradient `PC Builder` CTA); full-width `#ffffff` horizontal bar with all 18 categories | 2-column asymmetric grid (`lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_340px]`): main 5-slide carousel left, 2 stacked promo cards right | Full-width white pill ticker (`rounded-full shadow-card`) | 4-column horizontal grid (`lg:grid-cols-4 lg:gap-5`) | Fixed bottom-right (`z-40 no-print`) |

---

## 2. Component Hierarchy

```text
app/layout.tsx
├── Header (components/layout/Header.tsx) [Server Component]
│   ├── Dark Navy Top Bar (#081621)
│   │   ├── StarTechLogo (inline SVG orbital lockup)
│   │   ├── <search> / <form> (id="site-search", type="search", sr-only <label>)
│   │   ├── Utility Links: Offers, 11.11, Account + gradient PC Builder CTA
│   │   └── Native Popover Mobile Drawer (#mobile-nav-drawer, popover="auto")
│   └── White Category Bar (#ffffff) — 18 categories linking to /category/[slug]
├── <main id="main-content"> → app/page.tsx
│   ├── <h1 className="sr-only"> (single H1 on page)
│   ├── HeroSection (components/home/HeroSection.tsx) [Client Component]
│   │   ├── Main 5-Slide Scroll-Snap Carousel (Slide 1: City IT Mega Fair 2026 inline SVG art; Slides 2–5: promo slides; prev/next, pause/play, 5 dash indicators, polite live status)
│   │   └── Right Promo Stack
│   │       ├── Top Card: Customer Feedback / Opinion & Complain CTA (/contact)
│   │       └── Bottom Card: Laptop Mela Promo Card (/category/laptop)
│   ├── AnnouncementBar (components/home/AnnouncementBar.tsx) [Client Component]
│   │   └── Pill marquee ticker with hover/focus pause, Pause/Play button, reduced-motion static fallback
│   └── QuickServiceBar (components/home/QuickServiceBar.tsx) [Server Component]
│       └── 4 cards: Laptop Finder, Raise a Complain, AC Ton Calculator, Servicing Center
└── FloatingActions (components/layout/FloatingActions.tsx) [Client Component]
    └── Stacked COMPARE (localStorage pc_compare_items badge) + CART tiles
```

---

## 3. Colors, Typography, Spacing & Tailwind Tokens

### Colors (`tailwind.config.ts`)
- **Header & Dock**: `brand.navy` (`#081621`), `brand.navydark` (`#050d14`)
- **Primary Accents & CTAs**: `brand.orange` (`#ef4a23`), `brand.orangeHover` (`#d93c16`), `brand.blue` (`#3749bb`), `brand.blueDark` (`#244b7d`), `brand.blueDeep` (`#00237e`), `brand.sky` (`#0ea5e9`), `brand.amber` (`#f59e0b`), `brand.amberWarm` (`#fb923c`)
- **Hero Expo & Promo Gradients**: `brand.expoDeep` (`#0c1258`), `brand.expoMid` (`#181f7a`), `brand.promoBlueFrom` (`#0044b3`), `brand.promoBlueTo` (`#002060`), `brand.promoRedFrom` (`#f05118`), `brand.promoRedTo` (`#c81e1e`)
- **Surfaces & Text**: `brand.grayBg` (`#f2f4f8`), `brand.card` (`#ffffff`), `brand.border` (`#e5e7eb`), `brand.textMain` (`#111827`), `brand.textMuted` (`#6b7280`)

### Typography, Radii & Shadows
- **Font Family**: `fontFamily.sans` (`var(--font-sans), "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif`); tabular numbers (`tabular-nums`) on counter badges.
- **Radii**: `rounded-card` (`6px`), `rounded-control` (`4px`), `rounded-full` (announcement pill, icon badges, CTA pills).
- **Shadows**: `shadow-card` (`0 1px 4px rgba(8, 22, 33, 0.06)`), `shadow-cardHover` (`0 6px 18px rgba(8, 22, 33, 0.1)`), `shadow-nav` (`0 2px 6px rgba(8, 22, 33, 0.06)`), `shadow-dock` (`0 6px 20px rgba(8, 22, 33, 0.35)`).
- **Container & Spacing**: `max-w-site` (`1320px`), `space-y-5` between Hero, AnnouncementBar, and QuickServiceBar; `gap-4 lg:gap-5` on QuickServiceBar grid.

---

## 4. Accessibility & Modern Web Platform Notes
- **Carousel**: CSS scroll-snap track with `overscroll-behavior-x: contain` (prevents trapping vertical page scroll), DOM-ordered controls, `scrollend` + debounced `scroll` sync, and width+outline+color active indicator states (`>= 24×24px` tap targets).
- **Motion Safety**: Smooth carousel scroll and marquee animation activate only under `@media (prefers-reduced-motion: no-preference)`; visible keyboard-operable Pause/Play buttons use dynamic `aria-label` without `aria-pressed`.
- **Mobile Drawer**: Native `popover="auto"` immediately following its `popoverTarget` trigger, with unconditional `inset-block-start: 4rem` fallback before `anchor()` and `transition-behavior: allow-discrete`.
- **Zero Hardcoded Products**: All banners and cards are promotional/navigation UI with zero hardcoded catalog products.

---

## 5. Implementing Files
- `tailwind.config.ts`
- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `components/layout/Header.tsx`
- `components/layout/FloatingActions.tsx`
- `components/home/HeroSection.tsx`
- `components/home/AnnouncementBar.tsx`
- `components/home/QuickServiceBar.tsx`
