import type { ICMSAdapter } from "../adapter.ts";
import { loadBrandConfigs, loadSkuOverrides } from "../config-loader.ts";
import { getCategoryBrands } from "../normalize/brands.ts";
import {
  buildCategoriesWithCounts,
  normalizeRawProducts,
} from "../normalize/pipeline.ts";
import {
  getEffectivePrice,
  queryProducts,
  summarizeUnmappedAttributes,
} from "../query-engine.ts";
import type {
  Brand,
  CatalogQueryParams,
  CatalogQueryResult,
  Category,
  Product,
  RawAdapterProduct,
  RawCmsCategoryInput,
  UnmappedAttributeSummary,
} from "../types.ts";

const RAW_MOCK_CATEGORIES: RawCmsCategoryInput[] = [
  {
    id: "cat-motherboard",
    name: "Motherboard",
    slug: "motherboard",
    description: "AMD AM5, AM4, and Intel LGA1700 motherboards for desktop PC builds.",
    icon: "Cpu",
  },
  {
    id: "cat-cpu",
    name: "Processor",
    slug: "processor",
    description: "Desktop processors from AMD Ryzen and Intel Core series.",
    icon: "Microchip",
  },
  {
    id: "cat-gpu",
    name: "Graphics Card",
    slug: "graphics-card",
    description: "Gaming and workstation GPUs for high-frame-rate and creative workloads.",
    icon: "MonitorPlay",
  },
  {
    id: "cat-psu",
    name: "Power Supply",
    slug: "power-supply",
    description: "80+ certified modular and non-modular desktop power supply units.",
    icon: "Zap",
  },
  {
    id: "cat-case",
    name: "Casing",
    slug: "casing",
    description: "Airflow mid-tower, full-tower, and compact desktop PC cases.",
    icon: "Box",
  },
  {
    id: "cat-cooler",
    name: "CPU Cooler",
    slug: "cpu-cooler",
    description: "Air tower coolers and all-in-one liquid coolers for desktop CPUs.",
    icon: "Fan",
  },
  {
    id: "cat-storage",
    name: "Storage",
    slug: "storage",
    description: "M.2 NVMe PCIe Gen4/Gen5 SSDs and SATA solid-state drives.",
    icon: "HardDrive",
  },
  {
    id: "cat-ram",
    name: "Desktop RAM",
    slug: "ram",
    description: "High-speed DDR5 and DDR4 desktop memory kits.",
    icon: "MemoryStick",
  },
  {
    id: "cat-monitor",
    name: "Monitor",
    slug: "monitor",
    description: "High-refresh gaming and color-accurate IPS monitors.",
    icon: "Monitor",
  },
  {
    id: "cat-keyboard",
    name: "Keyboard",
    slug: "keyboard",
    description: "Mechanical and wireless desktop keyboards.",
    icon: "Keyboard",
  },
  {
    id: "cat-mouse",
    name: "Mouse",
    slug: "mouse",
    description: "Lightweight esports and ergonomic desktop mice.",
    icon: "Mouse",
  },
  {
    id: "cat-networking",
    name: "Networking",
    slug: "networking",
    description: "Routers, switches, and mesh Wi-Fi equipment.",
    icon: "Wifi",
  },
];

/**
 * Intentionally messy raw CMS products across all 7 audited PC component types
 * plus RAM and peripherals. Exercises:
 * - Inconsistent brand spellings (ASUS / Asus / ASUSTeK / ASUS ROG, GIGABYTE / Gigabyte Technology, msi / Micro-Star International)
 * - Mixed attribute names (CPU Socket, pa_socket, Processor Socket, Socket Type, pa_memory-type, etc.)
 * - Unit conversions & normalization (Socket AM5, LGA 1700, DDR5-6000, Micro ATX, 750W, 33.6 cm, NVMe PCIe Gen4 x4)
 * - Missing attributes for realistic Data Health green/amber/red spread
 * - Unbranded/placeholder products resolving to "Other"
 * - Unmapped CMS attributes logged for catalog hygiene
 * - Products with absent price ("Call for price")
 * - Per-SKU overrides applied from data/overrides.json
 */
const RAW_MOCK_PRODUCTS: RawAdapterProduct[] = [
  // ===================== MOTHERBOARDS (5) =====================
  {
    id: "mobo-1",
    sku: "ASU-MB-B650-PLUS",
    title: "ASUS PRIME B650-PLUS WiFi ATX Motherboard",
    slug: "asus-prime-b650-plus-wifi-atx-motherboard",
    categorySlug: "motherboard",
    categoryName: "Motherboard",
    subCategorySlugs: ["component", "motherboard"],
    brandTaxonomy: "ASUS",
    price: 26500,
    salePrice: 24900,
    availability: "in_stock",
    stockQuantity: 12,
    images: [
      {
        url: "/images/products/asus-prime-b650-plus.png",
        alt: "ASUS PRIME B650-PLUS WiFi ATX Motherboard",
      },
    ],
    shortDescription: "AM5 ATX motherboard with DDR5 support and dual M.2 slots.",
    explicitAttributes: [
      { key: "pa_socket", value: "Socket AM5" },
      { key: "pa_memory-type", value: "DDR5-6000" },
      { key: "pa_form-factor", value: "ATX" },
    ],
    customFields: [{ key: "storage_interfaces", value: "M.2 NVMe, SATA III" }],
    warranty: "3 Years",
    isFeatured: true,
    isFlashDeal: true,
    createdAt: "2026-03-10T10:00:00Z",
  },
  {
    id: "mobo-2",
    sku: "ASU-MB-B650M-TUF",
    title: "Asus TUF GAMING B650M-PLUS Micro ATX Motherboard",
    slug: "asus-tuf-gaming-b650m-plus-motherboard",
    categorySlug: "motherboard",
    categoryName: "Motherboard",
    subCategorySlugs: ["component", "motherboard"],
    brandTaxonomy: "Asus",
    price: 28500,
    availability: "in_stock",
    stockQuantity: 8,
    images: [
      {
        url: "/images/products/asus-tuf-b650m.png",
        alt: "Asus TUF GAMING B650M-PLUS Motherboard",
      },
    ],
    shortDescription: "Military-grade mATX AM5 motherboard with PCIe 4.0 M.2 NVMe.",
    explicitAttributes: [
      { key: "CPU Socket", value: "AM5" },
      { key: "RAM Type", value: "DDR5" },
      { key: "Form Factor", value: "Micro ATX" },
      { key: "Supported Interfaces", value: "NVMe PCIe Gen4 x4 / SATA 3" },
    ],
    customFields: [],
    warranty: "3 Years",
    isFeatured: true,
    createdAt: "2026-03-12T10:00:00Z",
  },
  {
    id: "mobo-3",
    sku: "ASU-MB-Z790-ROG",
    title: "ASUSTeK ROG STRIX Z790-F GAMING WIFI Motherboard",
    slug: "asus-rog-strix-z790-f-gaming-wifi",
    categorySlug: "motherboard",
    categoryName: "Motherboard",
    subCategorySlugs: ["component", "motherboard"],
    brandTaxonomy: "ASUSTeK",
    price: 49500,
    salePrice: 46900,
    availability: "in_stock",
    stockQuantity: 4,
    images: [
      {
        url: "/images/products/asus-rog-z790-f.png",
        alt: "ASUSTeK ROG STRIX Z790-F GAMING WIFI Motherboard",
      },
    ],
    shortDescription: "Enthusiast LGA1700 ATX motherboard with 4x M.2 slots and WiFi 6E.",
    explicitAttributes: [
      { key: "Processor Socket", value: "LGA 1700" },
      { key: "Memory Type", value: "DDR5" },
      { key: "Board Form Factor", value: "Standard ATX" },
      { key: "Storage Support", value: "M.2 NVMe, M.2 SATA, SATA III" },
      { key: "RGB Header", value: "3x ARGB Gen2" },
    ],
    customFields: [],
    warranty: "3 Years",
    createdAt: "2026-03-14T10:00:00Z",
  },
  {
    id: "mobo-4",
    sku: "MSI-MB-B650M-PRO",
    title: "MSI PRO B650M-P AM5 DDR5 Motherboard",
    slug: "msi-pro-b650m-p-am5-motherboard",
    categorySlug: "motherboard",
    categoryName: "Motherboard",
    subCategorySlugs: ["component", "motherboard"],
    brandTaxonomy: "Micro-Star International",
    price: 18900,
    availability: "in_stock",
    stockQuantity: 15,
    images: [
      {
        url: "/images/products/msi-pro-b650m-p.png",
        alt: "MSI PRO B650M-P AM5 DDR5 Motherboard",
      },
    ],
    shortDescription:
      "Business-class AM5 mATX board (storageInterfaces fixed via data/overrides.json).",
    explicitAttributes: [
      { key: "pa_socket", value: "Socket AM5" },
      { key: "Memory Type", value: "DDR5" },
      { key: "Form Factor", value: "mATX" },
    ],
    customFields: [],
    warranty: "3 Years",
    createdAt: "2026-03-15T10:00:00Z",
  },
  {
    id: "mobo-5",
    sku: "GIG-MB-B550M-DS3H",
    title: "Gigabyte B550M DS3H AM4 DDR4 Micro-ATX Motherboard",
    slug: "gigabyte-b550m-ds3h-am4-motherboard",
    categorySlug: "motherboard",
    categoryName: "Motherboard",
    subCategorySlugs: ["component", "motherboard"],
    brandTaxonomy: "GIGABYTE",
    price: 13200,
    availability: "in_stock",
    stockQuantity: 20,
    images: [
      {
        url: "/images/products/gigabyte-b550m-ds3h.png",
        alt: "Gigabyte B550M DS3H AM4 DDR4 Micro-ATX Motherboard",
      },
    ],
    shortDescription:
      "Budget AM4 motherboard relying on title parsing (missing storageInterfaces).",
    explicitAttributes: [],
    customFields: [],
    warranty: "3 Years",
    createdAt: "2026-02-20T10:00:00Z",
  },

  // ===================== CPUs (4) =====================
  {
    id: "cpu-1",
    sku: "AMD-CPU-7800X3D",
    title: "AMD Ryzen 7 7800X3D Gaming Processor",
    slug: "amd-ryzen-7-7800x3d-processor",
    categorySlug: "processor",
    categoryName: "Processor",
    subCategorySlugs: ["component", "amd-processor"],
    brandTaxonomy: "AMD",
    price: 45500,
    salePrice: 43500,
    availability: "in_stock",
    stockQuantity: 9,
    images: [
      {
        url: "/images/products/amd-ryzen-7-7800x3d.png",
        alt: "AMD Ryzen 7 7800X3D Gaming Processor",
      },
    ],
    shortDescription: "8-core, 16-thread AM5 desktop CPU with 96MB 3D V-Cache.",
    explicitAttributes: [
      { key: "pa_socket", value: "Socket AM5" },
      { key: "Thermal Design Power", value: "120W" },
      { key: "Box Cooler", value: "Not Included" },
    ],
    customFields: [],
    warranty: "3 Years",
    isFeatured: true,
    isFlashDeal: true,
    createdAt: "2026-03-18T10:00:00Z",
  },
  {
    id: "cpu-2",
    sku: "AMD-CPU-7600X",
    title: "Ryzen 5 7600X 6-Core Desktop Processor",
    slug: "amd-ryzen-5-7600x-processor",
    categorySlug: "processor",
    categoryName: "Processor",
    subCategorySlugs: ["component", "amd-processor"],
    price: 25500,
    availability: "in_stock",
    stockQuantity: 14,
    images: [
      {
        url: "/images/products/amd-ryzen-5-7600x.png",
        alt: "AMD Ryzen 5 7600X Processor",
      },
    ],
    shortDescription: "6-core Zen 4 processor for Socket AM5 platforms.",
    explicitAttributes: [
      { key: "Brand", value: "Advanced Micro Devices" },
      { key: "CPU Socket", value: "AM5" },
      { key: "pa_tdp", value: "105W" },
    ],
    customFields: [],
    warranty: "3 Years",
    createdAt: "2026-03-11T10:00:00Z",
  },
  {
    id: "cpu-3",
    sku: "AMD-CPU-5600X",
    title: "AMD Ryzen 5 5600X AM4 6-Core Processor",
    slug: "amd-ryzen-5-5600x-am4-processor",
    categorySlug: "processor",
    categoryName: "Processor",
    subCategorySlugs: ["component", "processor"],
    price: 16500,
    availability: "in_stock",
    stockQuantity: 18,
    images: [
      {
        url: "/images/products/amd-ryzen-5-5600x.png",
        alt: "AMD Ryzen 5 5600X AM4 Processor",
      },
    ],
    shortDescription: "Popular AM4 CPU; brand resolved via title prefix, socket parsed from title.",
    explicitAttributes: [{ key: "TDP", value: "65W" }],
    customFields: [],
    warranty: "3 Years",
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "cpu-4",
    sku: "INT-CPU-14700K",
    title: "Intel Core i7-14700K 14th Gen Unlocked Processor",
    slug: "intel-core-i7-14700k-processor",
    categorySlug: "processor",
    categoryName: "Processor",
    subCategorySlugs: ["component", "intel-processor"],
    brandTaxonomy: "INTEL",
    // Intentionally absent price to test "Call for price" handling
    price: undefined,
    availability: "preorder",
    images: [
      {
        url: "/images/products/intel-i7-14700k.png",
        alt: "Intel Core i7-14700K Processor",
      },
    ],
    shortDescription: "20-core LGA1700 desktop CPU (missing TDP & call for price).",
    explicitAttributes: [{ key: "Socket Type", value: "LGA 1700" }],
    customFields: [],
    warranty: "3 Years",
    createdAt: "2026-03-19T10:00:00Z",
  },

  // ===================== GPUs (4) =====================
  {
    id: "gpu-1",
    sku: "ASU-GPU-4080S-TUF",
    title: "ASUS TUF Gaming GeForce RTX 4080 SUPER 16GB GDDR6X",
    slug: "asus-tuf-rtx-4080-super-16gb",
    categorySlug: "graphics-card",
    categoryName: "Graphics Card",
    subCategorySlugs: ["component", "graphics-card"],
    brandTaxonomy: "ASUS ROG",
    price: 148000,
    salePrice: 142000,
    availability: "in_stock",
    stockQuantity: 3,
    images: [
      {
        url: "/images/products/asus-tuf-rtx-4080s.png",
        alt: "ASUS TUF Gaming GeForce RTX 4080 SUPER",
      },
    ],
    shortDescription: "Triple-fan RTX 4080 SUPER with 33.6 cm shroud length.",
    explicitAttributes: [
      { key: "GPU Length", value: "33.6 cm" },
      { key: "Power Consumption", value: "320W" },
      { key: "Cooling Fans", value: "Triple Axial-tech" },
    ],
    customFields: [],
    warranty: "3 Years",
    isFeatured: true,
    isFlashDeal: true,
    createdAt: "2026-03-20T10:00:00Z",
  },
  {
    id: "gpu-2",
    sku: "MSI-GPU-4070TI-VENTUS",
    title: "MSI GeForce RTX 4070 Ti SUPER 16G VENTUS 3X OC",
    slug: "msi-rtx-4070-ti-super-ventus-3x",
    categorySlug: "graphics-card",
    categoryName: "Graphics Card",
    subCategorySlugs: ["component", "graphics-card"],
    brandTaxonomy: "msi",
    price: 112000,
    availability: "in_stock",
    stockQuantity: 6,
    images: [
      {
        url: "/images/products/msi-rtx-4070ti-ventus.png",
        alt: "MSI GeForce RTX 4070 Ti SUPER VENTUS 3X OC",
      },
    ],
    shortDescription: "16GB GDDR6X GPU for 1440p and 4K gaming.",
    explicitAttributes: [
      { key: "pa_length", value: "308 mm" },
      { key: "pa_tdp", value: "285W" },
    ],
    customFields: [],
    warranty: "3 Years",
    createdAt: "2026-03-16T10:00:00Z",
  },
  {
    id: "gpu-3",
    sku: "GIG-GPU-4070S-EAGLE",
    title: "Gigabyte GeForce RTX 4070 SUPER EAGLE OC 12G",
    slug: "gigabyte-rtx-4070-super-eagle-oc",
    categorySlug: "graphics-card",
    categoryName: "Graphics Card",
    subCategorySlugs: ["component", "graphics-card"],
    brandTaxonomy: "Gigabyte Technology",
    price: 86500,
    availability: "in_stock",
    stockQuantity: 7,
    images: [
      {
        url: "/images/products/gigabyte-rtx-4070s-eagle.png",
        alt: "Gigabyte GeForce RTX 4070 SUPER EAGLE OC",
      },
    ],
    shortDescription:
      "Raw CMS entry missing dimensions and TDP; fixed via data/overrides.json.",
    // Intentionally missing lengthMm & tdp in raw CMS — fixed by data/overrides.json!
    explicitAttributes: [],
    customFields: [],
    warranty: "3 Years",
    createdAt: "2026-03-13T10:00:00Z",
  },
  {
    id: "gpu-4",
    sku: "X99-GPU-GT710",
    title: "Dual Fan Silent Display Adapter 2GB PCIe",
    slug: "dual-fan-silent-display-adapter-2gb",
    categorySlug: "graphics-card",
    categoryName: "Graphics Card",
    subCategorySlugs: ["component", "graphics-card"],
    // Placeholder brand ignored -> resolves to "Other"
    brandTaxonomy: "OEM",
    // Absent price -> "Call for price"
    price: undefined,
    availability: "out_of_stock",
    stockQuantity: 0,
    images: [
      {
        url: "/images/products/generic-gpu.png",
        alt: "Dual Fan Silent Display Adapter 2GB",
      },
    ],
    shortDescription: "Unbranded basic display adapter with missing specs.",
    explicitAttributes: [],
    customFields: [],
    createdAt: "2025-11-01T10:00:00Z",
  },

  // ===================== PSUs (3) =====================
  {
    id: "psu-1",
    sku: "COR-PSU-RM750E",
    title: "RM750e Fully Modular Low-Noise Power Supply",
    slug: "corsair-rm750e-750w-psu",
    categorySlug: "power-supply",
    categoryName: "Power Supply",
    subCategorySlugs: ["component", "power-supply"],
    // No brandTaxonomy and no brand in title -> resolved via SKU prefix "COR-" -> Corsair!
    price: 13800,
    salePrice: 12900,
    availability: "in_stock",
    stockQuantity: 11,
    images: [
      {
        url: "/images/products/corsair-rm750e.png",
        alt: "Corsair RM750e 750W Power Supply",
      },
    ],
    shortDescription: "ATX 3.0 PCIe 5.0 ready 750W fully modular PSU.",
    explicitAttributes: [
      { key: "pa_wattage", value: "750W" },
      { key: "Form Factor", value: "ATX" },
      { key: "Efficiency Rating", value: "80 PLUS Gold" },
    ],
    customFields: [],
    warranty: "7 Years",
    isFeatured: true,
    createdAt: "2026-03-08T10:00:00Z",
  },
  {
    id: "psu-2",
    sku: "SEA-PSU-FOCUS-850",
    title: "Focus GX 850W-Gold ATX Modular Power Supply",
    slug: "seasonic-focus-gx-850w-gold",
    categorySlug: "power-supply",
    categoryName: "Power Supply",
    subCategorySlugs: ["component", "power-supply"],
    brandTaxonomy: "Sea Sonic",
    price: 16200,
    availability: "in_stock",
    stockQuantity: 5,
    images: [
      {
        url: "/images/products/seasonic-focus-850.png",
        alt: "Seasonic Focus GX 850W Gold PSU",
      },
    ],
    shortDescription: "Wattage parsed from title token 850W-Gold (tests D1).",
    explicitAttributes: [],
    customFields: [],
    warranty: "10 Years",
    createdAt: "2026-03-07T10:00:00Z",
  },
  {
    id: "psu-3",
    sku: "MSI-PSU-A1000G",
    title: "MSI MPG A1000G PCIE5 Power Supply",
    slug: "msi-mpg-a1000g-pcie5-psu",
    categorySlug: "power-supply",
    categoryName: "Power Supply",
    subCategorySlugs: ["component", "power-supply"],
    brandTaxonomy: "MSI Gaming",
    price: 22500,
    availability: "in_stock",
    stockQuantity: 4,
    images: [
      {
        url: "/images/products/msi-a1000g.png",
        alt: "MSI MPG A1000G PCIE5 Power Supply",
      },
    ],
    shortDescription: "1.0 kW native 12VHPWR modular power supply.",
    explicitAttributes: [
      { key: "Output Power", value: "1.0 kW" },
      { key: "Form Factor", value: "ATX" },
    ],
    customFields: [],
    warranty: "10 Years",
    createdAt: "2026-03-06T10:00:00Z",
  },

  // ===================== CASES (3) =====================
  {
    id: "case-1",
    sku: "COR-CASE-4000D",
    title: "Corsair 4000D AIRFLOW Tempered Glass Mid-Tower Case",
    slug: "corsair-4000d-airflow-case",
    categorySlug: "casing",
    categoryName: "Casing",
    subCategorySlugs: ["component", "casing"],
    brandTaxonomy: "CORSAIR",
    price: 10800,
    availability: "in_stock",
    stockQuantity: 10,
    images: [
      {
        url: "/images/products/corsair-4000d.png",
        alt: "Corsair 4000D AIRFLOW Mid-Tower Case",
      },
    ],
    shortDescription: "High-airflow ATX mid-tower casing with 360mm GPU clearance.",
    explicitAttributes: [
      { key: "Case Form Factor", value: "ATX" },
      { key: "Max GPU Length", value: "360 mm" },
      { key: "Side Panel", value: "Tempered Glass" },
    ],
    customFields: [],
    warranty: "2 Years",
    isFeatured: true,
    createdAt: "2026-03-05T10:00:00Z",
  },
  {
    id: "case-2",
    sku: "LL-CASE-LANCOOL216",
    title: "Lian Li Lancool 216 E-ATX Mid Tower Case supports ATX/mATX/ITX",
    slug: "lian-li-lancool-216-case",
    categorySlug: "casing",
    categoryName: "Casing",
    subCategorySlugs: ["component", "casing"],
    brandTaxonomy: "LIAN LI",
    price: 12400,
    availability: "in_stock",
    stockQuantity: 6,
    images: [
      {
        url: "/images/products/lian-li-lancool-216.png",
        alt: "Lian Li Lancool 216 Mid Tower Case",
      },
    ],
    shortDescription:
      "Form factor parsed as EATX from title (D2 largest size); pa_length promoted to maxGpuLengthMm.",
    explicitAttributes: [{ key: "pa_length", value: "392 mm" }],
    customFields: [],
    warranty: "2 Years",
    createdAt: "2026-03-04T10:00:00Z",
  },
  {
    id: "case-3",
    sku: "NZXT-CASE-H5",
    title: "NZXT H5 Flow Compact Mid-Tower ATX Case",
    slug: "nzxt-h5-flow-atx-case",
    categorySlug: "casing",
    categoryName: "Casing",
    subCategorySlugs: ["component", "casing"],
    brandTaxonomy: "nzxt",
    price: 11200,
    availability: "in_stock",
    stockQuantity: 5,
    images: [
      {
        url: "/images/products/nzxt-h5-flow.png",
        alt: "NZXT H5 Flow ATX Case",
      },
    ],
    shortDescription: "Compact airflow case (intentionally missing maxGpuLengthMm).",
    explicitAttributes: [{ key: "Form Factor", value: "ATX" }],
    customFields: [],
    warranty: "2 Years",
    createdAt: "2026-03-03T10:00:00Z",
  },

  // ===================== CPU COOLERS (4 — 2/4 = 50% red for health testing) =====================
  {
    id: "cooler-1",
    sku: "NOC-COOL-NHD15",
    title: "Noctua NH-D15 chromax.black Dual-Tower CPU Cooler",
    slug: "noctua-nh-d15-chromax-black",
    categorySlug: "cpu-cooler",
    categoryName: "CPU Cooler",
    subCategorySlugs: ["component", "cpu-cooler"],
    brandTaxonomy: "NOCTUA",
    price: 14500,
    availability: "in_stock",
    stockQuantity: 6,
    images: [
      {
        url: "/images/products/noctua-nh-d15.png",
        alt: "Noctua NH-D15 chromax.black CPU Cooler",
      },
    ],
    shortDescription: "Flagship quiet dual-tower air cooler with multi-socket SecuFirm2 kit.",
    explicitAttributes: [
      { key: "Supported Sockets", value: "AM5, AM4, LGA1700, LGA1200" },
    ],
    customFields: [],
    warranty: "6 Years",
    createdAt: "2026-03-02T10:00:00Z",
  },
  {
    id: "cooler-2",
    sku: "DC-COOL-AK620",
    title: "DeepCool AK620 Dual-Tower CPU Cooler AM5 Ready",
    slug: "deepcool-ak620-cpu-cooler",
    categorySlug: "cpu-cooler",
    categoryName: "CPU Cooler",
    subCategorySlugs: ["component", "cpu-cooler"],
    brandTaxonomy: "Deepcool",
    price: 7400,
    salePrice: 6900,
    availability: "in_stock",
    stockQuantity: 13,
    images: [
      {
        url: "/images/products/deepcool-ak620.png",
        alt: "DeepCool AK620 Dual-Tower CPU Cooler",
      },
    ],
    shortDescription: "High-value dual-tower cooler; D5 prevents scalar socket extraction from title.",
    explicitAttributes: [
      { key: "Cooler Sockets", value: "Socket AM5 / AM4 / LGA 1700" },
    ],
    customFields: [],
    warranty: "3 Years",
    isFlashDeal: true,
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "cooler-3",
    sku: "NZXT-COOL-KRAKEN240",
    title: "NZXT Kraken 240 RGB Liquid CPU Cooler",
    slug: "nzxt-kraken-240-rgb-cooler",
    categorySlug: "cpu-cooler",
    categoryName: "CPU Cooler",
    subCategorySlugs: ["component", "liquid-cooler"],
    brandTaxonomy: "NZXT",
    price: 18500,
    availability: "in_stock",
    stockQuantity: 4,
    images: [
      {
        url: "/images/products/nzxt-kraken-240.png",
        alt: "NZXT Kraken 240 RGB Liquid CPU Cooler",
      },
    ],
    shortDescription: "240mm AIO cooler with LCD screen (intentionally missing coolerSockets).",
    explicitAttributes: [{ key: "Radiator Size", value: "240 mm" }],
    customFields: [],
    warranty: "6 Years",
    createdAt: "2026-02-28T10:00:00Z",
  },
  {
    id: "cooler-4",
    sku: "ZZ-FAN-92",
    title: "Compact 92mm Aluminum Heatsink CPU Fan",
    slug: "compact-92mm-aluminum-heatsink-cpu-fan",
    categorySlug: "cpu-cooler",
    categoryName: "CPU Cooler",
    subCategorySlugs: ["component", "cpu-cooler"],
    // Placeholder brand ignored -> resolves to "Other"
    brandTaxonomy: "Generic",
    price: 850,
    availability: "in_stock",
    stockQuantity: 25,
    images: [
      {
        url: "/images/products/generic-cooler.png",
        alt: "Compact 92mm Aluminum Heatsink CPU Fan",
      },
    ],
    shortDescription: "Unbranded replacement heatsink fan (missing coolerSockets).",
    explicitAttributes: [],
    customFields: [],
    createdAt: "2025-12-10T10:00:00Z",
  },

  // ===================== STORAGE (3) =====================
  {
    id: "ssd-1",
    sku: "SAM-SSD-990PRO-1TB",
    title: "Samsung 990 PRO 1TB PCIe 4.0 NVMe M.2 SSD",
    slug: "samsung-990-pro-1tb-nvme-ssd",
    categorySlug: "storage",
    categoryName: "Storage",
    subCategorySlugs: ["component", "nvme-ssd"],
    brandTaxonomy: "SAMSUNG",
    price: 14200,
    salePrice: 13400,
    availability: "in_stock",
    stockQuantity: 16,
    images: [
      {
        url: "/images/products/samsung-990-pro.png",
        alt: "Samsung 990 PRO 1TB NVMe M.2 SSD",
      },
    ],
    shortDescription: "Flagship Gen4 NVMe SSD up to 7450 MB/s read speed.",
    explicitAttributes: [
      { key: "pa_storage-interface", value: "NVMe PCIe Gen4 x4" },
    ],
    customFields: [],
    warranty: "5 Years",
    isFeatured: true,
    createdAt: "2026-03-17T10:00:00Z",
  },
  {
    id: "ssd-2",
    sku: "WD-SSD-SN850X-2TB",
    title: "WD_BLACK SN850X 2TB Internal Gaming SSD",
    slug: "wd-black-sn850x-2tb-ssd",
    categorySlug: "storage",
    categoryName: "Storage",
    subCategorySlugs: ["component", "ssd"],
    brandTaxonomy: "WD_BLACK",
    price: 23500,
    availability: "in_stock",
    stockQuantity: 7,
    images: [
      {
        url: "/images/products/wd-sn850x.png",
        alt: "WD_BLACK SN850X 2TB Gaming SSD",
      },
    ],
    shortDescription: "2TB high-speed SSD with interface parsed from description spec table.",
    descriptionHtml:
      "<table><tr><th>Storage Interface</th><td>M.2 NVMe</td></tr><tr><th>Capacity</th><td>2TB</td></tr></table>",
    explicitAttributes: [],
    customFields: [],
    warranty: "5 Years",
    createdAt: "2026-03-09T10:00:00Z",
  },
  {
    id: "ssd-3",
    sku: "KNG-SSD-A400-480G",
    title: "Kingston A400 480GB 2.5-inch Solid State Drive",
    slug: "kingston-a400-480gb-sata-ssd",
    categorySlug: "storage",
    categoryName: "Storage",
    subCategorySlugs: ["component", "ssd"],
    brandTaxonomy: "KINGSTON",
    price: 4600,
    availability: "in_stock",
    stockQuantity: 22,
    images: [
      {
        url: "/images/products/kingston-a400.png",
        alt: "Kingston A400 480GB SATA SSD",
      },
    ],
    shortDescription: "Reliable 2.5-inch SATA III upgrade drive.",
    explicitAttributes: [{ key: "SATA Interface", value: "SATA 3" }],
    customFields: [],
    warranty: "3 Years",
    createdAt: "2026-02-15T10:00:00Z",
  },

  // ===================== RAM (2) =====================
  {
    id: "ram-1",
    sku: "COR-RAM-VENG-32G",
    title: "Corsair Vengeance 32GB (2x16GB) DDR5 Desktop Memory",
    slug: "corsair-vengeance-32gb-ddr5-6000",
    categorySlug: "ram",
    categoryName: "Desktop RAM",
    subCategorySlugs: ["component", "desktop-ram"],
    brandTaxonomy: "Corsair",
    price: 15800,
    availability: "in_stock",
    stockQuantity: 14,
    images: [
      {
        url: "/images/products/corsair-vengeance-ddr5.png",
        alt: "Corsair Vengeance 32GB DDR5 RAM",
      },
    ],
    shortDescription: "High-frequency DDR5-6000 desktop memory kit.",
    explicitAttributes: [
      { key: "pa_memory-type", value: "DDR5-6000" },
      { key: "CAS Latency", value: "CL30" },
    ],
    customFields: [],
    warranty: "Lifetime",
    createdAt: "2026-03-11T12:00:00Z",
  },
  {
    id: "ram-2",
    sku: "GSK-RAM-TRIDENT-32G",
    title: "G.SKILL Trident Z5 RGB 32GB DDR5-6400 Desktop RAM",
    slug: "gskill-trident-z5-rgb-32gb-ddr5",
    categorySlug: "ram",
    categoryName: "Desktop RAM",
    subCategorySlugs: ["component", "desktop-ram"],
    brandTaxonomy: "G.SKILL",
    price: 17900,
    availability: "in_stock",
    stockQuantity: 9,
    images: [
      {
        url: "/images/products/gskill-trident-z5.png",
        alt: "G.SKILL Trident Z5 RGB 32GB DDR5 RAM",
      },
    ],
    shortDescription: "DDR5 memory type parsed from title token DDR5-6400 (D1).",
    explicitAttributes: [],
    customFields: [],
    warranty: "Lifetime",
    createdAt: "2026-03-10T12:00:00Z",
  },

  // ===================== MONITORS & PERIPHERALS (4) =====================
  {
    id: "mon-1",
    sku: "LG-MON-27GP850",
    title: "LG UltraGear 27GP850-B 27-inch QHD 165Hz Nano IPS Monitor",
    slug: "lg-ultragear-27gp850-27-inch-monitor",
    categorySlug: "monitor",
    categoryName: "Monitor",
    subCategorySlugs: ["monitor", "gaming-monitor"],
    brandTaxonomy: "LG UltraGear",
    price: 44500,
    salePrice: 41900,
    availability: "in_stock",
    stockQuantity: 5,
    images: [
      {
        url: "/images/products/lg-27gp850.png",
        alt: "LG UltraGear 27GP850-B Monitor",
      },
    ],
    shortDescription: "27-inch 1440p Nano IPS gaming monitor with 1ms response time.",
    explicitAttributes: [
      { key: "Refresh Rate", value: "165Hz" },
      { key: "Panel Type", value: "Nano IPS" },
    ],
    customFields: [],
    warranty: "3 Years",
    isFeatured: true,
    isFlashDeal: true,
    createdAt: "2026-03-02T12:00:00Z",
  },
  {
    id: "mon-2",
    sku: "ASU-MON-VG27AQ",
    title: "ASUS TUF Gaming VG27AQ 27-inch WQHD IPS Monitor",
    slug: "asus-tuf-gaming-vg27aq-monitor",
    categorySlug: "monitor",
    categoryName: "Monitor",
    subCategorySlugs: ["monitor", "gaming-monitor"],
    brandTaxonomy: "ASUS TUF",
    price: 38500,
    availability: "in_stock",
    stockQuantity: 8,
    images: [
      {
        url: "/images/products/asus-vg27aq.png",
        alt: "ASUS TUF Gaming VG27AQ Monitor",
      },
    ],
    shortDescription: "27-inch 1440p G-SYNC compatible IPS gaming display.",
    explicitAttributes: [{ key: "Refresh Rate", value: "165Hz" }],
    customFields: [],
    warranty: "3 Years",
    createdAt: "2026-02-22T12:00:00Z",
  },
  {
    id: "kb-1",
    sku: "LOG-KB-GPROX",
    title: "Logitech G PRO X TKL Lightspeed Mechanical Gaming Keyboard",
    slug: "logitech-g-pro-x-tkl-keyboard",
    categorySlug: "keyboard",
    categoryName: "Keyboard",
    subCategorySlugs: ["accessories", "mechanical-keyboard"],
    brandTaxonomy: "Logitech G",
    price: 21500,
    availability: "in_stock",
    stockQuantity: 10,
    images: [
      {
        url: "/images/products/logitech-g-pro-x.png",
        alt: "Logitech G PRO X TKL Keyboard",
      },
    ],
    shortDescription: "Tenkeyless wireless mechanical gaming keyboard.",
    explicitAttributes: [{ key: "Switch Type", value: "Tactile" }],
    customFields: [],
    warranty: "2 Years",
    createdAt: "2026-02-18T12:00:00Z",
  },
  {
    id: "ms-1",
    sku: "LOG-MS-SUPERLIGHT",
    title: "Logitech G PRO X SUPERLIGHT 2 Wireless Gaming Mouse",
    slug: "logitech-g-pro-x-superlight-2-mouse",
    categorySlug: "mouse",
    categoryName: "Mouse",
    subCategorySlugs: ["accessories", "gaming-mouse"],
    brandTaxonomy: "LOGITECH",
    price: 16900,
    salePrice: 15800,
    availability: "in_stock",
    stockQuantity: 12,
    images: [
      {
        url: "/images/products/logitech-superlight-2.png",
        alt: "Logitech G PRO X SUPERLIGHT 2 Mouse",
      },
    ],
    shortDescription: "60g ultralight wireless esports mouse with HERO 2 sensor.",
    explicitAttributes: [{ key: "Sensor DPI", value: "32000 DPI" }],
    customFields: [],
    warranty: "2 Years",
    isFlashDeal: true,
    createdAt: "2026-02-19T12:00:00Z",
  },
];

export interface MockCmsAdapterOptions {
  logUnmapped?: boolean;
  logger?: (message: string) => void;
}

export class MockCmsAdapter implements ICMSAdapter {
  readonly providerName = "mock" as const;
  private readonly options: MockCmsAdapterOptions;
  private normalizedProductsCache: Product[] | null = null;

  constructor(options: MockCmsAdapterOptions = {}) {
    this.options = options;
  }

  private getNormalizedProducts(): Product[] {
    if (this.normalizedProductsCache) {
      return this.normalizedProductsCache;
    }

    const brandConfigs = loadBrandConfigs();
    const overridesMap = loadSkuOverrides();
    this.normalizedProductsCache = normalizeRawProducts(RAW_MOCK_PRODUCTS, {
      brandConfigs,
      overridesMap,
      logUnmapped: this.options.logUnmapped,
      logger: this.options.logger,
    });
    return this.normalizedProductsCache;
  }

  async getCategories(): Promise<Category[]> {
    return buildCategoriesWithCounts(
      RAW_MOCK_CATEGORIES,
      this.getNormalizedProducts()
    );
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const categories = await this.getCategories();
    return categories.find((cat) => cat.slug === slug) ?? null;
  }

  async getAllProducts(): Promise<Product[]> {
    return [...this.getNormalizedProducts()];
  }

  async getProducts(query: CatalogQueryParams): Promise<CatalogQueryResult> {
    return queryProducts(this.getNormalizedProducts(), query);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    return (
      this.getNormalizedProducts().find((product) => product.slug === slug) ??
      null
    );
  }

  async getBrandsByCategory(categorySlug: string): Promise<Brand[]> {
    return getCategoryBrands(categorySlug, this.getNormalizedProducts(), {
      brandConfigs: loadBrandConfigs(),
    });
  }

  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    const products = this.getNormalizedProducts();
    const featured = products.filter((p) => p.isFeatured);
    return featured.slice(0, Math.max(0, limit));
  }

  async getFlashDeals(): Promise<Product[]> {
    return this.getNormalizedProducts().filter((product) => {
      const effective = getEffectivePrice(product);
      const hasDiscount =
        product.price !== undefined &&
        effective !== undefined &&
        effective < product.price;
      return Boolean(product.isFlashDeal) || hasDiscount;
    });
  }

  async getUnmappedAttributes(): Promise<UnmappedAttributeSummary[]> {
    return summarizeUnmappedAttributes(this.getNormalizedProducts());
  }
}
