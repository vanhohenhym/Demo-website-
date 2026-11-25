# Open Tasks & Deferred Items

Any requests or items outside the active phase are captured here.

| Item ID | Category | Description | Target Phase | Status |
|---|---|---|---|---|
| T-001 | CMS Data Layer | Implement CMS adapters (`mock.ts`, `woocommerce.ts`, `generic-rest.ts`) | Phase 2 | Completed |
| T-002 | CMS Data Layer | Port normalization and extraction logic from `docs/LOGIC` to `lib/logic` with 100% test coverage | Phase 2 | Completed |
| T-003 | CMS Data Layer | Implement `data:audit` CLI and `/data-health` UI | Phase 2 | Completed |
| T-004 | Design Sections | Implement uploaded design sections 1–9 as mini-phases (All 9 Design Sections Built) | Phase 3 | Completed (Phase 3) |
| T-005 | Catalog | Implement facets, filters, sort, and pagination with URL param state | Phase 4 | Completed (Phase 4) |
| T-006 | Compare | Implement compare bar and `/compare` difference matrix | Phase 5 | Completed (Phase 5) |
| T-007 | PC Builder | Implement 12 slots, state management, Leapter rules, PDF export | Phase 6 | Completed (Phase 6) |
| T-008 | Pages & Tracking | Wire up live SMTP/Resend email sending, GA4, GSC, cookie consent | Phase 7 | Completed (Phase 7) |
| T-009 | Final Audit | End-to-end SEO checklist run and client deployment guide | Phase 8 | Completed (Phase 8) |

---

## Session Resume Checkpoint

- **Exact Resume Point**: **All 8 Phases (`Phase 1`–`Phase 8`) + Post-Phase-8 Bugfix & Production Hardening COMPLETED** — All project phases and all 14 hardening items implemented, audited, and documented.
- **Visual & Catalog Reference**: [Star Tech Bangladesh](https://www.startech.com.bd/) + all 9 uploaded homepage screenshots mapped with exact file paths in `docs/SECTIONS/README.md`.
- **Strict Non-Negotiable Rules**:
  - **ZERO hardcoded products** in `app/` or `components/`: every product card, deal row, and catalog listing must pull dynamically via `getCmsAdapter()` from `lib/cms/index.ts`.
  - **One uploaded image per mini-phase**: build, run checks, update docs, report, and wait for user confirmation before the next image.
  - **User Preview Preference**: Always open/show a live `http://localhost:3000/` browser preview after every completed mini-phase/phase.
  - **Never edit `docs/LOGIC/*`** unless explicitly instructed with `UPDATE LOGIC: ...`.
- **Local Environment Notes (Windows)**:
  - Each `run_command` call starts a fresh PowerShell session; prefix every command with `$env:PATH = "E:\Demo website\.tools;$env:PATH"` so Node 24 & pnpm resolve cleanly.
  - Unit tests run via Node 24 native test runner (`npm test` → `node --test tests/**/*.test.ts`; currently **253/253 passing** across **53** suites).
  - `tsconfig.json` has `"allowImportingTsExtensions": true` for seamless Node 24 TS stripping alongside `tsc` and Next.js builds.
  - `npm run build` and `npm run dev` require `BypassSandbox: true` on Windows due to pnpm virtual store + Next.js webpack.
- **Active Skills to Use on Resume**: `using-superpowers`, `modern-web-guidance`, `frontend-design`, `web-design-guidelines`, `seo-audit`, `test-driven-development`, `verification-before-completion` (plus `native_swarm` if `/swarm` is invoked).
