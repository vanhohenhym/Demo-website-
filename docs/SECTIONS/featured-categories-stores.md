# Section: Featured Categories & Store Locator Banner (Phase 3 — Mini-Phase 2)

**Reference Image**: `media_1795120387077_0b7ecb88.jpg` (Image 2 of 9)  
**Status**: Implemented (Phase 3 Mini-Phase 2)

---

## 1. Layout & Responsive Breakpoints

| Viewport | Breakpoint | `FeaturedCategories` Grid | `StoreLocatorBanner` |
|---|---|---|---|
| **Mobile** | `< 640px` (`default`) | 2-column equal-height card grid (`grid-cols-2 gap-3`), `min-h-[124px]` tiles with centered 44×44px outline SVG icon + label | Full-width `rounded-xl` horizontal gradient banner stacked vertically (`flex-col items-start gap-5 px-6 py-6`), white map-pin + heading/subtitle on top, gold pill CTA below |
| **Tablet** | `640px – 1023px` (`sm` / `md`) | 4-column equal-height card grid (`sm:grid-cols-4 sm:gap-3.5`), `sm:min-h-[132px]` | Horizontal split layout (`sm:flex-row sm:items-center sm:justify-between sm:px-9 sm:py-7`) |
| **Desktop** | `>= 1024px` (`lg`) | 8-column × 2-row equal-height card grid (`lg:grid-cols-8 gap-3 sm:gap-3.5`) inside `max-w-site` (`1320px`) container | Full-width `rounded-xl` cyan-to-royal-blue banner (`px-9 py-7`), white map-pin + text left, gold `Find Our Store` pill right |

---

## 2. Component Hierarchy

```text
app/page.tsx
└── Mini-Phase 2 Wrapper (space-y-8)
    ├── FeaturedCategories (components/home/FeaturedCategories.tsx) [Server Component]
    │   ├── Centered Header: <h2> "Featured Category" + subtitle "Get Your Desired Product from Featured Category!"
    │   └── <ul role="list"> (16 equal-height white tiles, 2 rows × 8 cols on desktop)
    │       ├── Row 1: AC (/category/appliance), Portable Power Station (/category/power),
    │       │          Air Fryer (/category/appliance), Drone (/category/gadget),
    │       │          Gimbal (/category/camera), Tablet PC (/category/tablet),
    │       │          TV (/category/appliance), Fridge (/category/appliance)
    │       └── Row 2: Mobile Phone (/category/phone), Mobile Accessories (/category/accessories),
    │                  Blood Pressure Monitor (/category/lifestyle), WiFi Camera (/category/security),
    │                  Trimmer (/category/lifestyle), Smart Watch (/category/gadget),
    │                  Earbuds (/category/accessories), Torch Light (/category/lifestyle)
    └── StoreLocatorBanner (components/home/StoreLocatorBanner.tsx) [Server Component]
        ├── Left: White Map-Pin SVG + <h2> "20+ Physical Stores" + subtitle
        └── Right: Warm Gold Pill CTA "Find Our Store" + Search icon (/contact)
```

---

## 3. Colors, Typography, Spacing & Tailwind Tokens

### Newly Added Tokens (`tailwind.config.ts` → `theme.extend.colors.brand`)
- `brand.storeCyan`: `#00b4db` (banner left gradient start)
- `brand.storeBlue`: `#0d52bd` (banner center gradient via)
- `brand.storeNavy`: `#002077` (banner right gradient end)
- `brand.storeGold`: `#f5a623` (pill CTA background)
- `brand.storeGoldHover`: `#e09316` (pill CTA hover background)

### Reused Tokens & Styling
- **Tile Surface & Shadows**: `bg-white rounded-xl shadow-card hover:shadow-cardHover` on `#f2f4f8` (`brand.grayBg`) page surface.
- **Icons**: 16 custom 48×48 viewBox (`h-11 w-11`) monochrome line-art SVGs (`stroke="currentColor"`, `strokeWidth={1.5}`), transitioning from `brand.textMain` (`#111827`) to `brand.orange` (`#ef4a23`) on hover.
- **Typography**: `text-xl sm:text-2xl font-bold` section & banner headings; crisp dark navy (`#081621`) bold CTA text on `#f5a623` gold pill for high contrast.

---

## 4. Accessibility & Modern Web Platform Notes
- **Inline Decorative Icons**: All 16 category SVGs and the banner map-pin SVG use `aria-hidden="true"` and `focusable="false"` inside named `<Link>` controls so screen readers announce only the label.
- **Safari Grid List Semantics**: `<ul role="list">` restores list item count announcements in Safari/VoiceOver when CSS Grid + Tailwind Preflight `list-style: none` are active.
- **Zero Hardcoded Products**: Pure category navigation and store-locator CTA; zero hardcoded product items.

---

## 5. Implementing Files
- `components/home/FeaturedCategories.tsx`
- `components/home/StoreLocatorBanner.tsx`
- `tailwind.config.ts`
- `app/page.tsx`
