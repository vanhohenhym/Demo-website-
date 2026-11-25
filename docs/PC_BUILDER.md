# PC Builder Architecture & Specification

## 1. Slots Definition
The builder manages 12 distinct component slots categorized into required core components and optional peripherals:

| Slot Key | Slot Label | Required / Optional | Target Category Slug | Primary Compatibility Attributes |
|---|---|---|---|---|
| `cpu` | Processor (CPU) | Required | `processor` | `socket`, `tdp` |
| `cooler` | CPU Cooler | Optional (if CPU boxed) | `cpu-cooler` | `coolerSockets` |
| `motherboard` | Motherboard | Required | `motherboard` | `socket`, `ramType`, `formFactor` |
| `ram` | Memory (RAM) | Required (qty 1–8) | `ram` | `ramType` |
| `storage` | Storage (SSD / HDD) | Required (qty 1–4) | `storage` | `storageInterface` |
| `gpu` | Graphics Card (GPU) | Optional / Required for display | `graphics-card` | `lengthMm`, `tdp` |
| `psu` | Power Supply (PSU) | Required | `power-supply` | `wattage` |
| `case` | Casing | Required | `casing` | `formFactor`, `maxGpuLengthMm` |
| `monitor` | Monitor | Optional (qty 1–4) | `monitor` | Display interfaces |
| `keyboard` | Keyboard | Optional | `keyboard` | USB / Wireless |
| `mouse` | Mouse | Optional | `mouse` | USB / Wireless |
| `others` | Additional Accessories | Optional (qty 1–4, `componentType: "other"`) | `accessories` | General |

---

## 2. Compatibility Engine (per Leapter Business Logic)
The compatibility engine evaluates selected components in real time:
- **Socket Match**: Motherboard socket must equal CPU socket.
- **RAM Type Match**: Motherboard RAM type must equal RAM module type (e.g. DDR5 vs DDR4).
- **Form Factor**: Case supported form factors must contain motherboard form factor (E-ATX > ATX > mATX > Mini-ITX).
- **GPU Clearance**: Case `maxGpuLengthMm` must be >= GPU `lengthMm`.
- **PSU Headroom**: Total estimated wattage (`CPU TDP + GPU TDP + 100W buffer`) must be <= PSU `wattage`.
- **Cooler Socket**: Cooler `coolerSockets` must contain CPU socket.
- **Storage Interface**: Motherboard must support the storage interface (e.g. M.2 NVMe, SATA III).

### Result Object Schema (`CompatibilityCheck` in `lib/logic/types.ts`):
```typescript
export interface CompatibilityCheck {
  ruleId: string;
  status: "ok" | "warning" | "error" | "unknown";
  message: string;
  confidence: "high" | "medium" | "low";
  manuallyVerified?: boolean;
}
```

---

## 3. Graceful Handling of Missing Data & Unknowns
- Missing attributes produce status `"unknown"`, NEVER a false error.
- Parsed values clearly indicate: `"based on detected data"`.
- Any `"unknown"` item surfaces a `"Could not verify"` warning badge and an interactive `"I verified this manually"` checkbox toggle (persisted in `verifiedRules`).
- The build summary shows an `"Unverified checks: N"` counter and never blocks checkout, printing, or sharing.
- An `"Ignore compatibility"` switch in `CompatibilitySummary` lets users bypass compatibility errors/warnings while keeping all selected components visible.

---

## 4. Pre-filtering Threshold, URL State & Print Summary
- **Unrounded 60% Pre-filtering Threshold (DEVIATION D6, `PREFILTER_MIN_COVERAGE_PERCENT = 60`)**: `getChooseHref()` attaches `prefilter=1` alongside compatibility params (`socket`, `ramType`, `formFactor`, `storageInterface`) only when compatibility is active and category coverage is `>= 60%`. On `/pc-builder`, `/category/[category]`, and `/category/[category]/[brand]` in `?builder=1&slot=<slotId>` mode, `evaluateCategoryHealth` checks attribute coverage for audited component types. When `prefilter=1` and `health.status === "red" || health.status === "no-data" || health.coveragePercent < 60` (enforcing D6 even if e.g. `59.6%` rounds to `60%`), compatibility pre-filter params and `prefilter` are stripped and the Builder Mode banner explains why. Manual sidebar facet toggles in `FilterSidebar` omit `prefilter`, so manual filters on `< 60%` coverage categories (e.g. `Socket` on `cpu-cooler`) still work.
- When compatibility pre-filter params are active, the Builder Mode banner renders an `"Ignore compatibility filter"` `<Link>` toggle that strips those params.
- **PDP `"others"` Slot Mapping**: `app/product/[slug]/page.tsx` maps `componentType === "other"` to builder slot `"others"`, allowing accessories and miscellaneous items to link directly to `/pc-builder?add=<slug>&slot=others`.
- **State Persistence (`pc_builder_state`)**: Client state is stored in `localStorage` under `PC_BUILDER_STORAGE_KEY` (`"pc_builder_state"`) with cross-tab `storage` event synchronization.
- **SSR Query Resolution & Soft-Navigation Sync**: `app/pc-builder/page.tsx` (`force-dynamic`) resolves `?add=<slug>&slot=<slotId>` (from catalog/product `"Add to PC Builder"` links) and `?share=<encoded>` (`encodeShareState` / `decodeShareState`) server-side via `getCmsAdapter()`. `PcBuilderClient` tracks a composite `queryKey` via `lastAppliedQueryKeyRef` so soft navigations with new `?add=` or `?share=` params apply cleanly to `localStorage` without re-triggering after URL cleanup via `router.replace("/pc-builder", { scroll: false })`.
- **Print / PDF Summary (`@media print`)**: `"Print Summary"` triggers `window.print()`. `@media print` in `app/globals.css` hides `header`, `footer`, and `.no-print` action/quantity controls while revealing the `hidden print:block` `"Custom PC Build Summary"` header with a hydration-safe `printDate` populated client-side via `useEffect`.
