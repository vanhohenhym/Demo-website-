# CMS Data Entry Guide (Client & Editor Facing)

This guide is for store managers and catalog editors entering products in WooCommerce, WordPress, or any headless CMS.
Following these rules ensures PC Builder compatibility checks, catalog filters, brand pages, and SEO sitemaps work automatically without manual code edits.

---

## 1. Required Attributes by Component Type

These 7 PC component types are audited by the Data Health dashboard (`/data-health`) and `npm run data:audit`. PC Builder compatibility pre-filtering activates automatically when a category reaches **>= 60%** coverage, and **>= 90%** is Healthy (green).

| Component Type (`componentType`) | Required Canonical Key | Accepted Canonical Values & Format | Recommended WooCommerce Taxonomy Slug | Accepted Custom Field / Attribute Aliases |
|---|---|---|---|---|
| **Motherboard** (`motherboard`) | `socket` | `AM5`, `AM4`, `AM3+`, `LGA1700`, `LGA1851`, `LGA1200`, `LGA1151`, `LGA2066`, `LGA2011-3`, `LGA4677`, `TR5`, `sTR5`, `sTRX4`, `sTRX5`, `SP3`, `SP5`, `FM2+` | `pa_socket` | `socket`, `CPU Socket`, `Processor Socket`, `Socket Type` |
| | `ramType` | `DDR5`, `DDR4`, `DDR3`, `LPDDR5X`, `LPDDR5`, `LPDDR4X`, `LPDDR4` (never GDDR) | `pa_memory-type` | `ram_type`, `RAM Type`, `Memory Type`, `DDR`, `Supported Memory`, `Memory` |
| | `formFactor` | `EATX`, `ATX`, `mATX`, `Mini-ITX` | `pa_form-factor` | `form_factor`, `Form Factor`, `Size Factor`, `Board Form Factor` |
| | `storageInterfaces` | List separated by `,` `/` `;` `|` or `and`: `M.2 NVMe`, `M.2 SATA`, `SATA III` | *(custom field)* `storage_interfaces` | `Storage Interfaces`, `Supported Interfaces`, `Storage Support` |
| **CPU** (`cpu`) | `socket` | Same socket vocabulary as Motherboard (e.g. `AM5`, `AM4`, `LGA1700`, `LGA1851`, `LGA1200`) | `pa_socket` | `socket`, `CPU Socket`, `Processor Socket`, `Socket Type` |
| | `tdp` | Positive integer in Watts (`> 0`), e.g. `65`, `105`, `125`, `170`, `253` | `pa_tdp` | `tdp`, `TDP`, `Thermal Design Power`, `Power Consumption` |
| **GPU** (`gpu`) | `lengthMm` | Whole millimeters between `50` and `600`, e.g. `242`, `304`, `336` | `pa_length` | `length_mm`, `GPU Length`, `Card Length`, `Length` |
| | `tdp` | Positive integer in Watts (`> 0`), e.g. `165`, `200`, `285`, `450` | `pa_tdp` | `tdp`, `TDP`, `Thermal Design Power`, `Power Consumption` |
| **PSU** (`psu`) | `wattage` | Positive integer in Watts (`> 0`), e.g. `550`, `650`, `750`, `850`, `1000`, `1200` | `pa_wattage` | `wattage`, `Power`, `PSU`, `Output Power`, `Max Wattage`, `Power Consumption` |
| **Case** (`case`) | `formFactor` | Largest supported motherboard size: `EATX`, `ATX`, `mATX`, `Mini-ITX` | `pa_form-factor` | `form_factor`, `Form Factor`, `Case Form Factor`, `Size Factor` |
| | `maxGpuLengthMm` | Whole millimeters between `50` and `600`, e.g. `340`, `380`, `410` | *(custom field)* `max_gpu_length_mm` | `Max GPU Length`, `GPU Clearance`, `Max VGA Clearance`, `pa_length` (on cases) |
| **CPU Cooler** (`cooler`) | `coolerSockets` | List separated by `,` `/` `;` `|` or `and` using canonical sockets, e.g. `AM4, AM5, LGA1700, LGA1200` | *(custom field)* `cooler_sockets` | `Cooler Sockets`, `Cooler Socket`, `Supported Sockets`, `Socket Compatibility` |
| **Storage** (`storage`) | `storageInterface` | Single value: `M.2 NVMe`, `M.2 SATA`, or `SATA III` | `pa_storage-interface` | `storage_interface`, `Storage Interface`, `Interface`, `M.2 Interface`, `SATA Interface` |

### Optional / Recommended Attributes for Other Categories
- **RAM (`ram`)**: Set `ramType` (`pa_memory-type` / `ram_type`) to `DDR5`, `DDR4`, or `DDR3` so PC Builder can verify Motherboard–RAM compatibility.
- **Monitors, Keyboards, Mice, Laptops, Accessories**: Set clear **Brand**, **Price**, **Availability**, and clean category assignment; compatibility slots do not require hardware dimensions.

---

## 2. Accepted Canonical Vocabularies (Exact Values)

The normalization engine maps common variations (e.g. `Socket AM5` -> `AM5`, `Micro ATX` -> `mATX`, `33.6 cm` -> `336`, `1.2 kW` -> `1200`, `NVMe PCIe Gen4 x4` -> `M.2 NVMe`), but entering canonical values directly gives the highest confidence and avoids rejected entries:

- **Sockets**: `AM5`, `AM4`, `AM3+`, `LGA1700`, `LGA1851`, `LGA1200`, `LGA1151`, `LGA2066`, `LGA2011-3`, `LGA4677`, `TR5`, `sTR5`, `sTRX4`, `sTRX5`, `SP3`, `SP5`, `FM2+`
- **RAM Types**: `DDR5`, `DDR4`, `DDR3`, `LPDDR5X`, `LPDDR5`, `LPDDR4X`, `LPDDR4`
- **Form Factors**: `EATX`, `ATX`, `mATX`, `Mini-ITX`
- **Storage Interfaces**: `M.2 NVMe`, `M.2 SATA`, `SATA III`
- **Power (`wattage`, `tdp`)**: Whole Watts (`> 0`). Units `W` and `kW` (and thousands commas like `1,200W`) are supported; plain numbers are treated as Watts.
- **Dimensions (`lengthMm`, `maxGpuLengthMm`)**: Whole millimeters (`50` to `600`). Units `mm`, `millimeters`, `cm`, `centimeters`, `in`, `inch`, `inches`, `"` are converted automatically; plain numbers `>= 50` are treated as `mm`.

---

## 3. Brand, Pricing & Data Hygiene Rules

1. **Brand Entry**:
   - Assign brand via the CMS brand taxonomy (`pa_brand`, `product_brand`, `yith_product_brand`) or an explicit `Brand` attribute.
   - Use consistent canonical names (`ASUS`, `MSI`, `Gigabyte`, `Corsair`, `AMD`, `Intel`, `Samsung`, `NZXT`, `DeepCool`, `G.Skill`). Common spelling aliases in `data/brands.json` are merged automatically.
   - Leave Brand blank if genuinely unbranded; placeholder strings (`N/A`, `NA`, `Generic`, `OEM`, `No Brand`, `Unknown`) are ignored and resolve to `"Other"` (which is excluded from SEO sitemaps).
   - A brand sub-category page is indexed in Google and included in `sitemap.xml` once it has at least **3 products** in that category.
2. **Missing Values**:
   - Leave unknown attributes blank instead of typing `N/A`, `-`, or `TBD`. Unknown attributes show a clear **Unverified / Unknown** notice in PC Builder rather than blocking valid builds.
   - Products with no price (or `0`/blank price) automatically display **"Call for price"** and stay valid across the storefront.
3. **Emergency Per-SKU Overrides**:
   - If a live CMS record has broken specs you cannot fix immediately in the CMS, add a temporary fix in `data/overrides.json` keyed by SKU. Overrides take highest precedence until the CMS entry is corrected.

---

## 4. Bulk CSV Import Template

Use [attributes-template.csv](templates/attributes-template.csv) as a starting template for bulk imports into WooCommerce or custom spreadsheets. Every column header matches a recognized CMS attribute key or canonical field.

---

## 5. Free WordPress Posts Mode (`CMS_PROVIDER=wp-posts`)

If your WordPress site does not have WooCommerce installed (for example, a free WordPress.com Simple site connected via `https://public-api.wordpress.com/wp/v2/sites/<domain>` or WordPress Core `/wp-json/wp/v2`), enter each product as a standard **WordPress Post**:

1. **Post Title**: Full product name (e.g. `AMD Ryzen 7 7800X3D Processor`).
2. **Categories**: Assign the matching hardware category slug (`cpu`, `motherboard`, `ram`, `gpu`, `storage`, `psu`, `case`, `cooler`, `monitor`, `keyboard`, `mouse`) and optional parent category (`component`, `power`, `accessories`, `gaming`).
3. **Featured Image**: Set the WordPress **Featured Image** (or embed an image block in the post body).
4. **Product Details & Specs (Table block, List block, or `Key: Value` lines in Post Content)**:
   ```text
   Price: 43500
   Sale Price: 41900
   SKU: AMD-7800X3D
   Brand: AMD
   Warranty: 3 Years
   Availability: in_stock
   Socket: AM5
   TDP: 120W
   ```
5. **Tags / Sticky**: Mark a post as **Sticky** (or add tag `featured`) to show it in Featured sections, and add tag `flash-deal` (or set `Sale Price` lower than `Price`) to include it in Flash Sale & Mega Deal sections.
