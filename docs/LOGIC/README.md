# Business Logic Specs (from Leapter)

**Source of truth for all catalog, PC Builder, brand and data-health logic.**
Implement exactly as written. If something is unclear or conflicts with the phase plan, STOP and ask.
Do not edit these files unless the owner says `UPDATE LOGIC: ...`.

| File | Function(s) | Used by |
|---|---|---|
| 01-types.md | Shared types | everything |
| 02-normalize-attribute.md | `normalize_attribute` | CMS adapter |
| 03-extract-attributes.md | `extract_attributes` | CMS adapter |
| 04-resolve-brand.md | `resolve_brand` | CMS adapter |
| 05-brand-visibility.md | `brand_visibility` | category + brand pages, sitemap |
| 06-check-build-compatibility.md | `check_build_compatibility` | PC Builder |
| 07-evaluate-pc-build.md | `evaluate_pc_build` | PC Builder |
| 08-data-health.md | `evaluate_category_health`, `catalog_data_health_report` | /data-health, data:audit |
| tests/*.test.json | Test cases for every function | unit tests |

Not yet specified here (build from the master prompt): filters/facets/sort, compare, search, contact form.

## Global rules (read first)
1. **First-match-wins.** Every `choose` / `decide first` block in the original Leapter logic picks the FIRST matching branch only. Port as `if / else if / else` chains (or early returns). Never as separate `if` statements.
2. **absent** means the value is `undefined` or `null`. Use `== null` checks. An empty list is NOT absent but is treated as missing wherever stated.
3. **round(x, 0)** rounds half away from zero.
4. **Strings** compared with `is` are exact (case-sensitive) unless the spec says lowercased.
5. Port to TypeScript in `lib/logic/`, one file per function, pure functions, no I/O, no framework imports.
6. Keep rule IDs, messages, thresholds and field names exactly.
7. Every case in `tests/*.test.json` (`input` -> `expectedOutput`) becomes a real unit test. Add more where this spec lists a DEVIATION.
8. Put sockets and storage vocabulary tables in ONE editable data file (`lib/logic/vocab.ts`), not inline.

## DEVIATIONS (pending Leapter fixes: implement these as written here; tests marked in each file)
| ID | Where | Required behaviour |
|---|---|---|
| D1 | 03 title extraction | Word boundaries: treat `-` and `.` as boundaries EXCEPT inside `e-atx`, `micro-atx`, `mini-itx`, `mini-dtx`, `m.2` and decimal numbers. `DDR5-6000` -> DDR5, `850W-Gold` -> 850, `AM5.` -> AM5. |
| D2 | 03 title extraction | Case title: choose the LARGEST form factor mentioned (EATX > ATX > mATX > Mini-ITX). Motherboard title: first mentioned. `ATX Mid Tower Case supports mATX/ITX` -> ATX. |
| D3 | 02 lists | For list keys (coolerSockets, storageInterfaces) set `rejectionReason` only when NO item is recognised. Do not run the scalar vocabulary step after list handling. |
| D4 | 02 numbers | Accept units `millimeters`, `millimetres`, `centimeters`, `centimetres`. Comma is a thousands separator only when exactly 3 digits follow (`1,200W` -> 1200; `650,750W` -> 650). |
| D5 | 03 title extraction | Do not set scalar `socket` from a cooler title. |
| D6 | 08 health | Compare green/amber/red thresholds on the UNROUNDED percentage (89.6 is amber). Reported `coveragePercent` stays rounded. |
| D7 | 08 health | If every audited category is `no-data`, `overallStatus` = `no-data` (not green). |
| D8 | 02 storage | Exact vocabulary match first; if no match, keyword fallback on the cleaned text: contains `nvme` -> M.2 NVMe; contains `m2sata` -> M.2 SATA; contains `sataiii`, `sata3` or `sata6` -> SATA III. So `NVMe PCIe Gen4 x4` -> M.2 NVMe. Apply to list items too. |

## Adapter contract (the CMS adapter must provide)
- `componentType` on each product: one of `cpu, motherboard, ram, gpu, storage, psu, case, cooler, monitor, keyboard, mouse, other`, derived from CMS sub-category/attributes. Document the mapping in docs/CMS_ADAPTER.md.
- `categorySlug` for catalog pages (site categories) AND `componentType` for PC Builder / health. Functions below say which one they use.
- `brandList` (from optional `/data/brands.json`) and per-SKU overrides (from `/data/overrides.json`).
