# Section: Editorial SEO Closing Block & Full Dark-Navy Footer (Phase 3 — Mini-Phase 9)

**Reference Image**: `media_1795120495662_49e32ce1.jpg` (Image 9 of 9 — Final Section of Phase 3)  
**Status**: Implemented (Phase 3 Mini-Phase 9)

---

## 1. Layout & Responsive Breakpoints

| Viewport | Breakpoint | Closing Editorial Block (`EditorialSeoSection.tsx`) | Top 3-Zone Footer (`Footer.tsx`) | App/Social Strip & Copyright Row (`Footer.tsx`) |
|---|---|---|---|---|
| **Mobile** | `< 640px` (`default`) | Transparent `#f2f4f8` block under `includeClosingSection`; `<h3>` `text-base font-medium`, body `text-[13px] leading-[1.75]` | 1-column stack (`grid-cols-1 gap-10 pb-10`); `ABOUT US` renders 2-column link grid (`grid-cols-2 gap-x-6 gap-y-5`) | App & Social strip stacks centered (`flex-col items-center gap-4 border-y border-white/10 py-5`); copyright row stacks centered (`flex-col items-center gap-2 pt-5`) |
| **Small / Tablet** | `640px – 767px` (`sm`) | `<h3>` scales to `sm:text-[17px]` | `ABOUT US` expands to 3 columns (`sm:grid-cols-3`) | Copyright row splits horizontally (`sm:flex-row justify-between`) |
| **Medium / Tablet** | `768px – 1023px` (`md`) | Full-width editorial column inside `max-w-site` | 1-column zone stack with 3-col `ABOUT US` | App & Social strip splits horizontally (`md:flex-row justify-between`, badges left / 4 social icons right) |
| **Desktop** | `>= 1024px` (`lg`) | Full-width closing block directly above dark-navy footer | 12-column 3-zone grid (`lg:grid-cols-12`): `SUPPORT` (`lg:col-span-3`), `ABOUT US` (`lg:col-span-6`, 3 columns × 4 links), `STAY CONNECTED` (`lg:col-span-3`) inside `max-w-site mx-auto px-4 pb-8 pt-12` | Full-width horizontal App/Social strip + copyright bar |

---

## 2. Component Hierarchy & Structure

```text
app/page.tsx
└── EditorialSeoSection (includeMiddleSections includeClosingSection)
    └── Closing Block: <h3> "Best Price, Product, After-sales Customer Service, & Fastest Delivery"
        └── Paragraph with EditorialLink targets: offer (/category/component),
            service centers (/contact), computer home service (/contact)

app/layout.tsx
└── Footer (components/layout/Footer.tsx) [Server Component, bg-brand-navy #081621]
    ├── Top 3-Zone Grid (lg:grid-cols-12):
    │   ├── SUPPORT (lg:col-span-3, <h2>):
    │   │   ├── <a href="tel:16793"> Pill: Phone icon | 9 AM - 8 PM / 16793 (tabular-nums)
    │   │   └── <Link href="/contact"> Pill: MapPin icon | Store Locator / Find Our Stores
    │   ├── ABOUT US (lg:col-span-6, <h2> + <nav aria-label="Footer">, 3-col grid):
    │   │   ├── Col 1: Affiliate Program (/contact), Online Delivery (/terms#delivery),
    │   │   │          Refund and Return Policy (/terms#refund), Blog (/category/component)
    │   │   ├── Col 2: EMI Terms (/terms#emi), Privacy Policy (/privacy-policy),
    │   │   │          Star Point Policy (/terms#star-points), Contact Us (/contact)
    │   │   └── Col 3: About Us (/contact), Terms and Conditions (/terms),
    │   │              Career (/contact), Brands (/category/component)
    │   └── STAY CONNECTED (lg:col-span-3, <h2> + <address>):
    │       ├── Star Tech Ltd
    │       ├── Head Office: 28 Kazi Nazrul Islam Ave, Navana Zohura Square, Dhaka 1000
    │       └── Email: webteam@startechbd.com (mailto:)
    ├── Middle App & Social Strip (border-y border-white/10):
    │   ├── Left: "Experience Star Tech App on your mobile:" + Google Play & App Store badges
    │   └── Right: 4 circular social links (WhatsApp, Facebook, YouTube, Instagram)
    └── Bottom Copyright Row:
        ├── Left: "© 2026 Star Tech Ltd | All rights reserved"
        └── Right: "Powered By: Star Tech"
```

---

## 3. Colors, Typography & Accessibility

Zero new Tailwind tokens were added — reuses existing `brand.navy` (`#081621`), `brand.orange` (`#ef4a23`), and `max-w-site` (`1320px`).
- **Footer Surface & Contrast**: Deep `#081621` (`bg-brand-navy`) with crisp `text-white` headings (`text-xs font-medium uppercase tracking-[0.22em]`), `text-gray-300` link text, `text-gray-400` metadata/copyright, and `text-brand-orange` primary accents (`16793`, `Find Our Stores`, email, hover states).
- **Support Pill Cards**: `rounded-full border border-white/15 px-5 py-3 hover:border-brand-orange/70` with white `Phone`/`MapPin` Lucide icons (`aria-hidden="true"`), vertical `bg-white/15` divider, and `tabular-nums` hotline digits.
- **App Badges & Social Buttons**:
  - Store badges (`rounded-md border border-white/25 bg-white/[0.03] hover:border-brand-orange hover:bg-white/[0.06]`) link to `https://play.google.com/store` and `https://www.apple.com/app-store/` with `target="_blank" rel="noopener noreferrer"` and decorative inline SVGs (`aria-hidden="true" focusable="false"`).
  - Circular social buttons (`h-9 w-9 rounded-full bg-white/10 hover:bg-brand-orange text-white`) carry explicit `aria-label`s (`Star Tech on WhatsApp` / `Facebook` / `YouTube` / `Instagram`) and `aria-hidden="true"` SVGs.
- **Semantic Landmarks & Valid Routes**: Uses `<h2>` headings inside `<footer>`, `<nav aria-label="Footer">` around the 12-link grid, semantic `<address>` in `STAY CONNECTED`, and maps every internal link strictly to valid App Router routes (including `/privacy-policy`, `/terms`, `/contact`, and `/category/component`) with zero 404s and zero hardcoded products.

---

## 4. Implementing Files
- `components/home/EditorialSeoSection.tsx`
- `components/layout/Footer.tsx`
- `app/page.tsx`
