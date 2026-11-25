# Development Phases

Status:
- `PENDING`: Not started
- `IN_PROGRESS`: Actively being worked on
- `COMPLETED`: Built, verified, and approved by user

| Phase | Title | Status | Description & Acceptance Criteria |
|---|---|---|---|
| Phase 1 | Foundation | COMPLETED | Next.js scaffold, all .md docs, folder structure, route skeletons, SEO helpers (metadata, schema, robots, sitemap, 404), npm scripts.<br>**Acceptance**: Build passes, typecheck passes, lint passes, every required doc exists, INDEX.md lists them all. |
| Phase 2 | CMS Data Layer | COMPLETED | Types, adapters (mock, woocommerce, generic-rest), field-map, attribute normalization, brand resolution, messy mock data, overrides.json, brands.json, data:audit script, /data-health page, CMS_DATA_GUIDE.md, unit tests.<br>**Acceptance**: All logic unit tests pass, data audit report generated, brands appear from data. |
| Phase 3 | Design Sections | COMPLETED | Build each uploaded design image faithfully and responsively one section at a time, documenting in docs/SECTIONS/<name>.md.<br>**Acceptance**: Pixel-faithful responsive implementation, Tailwind tokens documented, zero visual defects. |
| Phase 4 | Catalog Features | COMPLETED | Category & brand pages, filters (price, brand, availability, size, generation, type), facets, sort, pagination, URL param state, SEO canonical/noindex rules.<br>**Acceptance**: Every filter works from URL search params, SSR output is correct and fast. |
| Phase 5 | Product Compare | COMPLETED | Compare bar, /compare page, max 4 products, same category restriction, difference highlighting, localStorage persistence, cross-tab sync.<br>**Acceptance**: Compare persists across reloads, highlights differing attributes accurately. |
| Phase 6 | PC Builder | COMPLETED | Slots (CPU, Motherboard, RAM, GPU, Storage, PSU, Case, Cooler, Monitor, Keyboard, Mouse, Others), category flow with ?builder=1&slot=X, live pricing & wattage, compatibility checks, unknown handling badge & toggle, pre-filtering threshold (60%), PDF/print summary, shareable link.<br>**Acceptance**: All 12 slots functional, compatibility evaluation correct per Leapter spec, share links restore state. |
| Phase 7 | Pages & Tracking | COMPLETED | Working /contact form (Zod, honeypot, rate limit, server action/route), /privacy-policy, /terms, GA4 integration with cookie consent, Search Console verification, 301 redirects.<br>**Acceptance**: Contact form validates and sends email, analytics respects consent, redirects function. |
| Phase 8 | Final Audit & README | COMPLETED | Production readiness audit, comprehensive README ("How to connect your CMS", "Data checklist for your CMS editor"), complete SEO checklist verification.<br>**Acceptance**: Zero failing items on SEO checklist, production build clean, docs complete. |
