# 08 Data health

## evaluate_category_health
**Inputs:** `categorySlug` (a COMPONENT TYPE slug, see below), `products: CatalogProduct[]`.
**Outputs:** `health: CategoryHealth`, `otherBrandCount`, `parsedProductCount`.

Mapping `categorySlug -> componentType` and required attributes:

| slug | componentType | required attributes (slots) |
|---|---|---|
| motherboard | Motherboard | socket, ramType, formFactor, storageInterfaces (4) |
| cpu | CPU | socket, tdp (2) |
| gpu | GPU | lengthMm, tdp (2) |
| case | Case | formFactor, maxGpuLengthMm (2) |
| psu | PSU | wattage (1) |
| cooler | CPU Cooler | coolerSockets (1) |
| storage | Storage | storageInterface (1) |
| ram | RAM | none (0) |
| monitor / keyboard / mouse | Monitor / Keyboard / Mouse | none (0) |
| anything else | Other | none (0) |

Steps (products with `item.categorySlug == categorySlug`):
1. `productCount` = count. `otherBrandCount` = those with `brandSlug == "other"`.
2. A product counts toward `parsedProductCount` if ANY of its attributes has `source == "parsed"`.
3. For each required attribute count products where it is present. Empty lists (`coolerSockets`, `storageInterfaces`) count as missing.
4. `totalSlots = productCount * slotsPerProduct`; `filledSlots` = sum of presents.
5. Status:
   - `productCount == 0` -> `coveragePercent 0`, status `no-data`
   - `totalSlots > 0` -> `coveragePercent = round(filled / total * 100)`; green >= 90, amber >= 60, else red. **D6:** compare the UNROUNDED value.
   - `totalSlots == 0` (no required attributes) -> `coveragePercent 100`, green
6. `attributeCoverages`: per required attribute `{ attributeName, presentCount, totalCount: productCount, coveragePercent: round(present/count*100) }`.

## catalog_data_health_report
**Input:** `products`. **Outputs:** `categoryHealths[]`, `otherBrandCount`, `parsedProductCount` (sums), `overallStatus` (default green).
Audit these slugs in order: `motherboard, cpu, gpu, psu, case, cooler, storage`. For each call `evaluate_category_health`, collect results, add counts.
`overallStatus`: any red -> red; else any amber -> amber; else green. `no-data` does not change it. **D7:** if every category is `no-data`, `overallStatus = "no-data"`.

## Extra outputs to build around this (from the master prompt)
- Products missing each required attribute (list of ids), products with brand "Other", products using parsed values, and unmapped / unrecognised attribute names aggregated from `extract_attributes`.
- Output as JSON (protected `/data-health` page), CSV (`/reports/data-health.csv`) and Markdown (`docs/DATA_HEALTH.md`) via `npm run data:audit`.
- PC Builder pre-filtering of compatible parts is enabled only when the relevant attribute coverage is >= 60%.

## Tests
`tests/catalog-data-health.test.json` (3 cases). Add boundaries 59.9, 60, 89.9, 90 and an all-empty catalog.
