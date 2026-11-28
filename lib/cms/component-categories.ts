import type { RawCmsCategoryInput } from "./types.ts";

/**
 * Component navigation entry mirroring the Component category dropdown and strip.
 */
export interface ComponentNavItem {
  name: string;
  slug: string;
  hasChildren?: boolean;
  parentSlug?: string;
  description?: string;
  icon?: string;
}

/**
 * Canonical ordered list of PC Component sub-categories shown in the Header
 * Component dropdown, `/category/component` sub-category bar, and CMS seeding.
 */
export const COMPONENT_SUBCATEGORIES: readonly ComponentNavItem[] = [
  {
    name: "Processor",
    slug: "processor",
    hasChildren: true,
    parentSlug: "component",
    description: "Desktop processors from AMD Ryzen and Intel Core series.",
    icon: "Microchip",
  },
  {
    name: "CPU Cooler",
    slug: "cpu-cooler",
    hasChildren: true,
    parentSlug: "component",
    description: "Air tower coolers and all-in-one liquid coolers for desktop CPUs.",
    icon: "Fan",
  },
  {
    name: "Motherboard",
    slug: "motherboard",
    hasChildren: true,
    parentSlug: "component",
    description: "AMD AM5, AM4, and Intel LGA1700 motherboards for desktop PC builds.",
    icon: "Cpu",
  },
  {
    name: "Graphics Card",
    slug: "graphics-card",
    hasChildren: true,
    parentSlug: "component",
    description: "Gaming and workstation GPUs for high-frame-rate and creative workloads.",
    icon: "MonitorPlay",
  },
  {
    name: "RAM (Desktop)",
    slug: "ram-desktop",
    hasChildren: true,
    parentSlug: "component",
    description: "High-speed DDR5 and DDR4 desktop memory kits.",
    icon: "MemoryStick",
  },
  {
    name: "RAM (Laptop)",
    slug: "ram-laptop",
    hasChildren: true,
    parentSlug: "component",
    description: "SO-DIMM DDR4 and DDR5 laptop memory modules.",
    icon: "MemoryStick",
  },
  {
    name: "Power Supply",
    slug: "power-supply",
    hasChildren: true,
    parentSlug: "component",
    description: "80+ certified modular and non-modular desktop power supply units.",
    icon: "Zap",
  },
  {
    name: "Hard Disk Drive",
    slug: "hard-disk-drive",
    hasChildren: true,
    parentSlug: "component",
    description: "Internal 3.5-inch SATA desktop and NAS hard disk drives.",
    icon: "HardDrive",
  },
  {
    name: "Portable Hard Disk Drive",
    slug: "portable-hard-disk-drive",
    hasChildren: true,
    parentSlug: "component",
    description: "External USB portable hard disk drives for backup and travel.",
    icon: "HardDrive",
  },
  {
    name: "SSD",
    slug: "ssd",
    hasChildren: true,
    parentSlug: "component",
    description: "Internal M.2 NVMe PCIe and 2.5-inch SATA solid-state drives.",
    icon: "HardDrive",
  },
  {
    name: "Portable SSD",
    slug: "portable-ssd",
    hasChildren: true,
    parentSlug: "component",
    description: "High-speed external USB-C portable solid-state drives.",
    icon: "HardDrive",
  },
  {
    name: "Casing",
    slug: "casing",
    hasChildren: true,
    parentSlug: "component",
    description: "Airflow mid-tower, full-tower, and compact desktop PC cases.",
    icon: "Box",
  },
  {
    name: "Casing Cooler",
    slug: "casing-cooler",
    hasChildren: true,
    parentSlug: "component",
    description: "PWM and ARGB chassis cooling fans for desktop PC cases.",
    icon: "Fan",
  },
  {
    name: "Optical Disk Drive",
    slug: "optical-disk-drive",
    hasChildren: false,
    parentSlug: "component",
    description: "Internal and external DVD and Blu-ray optical disk drives.",
    icon: "Disc",
  },
  {
    name: "Vertical GPU Holder",
    slug: "vertical-gpu-holder",
    hasChildren: false,
    parentSlug: "component",
    description: "Vertical GPU mounting brackets and PCIe riser kits.",
    icon: "Layers",
  },
  {
    name: "Water / Liquid Cooling",
    slug: "water-liquid-cooling",
    hasChildren: false,
    parentSlug: "component",
    description: "All-in-one and custom liquid cooling loops and radiators.",
    icon: "Fan",
  },
];

/**
 * Full ordered list for Header dropdown and `/category/component` strip,
 * ending with "Show All Component".
 */
export const COMPONENT_MENU_ITEMS: readonly ComponentNavItem[] = [
  ...COMPONENT_SUBCATEGORIES,
  {
    name: "Show All Component",
    slug: "component",
    hasChildren: false,
  },
];

export const COMPONENT_SUBCATEGORY_SLUGS: ReadonlySet<string> = new Set(
  COMPONENT_SUBCATEGORIES.map((item) => item.slug)
);

const COMPONENT_LABEL_MAP: ReadonlyMap<string, string> = new Map(
  COMPONENT_SUBCATEGORIES.map((item) => [item.slug, item.name])
);

/**
 * Resolves exact display label for a Component sub-category slug (e.g. `ram-desktop` -> `RAM (Desktop)`).
 */
export function resolveComponentCategoryLabel(slug: string): string | undefined {
  return COMPONENT_LABEL_MAP.get(slug.trim().toLowerCase());
}

/**
 * Builds seed category records for any Component sub-categories missing from raw CMS seeds.
 */
export function buildMissingComponentSeedCategories(
  existingSlugs: ReadonlySet<string>
): RawCmsCategoryInput[] {
  const missing: RawCmsCategoryInput[] = [];
  for (const item of COMPONENT_SUBCATEGORIES) {
    if (!existingSlugs.has(item.slug)) {
      missing.push({
        id: `cat-${item.slug}`,
        name: item.name,
        slug: item.slug,
        description: item.description,
        icon: item.icon,
        parentSlug: item.parentSlug,
      });
    }
  }
  return missing;
}
