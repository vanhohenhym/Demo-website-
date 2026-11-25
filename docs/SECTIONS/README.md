# Uploaded Design Sections

In Phase 3, each uploaded design image is implemented as an individual mini-phase.
For each design section, a corresponding document `docs/SECTIONS/<name>.md` is created specifying:
- Layout and responsive breakpoints (mobile, tablet, desktop)
- Component hierarchy and reusable components
- Colors, typography, spacing tokens
- Implementing file paths

## Section Catalog (Phase 3 — 9 Mini-Phases)

| Mini-Phase | Status | Document | Reference Image Path | Contents & Implementation Rules |
|---|---|---|---|---|
| **1** | **Implemented** | `docs/SECTIONS/hero-header.md` | `C:/Users/shahr/.gemini/antigravity/brain/b16ca343-1ea8-444a-92f8-959eb6c1307e/.user_uploaded/media_1795120370174_77b5bc7c.jpg` | Top dark navy header (`#081621`), white 18-category nav, 5-slide hero carousel + 2 right promo cards, announcement marquee pill, 4 quick-service cards, bottom-right Compare/Cart dock. |
| **2** | **Implemented** | `docs/SECTIONS/featured-categories-stores.md` | `C:/Users/shahr/.gemini/antigravity/brain/b16ca343-1ea8-444a-92f8-959eb6c1307e/.user_uploaded/media_1795120387077_0b7ecb88.jpg` | Featured Category 16-tile monochrome outline SVG icon grid (8×2 desktop) + `20+ Physical Stores` cyan-to-royal-blue gradient banner with gold pill CTA. |
| **3** | **Implemented** | `docs/SECTIONS/flash-sale-rows.md` | `C:/Users/shahr/.gemini/antigravity/brain/b16ca343-1ea8-444a-92f8-959eb6c1307e/.user_uploaded/media_1795120409280_5b418f66.jpg` | 11.11 Flash Sale rounded pastel-lavender/gradient-bordered card sections (left promo poster + 4-col reusable `ProductCard` row with purple `Save` badge, warranty tag, red/orange price, strikethrough regular price, `Show All` button) — **pulls dynamically from `getCmsAdapter()`, ZERO hardcoded products.** |
| **4** | **Implemented** | `docs/SECTIONS/flash-sale-secondary.md` | `C:/Users/shahr/.gemini/antigravity/brain/b16ca343-1ea8-444a-92f8-959eb6c1307e/.user_uploaded/media_1795120423357_6b9d1bcc.jpg` | Secondary 11.11 Flash Sale band reusing the Mini-Phase 3 `FlashSaleSection` (`posterVariant="orange"`) + `ProductCard` components with non-overlapping live CMS deals. |
| **5** | **Implemented** | `docs/SECTIONS/mega-deal-header.md` | `C:/Users/shahr/.gemini/antigravity/brain/b16ca343-1ea8-444a-92f8-959eb6c1307e/.user_uploaded/media_1795120435387_33cda144.jpg` | `11.11 Mega Deal` container with hydration-safe live countdown timer (`Days / Hours / Minutes / Seconds` split crimson digit boxes), full-width campaign ribbon banner, and 5-column CMS-driven `ProductCard` grid. |
| **6** | **Implemented** | `docs/SECTIONS/mega-deal-grid.md` | `C:/Users/shahr/.gemini/antigravity/brain/b16ca343-1ea8-444a-92f8-959eb6c1307e/.user_uploaded/media_1795120453217_f5a71bd3.jpg` | Mega Deal 3×5 multi-row product grid (15 distinct live CMS items) with `Save` & `Gift` purple badges, `"FREE GIFT"` blue gradient strip, bottom-aligned price baselines, and `"Call for price"` handling for absent-price CMS products. |
| **7** | **Implemented** | `docs/SECTIONS/mega-deal-cta-editorial-intro.md` | `C:/Users/shahr/.gemini/antigravity/brain/b16ca343-1ea8-444a-92f8-959eb6c1307e/.user_uploaded/media_1795120467802_2da63530.jpg` | Full-width blue `Show all` CTA button closing Mega Deal (`/category/component`) + transparent `#f2f4f8` `EditorialSeoSection` intro blocks (`h2`/`h3`) with high-contrast underlined orange-red internal category/brand/PC Builder links. |
| **8** | **Implemented** | `docs/SECTIONS/editorial-seo-body.md` | `C:/Users/shahr/.gemini/antigravity/brain/b16ca343-1ea8-444a-92f8-959eb6c1307e/.user_uploaded/media_1795120483819_c9c52ce1.jpg` | Editorial SEO content middle sections (Office Equipment, Gadget, Mobile, Home Appliance, Lifestyle & Healthcare, Trusted E-Commerce) enabled via `includeMiddleSections` with clean semantic `h2`/`h3` hierarchy and WCAG AA internal category/brand links. |
| **9** | **Implemented** | `docs/SECTIONS/footer-full.md` | `C:/Users/shahr/.gemini/antigravity/brain/b16ca343-1ea8-444a-92f8-959eb6c1307e/.user_uploaded/media_1795120495662_49e32ce1.jpg` | Editorial SEO closing section (`includeClosingSection`) + full dark navy (`#081621`) Footer matching Image 9 (Support bordered pill cards `16793` & `Find Our Stores`, 3-column `ABOUT US` 12 links, `STAY CONNECTED`, mobile app download badges `Google Play` / `App Store`, circular social buttons WhatsApp/Facebook/YouTube/Instagram, copyright bar) — **all 9 of 9 Phase 3 sections implemented.** |

---

## Design Continuity Rules

Every upcoming Mini-Phase (Images 3–9) MUST reuse the established design tokens documented in `docs/PROJECT.md` and `tailwind.config.ts` so visual continuity across the entire homepage stays seamless:
- **Core Palette**: Header/Footer Navy `#081621` (`brand-navy`), Primary Orange/Red `#ef4a23` (`brand-orange`), Primary CTA Blue `#3749bb` (`brand-blue`), Page Surface `#f2f4f8` (`brand-grayBg`), Card Surface `#ffffff` (`brand-card`), Border `#e5e7eb` (`brand-border`), Text `#111827` (`brand-textMain`) / `#6b7280` (`brand-textMuted`).
- **Layout & Elevation**: `max-w-site` (`1320px`) centered container, `shadow-card` / `shadow-cardHover`, `rounded-card` (`6px`) / `rounded-xl` for major band containers, and `tabular-nums` for prices and countdown counters.
- **Data Rule**: Zero hardcoded products in `app/` or `components/`; every product card and deal row pulls dynamically from `getCmsAdapter()` (`lib/cms/index.ts`).
