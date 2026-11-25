# Project Overview

## 1. Goals
Build a complete, production-ready, CMS-agnostic computer and electronics e-commerce DEMO website.
- Clean Next.js App Router architecture with strict TypeScript and Tailwind CSS.
- CMS-agnostic: Products are fetched from an external CMS (WooCommerce, headless CMS, or custom REST API) or local mock data for the demo. No local product database or admin upload.
- Advanced attribute normalization and brand resolution to handle messy, inconsistent real-world catalog data.
- Interactive PC Builder with full compatibility rules and graceful handling of missing data.
- Built-in data health auditing tool (`/data-health` and `npm run data:audit`).
- Complete SEO optimization: SSR/ISR, dynamic OpenGraph, JSON-LD schemas, robots.txt, sitemap.xml, canonical tags.

## 2. Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Validation**: Zod
- **Testing**: Node 24 native test runner (`node:test` + `node:assert`)
- **Image Optimization**: `next/image` with remote patterns configured

## 3. Design Tokens & Visual Reference (Star Tech Inspired)
Visual and catalog demo reference: [Star Tech Bangladesh](https://www.startech.com.bd/) (used for visual layout structure, category hierarchy, and token inspiration alongside uploaded section mockups; implemented in `tailwind.config.ts`):

### Colors (`theme.extend.colors.brand`)
- **Header & Dock Navy**: `brand.navy` `#081621`, `brand.navydark` `#050d14`
- **Primary Brand Orange/Red**: `brand.orange` `#ef4a23`, `brand.orangeHover` `#d93c16`
- **Primary Blue & Accent Blues**: `brand.blue` `#3749bb`, `brand.blueDark` `#244b7d`, `brand.blueDeep` `#00237e`, `brand.sky` `#0ea5e9`
- **Warm Highlight Ambers**: `brand.amber` `#f59e0b`, `brand.amberWarm` `#fb923c`
- **Hero Expo & Promo Gradients**: `brand.expoDeep` `#0c1258`, `brand.expoMid` `#181f7a`, `brand.promoBlueFrom` `#0044b3`, `brand.promoBlueTo` `#002060`, `brand.promoRedFrom` `#f05118`, `brand.promoRedTo` `#c81e1e`
- **Store Locator Banner**: `brand.storeCyan` `#00b4db`, `brand.storeBlue` `#0d52bd`, `brand.storeNavy` `#002077`, `brand.storeGold` `#f5a623`, `brand.storeGoldHover` `#e09316`
- **Flash Sale & Product Badges**: `brand.badgePurple` `#6e2594`, `brand.flashBg` `#eef0ff`, `brand.flashBgEnd` `#e6eaff`, `brand.flashPosterBlueFrom` `#061b44`, `brand.flashPosterBlueTo` `#0b3582`, `brand.flashPosterOrangeFrom` `#c62808`, `brand.flashPosterOrangeTo` `#f26419`
- **Mega Deal Countdown & Ribbon**: `brand.countdownRed` `#c8232c`, `brand.megaRibbonFrom` `#8c2b06`, `brand.megaRibbonMid` `#d95b12`
- **Surfaces & Borders**: `brand.grayBg` `#f2f4f8`, `brand.card` `#ffffff`, `brand.border` `#e5e7eb`
- **Text**: `brand.textMain` `#111827`, `brand.textMuted` `#6b7280`
- **Semantic Badges**: Emerald (`#10b981` / Tailwind emerald scale) for In Stock & Healthy, Amber for Warning, Rose/Red (`#ef4a23`) for Critical & Sale tags

### Typography (`theme.extend.fontFamily`)
- `fontFamily.sans`: `var(--font-sans), "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
- Clear tabular numbers (`tabular-nums`) for prices, counter badges, and specification matrices

### Radii, Shadows & Layout (`tailwind.config.ts`)
- **Container max-width**: `max-w-site` (`1320px`)
- **Border Radius**: `rounded-card` (`6px`), `rounded-control` (`4px`)
- **Box Shadows**:
  - `shadow-card`: `0 1px 4px rgba(8, 22, 33, 0.06)`
  - `shadow-cardHover`: `0 6px 18px rgba(8, 22, 33, 0.1)`
  - `shadow-nav`: `0 2px 6px rgba(8, 22, 33, 0.06)`
  - `shadow-dock`: `0 6px 20px rgba(8, 22, 33, 0.35)`
- **Compact E-Commerce Grid**: `p-3` to `p-5` cards with bottom-right sticky Compare & Cart dock (`FloatingActions`)
