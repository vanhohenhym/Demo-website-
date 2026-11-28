import type {
  CatalogQueryParams,
  CatalogQueryResult,
  ComponentType,
  FacetGroup,
  FacetValue,
  Product,
  UnmappedAttributeSummary,
} from "./types.ts";
import { COMPONENT_SUBCATEGORY_SLUGS } from "./component-categories.ts";

export function getEffectivePrice(product: Product): number | undefined {
  if (product.price === undefined) {
    return undefined;
  }
  if (
    product.salePrice !== undefined &&
    product.salePrice > 0 &&
    product.salePrice < product.price
  ) {
    return product.salePrice;
  }
  return product.price;
}

function toLowerSet(values?: string[]): Set<string> {
  const result = new Set<string>();
  if (!values) {
    return result;
  }
  for (const v of values) {
    const trimmed = v.trim().toLowerCase();
    if (trimmed) {
      result.add(trimmed);
    }
  }
  return result;
}

function buildBrandFacet(
  products: Product[],
  selectedBrands: Set<string>
): FacetGroup | null {
  const counts = new Map<string, { label: string; count: number }>();

  for (const product of products) {
    const existing = counts.get(product.brandSlug);
    if (existing) {
      existing.count += 1;
      existing.label = product.brand;
    } else {
      counts.set(product.brandSlug, { label: product.brand, count: 1 });
    }
  }

  const values: FacetValue[] = [];
  let otherEntry: FacetValue | null = null;

  const sortedSlugs = Array.from(counts.keys()).sort((a, b) =>
    a.localeCompare(b)
  );
  for (const slug of sortedSlugs) {
    const entry = counts.get(slug);
    if (!entry || entry.count === 0) {
      continue;
    }
    const facetVal: FacetValue = {
      value: slug,
      label: entry.label,
      count: entry.count,
      selected: selectedBrands.has(slug),
    };
    if (slug === "other") {
      otherEntry = facetVal;
    } else {
      values.push(facetVal);
    }
  }

  if (otherEntry && otherEntry.count > 0) {
    values.push(otherEntry);
  }

  if (values.length === 0) {
    return null;
  }

  return {
    key: "brand",
    title: "Brand",
    type: "checkbox",
    values,
  };
}

function buildPriceFacet(products: Product[]): FacetGroup | null {
  const prices: number[] = [];
  for (const product of products) {
    const eff = getEffectivePrice(product);
    if (eff !== undefined) {
      prices.push(eff);
    }
  }

  if (prices.length === 0) {
    return null;
  }

  return {
    key: "price",
    title: "Price Range",
    type: "range",
    values: [],
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

type AttributeFacetKey = "socket" | "ramType" | "formFactor" | "storageInterface";

function getProductAttributeValues(
  product: Product,
  key: AttributeFacetKey
): string[] {
  const values = new Set<string>();
  const direct = product.attributes[key];
  if (direct && typeof direct.value === "string" && direct.value.trim()) {
    values.add(direct.value.trim());
  }

  if (key === "socket" && values.size === 0) {
    const coolerSockets = product.attributes.coolerSockets?.value;
    if (Array.isArray(coolerSockets)) {
      for (const s of coolerSockets) {
        if (typeof s === "string" && s.trim()) {
          values.add(s.trim());
        }
      }
    }
  }

  if (key === "storageInterface") {
    const multi = product.attributes.storageInterfaces?.value;
    if (Array.isArray(multi)) {
      for (const iface of multi) {
        if (typeof iface === "string" && iface.trim()) {
          values.add(iface.trim());
        }
      }
    }
  }

  return Array.from(values);
}

function buildTextAttributeFacet(
  products: Product[],
  key: AttributeFacetKey,
  title: string,
  selectedValues: Set<string>
): FacetGroup | null {
  const counts = new Map<string, number>();

  for (const product of products) {
    for (const val of getProductAttributeValues(product, key)) {
      counts.set(val, (counts.get(val) ?? 0) + 1);
    }
  }

  const values: FacetValue[] = Array.from(counts.entries())
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({
      value,
      label: value,
      count,
      selected: selectedValues.has(value.toLowerCase()),
    }));

  if (values.length === 0) {
    return null;
  }

  return {
    key,
    title,
    type: "checkbox",
    values,
  };
}

function buildAvailabilityFacet(
  products: Product[],
  selectedAvailability?: "in-stock" | "all"
): FacetGroup | null {
  const inStockCount = products.filter(
    (p) => p.availability === "in_stock"
  ).length;
  const values: FacetValue[] = [
    {
      value: "all",
      label: "All Products",
      count: products.length,
      selected: selectedAvailability !== "in-stock",
    },
    {
      value: "in-stock",
      label: "In Stock Only",
      count: inStockCount,
      selected: selectedAvailability === "in-stock",
    },
  ].filter((v) => v.count > 0);

  if (values.length === 0) {
    return null;
  }

  return {
    key: "availability",
    title: "Availability",
    type: "radio",
    values,
  };
}

const COMPONENT_PARENT_TYPES: ReadonlySet<ComponentType> = new Set([
  "cpu",
  "motherboard",
  "ram",
  "gpu",
  "storage",
  "psu",
  "case",
  "cooler",
]);

const ACCESSORIES_PARENT_TYPES: ReadonlySet<ComponentType> = new Set([
  "keyboard",
  "mouse",
  "other",
]);

const GAMING_PARENT_TYPES: ReadonlySet<ComponentType> = new Set([
  "gpu",
  "monitor",
  "keyboard",
  "mouse",
]);

function hasExplicitSubSlug(product: Product, targetSlug: string): boolean {
  return Boolean(
    product.subCategorySlugs?.some(
      (sub) => sub.trim().toLowerCase() === targetSlug
    )
  );
}

function hasProductKeyword(product: Product, pattern: RegExp): boolean {
  const candidates: string[] = [
    product.name,
    product.categorySlug,
    ...(product.subCategorySlugs ?? []),
    product.attributes.formFactor?.value ?? "",
    ...(product.attributes.storageInterfaces?.value ?? []),
  ];
  return candidates.some((text) => pattern.test(text));
}

function isLaptopRamProduct(product: Product): boolean {
  return (
    product.categorySlug.trim().toLowerCase() === "ram-laptop" ||
    product.categorySlug.trim().toLowerCase() === "laptop-ram" ||
    hasExplicitSubSlug(product, "ram-laptop") ||
    hasProductKeyword(product, /\b(laptop|so-?dimm|sodimm|notebook)\b/i)
  );
}

function isPortableStorageProduct(product: Product): boolean {
  return hasProductKeyword(product, /\b(portable|external)\b|usb-?c/i);
}

function isHddProduct(product: Product): boolean {
  return hasProductKeyword(
    product,
    /\b(hdd|hard disk|hard drive|7200\s*rpm|5400\s*rpm)\b/i
  );
}

/**
 * Matches a normalized product against a category slug, supporting direct category/componentType/subCategorySlugs
 * matches as well as top-level parent/group categories across catalog queries, counts, and brand projection.
 */
export function matchesCategorySlug(
  product: Product,
  categorySlug: string
): boolean {
  const slug = categorySlug.trim().toLowerCase();
  if (!slug || slug === "all") {
    return true;
  }

  const productCategorySlug = product.categorySlug.trim().toLowerCase();
  if (
    productCategorySlug === slug ||
    product.componentType.trim().toLowerCase() === slug ||
    hasExplicitSubSlug(product, slug)
  ) {
    return true;
  }

  switch (slug) {
    case "component":
      return (
        COMPONENT_PARENT_TYPES.has(product.componentType) ||
        COMPONENT_SUBCATEGORY_SLUGS.has(productCategorySlug) ||
        Boolean(
          product.subCategorySlugs?.some((sub) =>
            COMPONENT_SUBCATEGORY_SLUGS.has(sub.trim().toLowerCase())
          )
        )
      );
    case "processor":
      return product.componentType === "cpu" || productCategorySlug === "cpu";
    case "graphics-card":
      return product.componentType === "gpu" || productCategorySlug === "gpu";
    case "power-supply":
      return product.componentType === "psu" || productCategorySlug === "psu";
    case "casing":
      return product.componentType === "case" || productCategorySlug === "case";
    case "cpu-cooler":
      return (
        product.componentType === "cooler" &&
        productCategorySlug !== "casing-cooler" &&
        !hasExplicitSubSlug(product, "casing-cooler")
      );
    case "water-liquid-cooling":
      return (
        product.componentType === "cooler" &&
        hasProductKeyword(product, /\b(liquid|water|aio)\b/i)
      );
    case "ram-desktop":
      return product.componentType === "ram" && !isLaptopRamProduct(product);
    case "ram-laptop":
      return product.componentType === "ram" && isLaptopRamProduct(product);
    case "ssd":
      return (
        product.componentType === "storage" &&
        productCategorySlug !== "portable-ssd" &&
        productCategorySlug !== "hard-disk-drive" &&
        productCategorySlug !== "portable-hard-disk-drive" &&
        productCategorySlug !== "hdd" &&
        !hasExplicitSubSlug(product, "portable-ssd") &&
        !hasExplicitSubSlug(product, "hard-disk-drive") &&
        !hasExplicitSubSlug(product, "portable-hard-disk-drive") &&
        !isPortableStorageProduct(product) &&
        !isHddProduct(product)
      );
    case "portable-ssd":
      return (
        product.componentType === "storage" &&
        productCategorySlug !== "hard-disk-drive" &&
        productCategorySlug !== "portable-hard-disk-drive" &&
        productCategorySlug !== "hdd" &&
        isPortableStorageProduct(product) &&
        !isHddProduct(product)
      );
    case "hard-disk-drive":
      return (
        productCategorySlug === "hdd" ||
        (product.componentType === "storage" &&
          productCategorySlug !== "portable-hard-disk-drive" &&
          !hasExplicitSubSlug(product, "portable-hard-disk-drive") &&
          isHddProduct(product) &&
          !isPortableStorageProduct(product))
      );
    case "portable-hard-disk-drive":
      return (
        product.componentType === "storage" &&
        isHddProduct(product) &&
        isPortableStorageProduct(product)
      );
    case "power":
      return (
        product.componentType === "psu" ||
        productCategorySlug === "power-supply"
      );
    case "accessories":
      return ACCESSORIES_PARENT_TYPES.has(product.componentType);
    case "gaming":
      return (
        Boolean(product.isFlashDeal) ||
        GAMING_PARENT_TYPES.has(product.componentType)
      );
    case "server-storage":
      return product.componentType === "storage";
    default:
      return false;
  }
}

/**
 * Shared filtering, sorting, pagination, and facet builder used by all CMS adapters.
 */
export function queryProducts(
  allProducts: Product[],
  query: CatalogQueryParams
): CatalogQueryResult {
  const slotComponentType =
    query.builder === "1" && query.slot
      ? query.slot === "others"
        ? "other"
        : query.slot
      : undefined;

  // Base scope: category (with shared parent-category matching) and optional builder slot filter
  const categoryScope = allProducts.filter((product) => {
    if (query.category && !matchesCategorySlug(product, query.category)) {
      return false;
    }
    if (slotComponentType && product.componentType !== slotComponentType) {
      return false;
    }
    return true;
  });

  const selectedBrands = toLowerSet(query.brands);
  if (query.brand && query.brand.trim()) {
    selectedBrands.add(query.brand.trim().toLowerCase());
  }

  const selectedSockets = toLowerSet(query.sockets);
  const selectedRamTypes = toLowerSet(query.ramTypes);
  const selectedFormFactors = toLowerSet(query.formFactors);
  const selectedStorageInterfaces = toLowerSet(query.storageInterfaces);

  const searchTokens = (query.q ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  // Compute facets against the category scope (suppressing 0-count options & empty groups)
  const facets: FacetGroup[] = [];

  const brandFacet = buildBrandFacet(categoryScope, selectedBrands);
  if (brandFacet) {
    facets.push(brandFacet);
  }

  const availabilityFacet = buildAvailabilityFacet(
    categoryScope,
    query.availability
  );
  if (availabilityFacet) {
    facets.push(availabilityFacet);
  }

  const priceFacet = buildPriceFacet(categoryScope);
  if (priceFacet) {
    facets.push(priceFacet);
  }

  const attributeFacets: Array<[AttributeFacetKey, string, Set<string>]> = [
    ["socket", "Socket", selectedSockets],
    ["ramType", "RAM Type", selectedRamTypes],
    ["formFactor", "Form Factor", selectedFormFactors],
    ["storageInterface", "Storage Interface", selectedStorageInterfaces],
  ];

  for (const [attrKey, title, selectedSet] of attributeFacets) {
    const group = buildTextAttributeFacet(
      categoryScope,
      attrKey,
      title,
      selectedSet
    );
    if (group) {
      facets.push(group);
    }
  }

  // Apply active filters
  const filtered = categoryScope.filter((product) => {
    if (selectedBrands.size > 0 && !selectedBrands.has(product.brandSlug)) {
      return false;
    }

    if (query.availability === "in-stock" && product.availability !== "in_stock") {
      return false;
    }

    const effPrice = getEffectivePrice(product);
    if (query.minPrice !== undefined) {
      if (effPrice === undefined || effPrice < query.minPrice) {
        return false;
      }
    }
    if (query.maxPrice !== undefined) {
      if (effPrice === undefined || effPrice > query.maxPrice) {
        return false;
      }
    }

    if (searchTokens.length > 0) {
      const haystack = [
        product.name,
        product.sku,
        product.brand,
        product.categoryName,
        product.shortDescription ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!searchTokens.every((token) => haystack.includes(token))) {
        return false;
      }
    }

    if (selectedSockets.size > 0) {
      const vals = getProductAttributeValues(product, "socket");
      if (!vals.some((v) => selectedSockets.has(v.toLowerCase()))) {
        return false;
      }
    }

    if (selectedRamTypes.size > 0) {
      const vals = getProductAttributeValues(product, "ramType");
      if (!vals.some((v) => selectedRamTypes.has(v.toLowerCase()))) {
        return false;
      }
    }

    if (selectedFormFactors.size > 0) {
      const vals = getProductAttributeValues(product, "formFactor");
      if (!vals.some((v) => selectedFormFactors.has(v.toLowerCase()))) {
        return false;
      }
    }

    if (selectedStorageInterfaces.size > 0) {
      const vals = getProductAttributeValues(product, "storageInterface");
      if (!vals.some((v) => selectedStorageInterfaces.has(v.toLowerCase()))) {
        return false;
      }
    }

    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case "price-asc": {
        const pa = getEffectivePrice(a);
        const pb = getEffectivePrice(b);
        if (pa === undefined && pb === undefined) return a.name.localeCompare(b.name);
        if (pa === undefined) return 1;
        if (pb === undefined) return -1;
        return pa - pb;
      }
      case "price-desc": {
        const pa = getEffectivePrice(a);
        const pb = getEffectivePrice(b);
        if (pa === undefined && pb === undefined) return a.name.localeCompare(b.name);
        if (pa === undefined) return 1;
        if (pb === undefined) return -1;
        return pb - pa;
      }
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "newest": {
        const da = a.createdAt ? Date.parse(a.createdAt) : 0;
        const db = b.createdAt ? Date.parse(b.createdAt) : 0;
        if (db !== da) return db - da;
        return a.name.localeCompare(b.name);
      }
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Paginate
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.max(1, query.limit ?? 24);
  const start = (page - 1) * limit;
  const paginated = sorted.slice(start, start + limit);

  return {
    products: paginated,
    total: sorted.length,
    facets,
  };
}

/**
 * Aggregates all unmapped CMS attribute names discovered across normalized products.
 */
export function summarizeUnmappedAttributes(
  products: Product[]
): UnmappedAttributeSummary[] {
  const byName = new Map<
    string,
    { count: number; sampleProductIds: string[]; sampleValues: string[] }
  >();

  for (const product of products) {
    const unmapped = product.unmappedAttributes ?? {};
    const names = new Set<string>([
      ...Object.keys(unmapped),
      ...(product.audit?.unmappedAttributeNames ?? []),
    ]);

    for (const name of names) {
      const entry = byName.get(name) ?? {
        count: 0,
        sampleProductIds: [],
        sampleValues: [],
      };
      entry.count += 1;
      if (entry.sampleProductIds.length < 5) {
        entry.sampleProductIds.push(product.id);
      }
      const val = unmapped[name];
      if (
        val !== undefined &&
        entry.sampleValues.length < 5 &&
        !entry.sampleValues.includes(val)
      ) {
        entry.sampleValues.push(val);
      }
      byName.set(name, entry);
    }
  }

  return Array.from(byName.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([attributeName, data]) => ({
      attributeName,
      count: data.count,
      sampleProductIds: data.sampleProductIds,
      sampleValues: data.sampleValues,
    }));
}
