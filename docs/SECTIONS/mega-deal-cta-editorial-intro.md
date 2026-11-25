# Section: Mega Deal Full-Width CTA & Editorial SEO Intro (Phase 3 — Mini-Phase 7)

**Reference Image**: `media_1795120467802_2da63530.jpg` (Image 7 of 9)  
**Status**: Implemented (Phase 3 Mini-Phase 7)

---

## 1. Layout & Responsive Breakpoints

| Viewport | Breakpoint | `MegaDealSection` Bottom CTA | `EditorialSeoSection` Intro Blocks |
|---|---|---|---|
| **Mobile** | `< 640px` (`default`) | Full-width solid blue `Show all` button (`mt-5`, `w-full rounded-control bg-brand-blue px-5 py-2.5 text-xs font-semibold text-white`) closing the `.flash-sale-frame` container | Transparent `#f2f4f8` (`brand-grayBg`) canvas (no white card wrapper/border), `space-y-6 pb-4 pt-2 text-[13px] leading-[1.75] text-[#1f2937]`; `<h2>` `text-xl font-normal`, `<h3>` `text-base font-medium` |
| **Tablet / Desktop** | `>= 640px` (`sm` / `md` / `lg`) | `sm:text-sm` full-width `Show all` button spanning across the `.flash-sale-frame` container inside `max-w-site` (`1320px`) | `<h2>` scales to `sm:text-[22px] sm:font-medium`; `<h3>` scales to `sm:text-[17px]`; fluid full-width readable editorial columns on `#f2f4f8` |

---

## 2. Component Hierarchy & Contracts

```text
app/page.tsx [Async Server Component, revalidate = 3600]
├── MegaDealSection (components/home/MegaDealSection.tsx)
│   ├── Header Row + MegaDealCountdown
│   ├── MegaDealRibbonBanner
│   ├── 3×5 Live CMS ProductCard Grid (15 items)
│   └── Bottom CTA: <Link href="/category/component"> "Show all" (activated via showAllHref + showAllLabel)
└── EditorialSeoSection (components/home/EditorialSeoSection.tsx) [Server Component]
    └── <section aria-labelledby="editorial-seo-heading">
        ├── Block 1: <h2 id="editorial-seo-heading"> "Leading Computer, Laptop & Electronics Retail & Online Shop in Bangladesh"
        │   └── Intro paragraph (Star Tech Ltd. link + 5 <strong> highlights)
        ├── Block 2: <h3> "Best Laptop Shop in Bangladesh"
        │   └── Laptop category & brand internal links
        └── Block 3: <h3> "Best Desktop PC Shop In Bangladesh"
            └── Desktop, Apple desktop, PC Builder & component internal links
```

### Component Props
- **`EditorialSeoSectionProps`** (`components/home/EditorialSeoSection.tsx`):
  - `includeMiddleSections?: boolean` (default `false` — reserved for Mini-Phase 8)
  - `includeClosingSection?: boolean` (default `false` — reserved for Mini-Phase 9)
- **`MegaDealSection`** (`app/page.tsx` invocation):
  - `showAllHref="/category/component"`
  - `showAllLabel="Show all"`

---

## 3. Semantic Heading Hierarchy & Internal Cross-Links

- **Strict Heading Order**: Preserves exactly ONE `<h1>` (`sr-only`) in `app/page.tsx`, followed by `<h2 id="editorial-seo-heading">` for the editorial section title and `<h3>` for the two subsections — zero skipped heading levels.
- **Internal Link Inventory (all valid App Router routes; zero hardcoded products)**:
  - **Mega Deal CTA**: `Show all` → `/category/component`
  - **Block 1 (Intro)**: `Star Tech Ltd.` → `/contact`
  - **Block 2 (Laptop)**: `Laptop Brand Shop in BD` / `Laptop Shop` → `/category/laptop`, `Gaming Laptops` → `/category/gaming`, `Apple Store in Bangladesh` / `Apple MacBook` → `/category/laptop/apple`, `HP` → `/category/laptop/hp`, `Asus` → `/category/laptop/asus`, `Acer` → `/category/laptop/acer`, `Lenovo` → `/category/laptop/lenovo`, `Microsoft Surface` → `/category/laptop/microsoft`, `Walton` → `/category/laptop/walton`
  - **Block 3 (Desktop PC)**: `Star Tech` → `/`, `Desktop PCs` / `Brand PC` / `Portable Mini PC` → `/category/desktop`, `Apple iMac` / `Apple Mac Mini` → `/category/desktop/apple`, `PC Builder` → `/pc-builder`, `pick PC parts` → `/category/component`

---

## 4. Colors, Typography & WCAG Accessibility

Zero new Tailwind tokens were added — reuses existing `brand.blue` (`#3749bb`), `brand.blueDark` (`#244b7d`), `brand.orange` (`#ef4a23`), `brand.textMain` (`#111827`), `brand.grayBg` (`#f2f4f8`), and `rounded-control`.
- **Body Text**: `#1f2937` on `#f2f4f8` canvas (`text-[13px] leading-[1.75]`).
- **Inline Links (`EditorialLink`)**: `text-[#c83712] underline decoration-[#c83712]/55 underline-offset-2 transition-colors hover:text-brand-orange hover:decoration-brand-orange focus-visible:rounded-sm` — provides ~4.80:1 WCAG AA contrast on `#f2f4f8` plus visible underlines so link identification never relies on color alone (WCAG 1.4.1), alongside global `:focus-visible` focus rings.

---

## 5. Implementing Files
- `components/home/EditorialSeoSection.tsx`
- `components/home/MegaDealSection.tsx`
- `app/page.tsx`
