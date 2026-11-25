# Section: Editorial SEO Body Sections (Phase 3 — Mini-Phase 8)

**Reference Image**: `media_1795120483819_c9c52ce1.jpg` (Image 8 of 9)  
**Status**: Implemented (Phase 3 Mini-Phase 8)

---

## 1. Layout & Responsive Behavior

Extends `EditorialSeoSection` (`components/home/EditorialSeoSection.tsx`) seamlessly on the transparent `#f2f4f8` (`brand-grayBg`) canvas via `includeMiddleSections` (activated in `app/page.tsx` with `<EditorialSeoSection includeMiddleSections />`; `includeClosingSection` remains `false` / reserved for Mini-Phase 9):

| Viewport | Breakpoint | Container & Typography | Subsection Headings (`<h3>`) |
|---|---|---|---|
| **Mobile** | `< 640px` (`default`) | Full-width readable blocks inside `max-w-site` (`space-y-6 pb-4 pt-2 text-[13px] leading-[1.75] text-[#1f2937]`) | `mb-2 text-base font-medium text-brand-textMain` |
| **Tablet / Desktop** | `>= 640px` (`sm` / `md` / `lg`) | Seamless continuation directly below the 3 Mini-Phase 7 intro blocks on `#f2f4f8` | `sm:text-[17px]` |

---

## 2. Middle `<h3>` Sections & Internal Link Inventory

All 6 middle blocks sit inside `<section aria-labelledby="editorial-seo-heading">` directly under the Mini-Phase 7 `<h2>` (`Leading Computer, Laptop & Electronics Retail & Online Shop in Bangladesh`), preserving strict `h1` → `h2` → `h3` hierarchy with zero skipped heading levels and zero hardcoded products:

| # | `<h3>` Heading | Internal `<EditorialLink>` Targets (all valid App Router routes) |
|---|---|---|
| 1 | `Best Office Equipment Shop in Bangladesh` | `Cameras` (`/category/camera`), `Printers` (`/category/office-equipment`), `Routers` (`/category/networking`) |
| 2 | `Largest Gadget Shop In Bangladesh` | `gadgets` (`/category/gadget`), `Smart Watch` (`/category/gadget`), `Earbuds` (`/category/accessories`), `Power Bank` (`/category/power`), `DSLR Camera` (`/category/camera`), `Gimbals` (`/category/camera`) |
| 3 | `Top Mobile Shop in Bangladesh` | `mobile phone` / `feature phones` / `mobile` (`/category/phone`), `Samsung` (`/category/phone/samsung`), `Vivo` (`/category/phone/vivo`), `Xiaomi Redmi` (`/category/phone/xiaomi`), `OPPO` (`/category/phone/oppo`), `OnePlus` (`/category/phone/oneplus`), `iPhones` (`/category/phone/apple`), `iPads` (`/category/tablet/apple`), `mobile phone accessories` (`/category/accessories`) |
| 4 | `Best Home Appliance Shop in Bangladesh` | `smart TVs`, `air conditioners`, `washing machines`, `geysers`, `sewing machines`, `electric room heaters`, `ovens`, `air fryers`, `blenders & grinders`, `induction cookers`, `AC Ton Calculator` (`/category/appliance`); `Walton` (`/category/appliance/walton`) |
| 5 | `Best Lifestyle & Healthcare Products Shop in Bangladesh` | `lifestyle products`, `Blood Pressure Monitors`, `Massagers`, `Trimmers` (`/category/lifestyle`) |
| 6 | `Trusted Online Shopping From Bangladesh at The Best E-Commerce Website` | `E-Commerce` (`/`), `gaming` (`/category/gaming`), `PC Builder` (`/pc-builder`) |

---

## 3. Accessibility & Visual Continuity

- **Inline Link Treatment**: Reuses `EditorialLink` (`text-[#c83712] underline decoration-[#c83712]/55 underline-offset-2 transition-colors hover:text-brand-orange hover:decoration-brand-orange focus-visible:rounded-sm`), achieving ~4.80:1 WCAG AA contrast on `#f2f4f8` and visible underline affordance (WCAG 1.4.1 — never relying on color alone).
- **Mini-Phase 9 Boundary**: `includeClosingSection` stays `false` (`void includeClosingSection;`) and `components/layout/Footer.tsx` remains untouched until Mini-Phase 9.
- **Zero New Tailwind Tokens**: Reuses existing `brand-textMain` (`#111827`), `brand-orange` (`#ef4a23`), and `brand-grayBg` (`#f2f4f8`).

---

## 4. Implementing Files
- `components/home/EditorialSeoSection.tsx`
- `app/page.tsx`
