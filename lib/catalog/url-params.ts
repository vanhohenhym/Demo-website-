import type { CatalogQueryParams } from "../cms/types.ts";

export const ALLOWED_LIMITS = [12, 24, 48, 96] as const;
export type AllowedLimit = (typeof ALLOWED_LIMITS)[number];
export const DEFAULT_LIMIT: AllowedLimit = 24;

export type RawSearchParams =
  | Record<string, string | string[] | undefined>
  | URLSearchParams;

type CatalogSort = NonNullable<CatalogQueryParams["sort"]>;

const VALID_SORTS = new Set<CatalogSort>([
  "price-asc",
  "price-desc",
  "newest",
  "name-asc",
]);

const NON_CANONICAL_PARAM_KEYS = [
  "price",
  "minPrice",
  "maxPrice",
  "brand",
  "availability",
  "socket",
  "ramType",
  "formFactor",
  "storageInterface",
  "q",
  "sort",
  "page",
  "limit",
] as const;

function readRawValues(rawParams: RawSearchParams, key: string): string[] {
  if (rawParams instanceof URLSearchParams) {
    return rawParams.getAll(key);
  }
  const value = rawParams[key];
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function readFirstTrimmed(
  rawParams: RawSearchParams,
  key: string
): string | undefined {
  const values = readRawValues(rawParams, key);
  for (const val of values) {
    const trimmed = val.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return undefined;
}

function parseListParam(
  rawParams: RawSearchParams,
  key: string,
  lowercase = false
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of readRawValues(rawParams, key)) {
    for (const part of raw.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) {
        continue;
      }
      const normalized = lowercase ? trimmed.toLowerCase() : trimmed;
      const dedupeKey = normalized.toLowerCase();
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        result.push(normalized);
      }
    }
  }

  return result;
}

function parseNonNegativeNumber(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
}

function clampLimit(raw: string | undefined, fallback?: number): AllowedLimit {
  const defaultVal: AllowedLimit =
    fallback !== undefined &&
    (ALLOWED_LIMITS as readonly number[]).includes(fallback)
      ? (fallback as AllowedLimit)
      : DEFAULT_LIMIT;

  if (!raw) {
    return defaultVal;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultVal;
  }

  if ((ALLOWED_LIMITS as readonly number[]).includes(parsed)) {
    return parsed as AllowedLimit;
  }

  let closest: AllowedLimit = ALLOWED_LIMITS[0];
  let smallestDiff = Math.abs(parsed - closest);
  for (const candidate of ALLOWED_LIMITS) {
    const diff = Math.abs(parsed - candidate);
    if (diff < smallestDiff) {
      closest = candidate;
      smallestDiff = diff;
    }
  }
  return closest;
}

function parsePage(raw: string | undefined, fallback?: number): number {
  const defaultPage = fallback !== undefined && fallback >= 1 ? Math.floor(fallback) : 1;
  if (!raw) {
    return defaultPage;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultPage;
  }
  return parsed;
}

/**
 * Parses URL search parameters into a normalized CatalogQueryParams object.
 */
export function parseCatalogSearchParams(
  rawParams: RawSearchParams,
  baseOverrides?: Partial<CatalogQueryParams>
): CatalogQueryParams {
  const category = baseOverrides?.category ?? "all";

  // Price: `price=min-max` and/or `minPrice`, `maxPrice`
  let minPrice = baseOverrides?.minPrice;
  let maxPrice = baseOverrides?.maxPrice;

  const priceRangeRaw = readFirstTrimmed(rawParams, "price");
  if (priceRangeRaw && priceRangeRaw.includes("-")) {
    const [minStr, maxStr] = priceRangeRaw.split("-", 2);
    const parsedMin = parseNonNegativeNumber(minStr?.trim());
    const parsedMax = parseNonNegativeNumber(maxStr?.trim());
    if (parsedMin !== undefined) {
      minPrice = parsedMin;
    }
    if (parsedMax !== undefined) {
      maxPrice = parsedMax;
    }
  }

  const explicitMin = parseNonNegativeNumber(readFirstTrimmed(rawParams, "minPrice"));
  if (explicitMin !== undefined) {
    minPrice = explicitMin;
  }
  const explicitMax = parseNonNegativeNumber(readFirstTrimmed(rawParams, "maxPrice"));
  if (explicitMax !== undefined) {
    maxPrice = explicitMax;
  }

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    const swappedMin = maxPrice;
    maxPrice = minPrice;
    minPrice = swappedMin;
  }

  // Multi-value filters
  const urlBrands = parseListParam(rawParams, "brand", true);
  const brands =
    urlBrands.length > 0
      ? urlBrands
      : baseOverrides?.brands && baseOverrides.brands.length > 0
        ? baseOverrides.brands
        : undefined;

  const urlSockets = parseListParam(rawParams, "socket");
  const sockets =
    urlSockets.length > 0 ? urlSockets : baseOverrides?.sockets;

  const urlRamTypes = parseListParam(rawParams, "ramType");
  const ramTypes =
    urlRamTypes.length > 0 ? urlRamTypes : baseOverrides?.ramTypes;

  const urlFormFactors = parseListParam(rawParams, "formFactor");
  const formFactors =
    urlFormFactors.length > 0 ? urlFormFactors : baseOverrides?.formFactors;

  const urlStorageInterfaces = parseListParam(rawParams, "storageInterface");
  const storageInterfaces =
    urlStorageInterfaces.length > 0
      ? urlStorageInterfaces
      : baseOverrides?.storageInterfaces;

  // Availability
  const rawAvailability = readFirstTrimmed(rawParams, "availability");
  const availability: CatalogQueryParams["availability"] =
    rawAvailability === "in-stock" || rawAvailability === "all"
      ? rawAvailability
      : baseOverrides?.availability;

  // Search query
  const rawQ = readFirstTrimmed(rawParams, "q");
  const q = rawQ ?? baseOverrides?.q;

  // Sort
  const rawSort = readFirstTrimmed(rawParams, "sort");
  const sort: CatalogQueryParams["sort"] =
    rawSort && VALID_SORTS.has(rawSort as CatalogSort)
      ? (rawSort as CatalogSort)
      : baseOverrides?.sort;

  // Pagination & limit
  const page = parsePage(readFirstTrimmed(rawParams, "page"), baseOverrides?.page);
  const limit = clampLimit(readFirstTrimmed(rawParams, "limit"), baseOverrides?.limit);

  // Builder mode
  const rawBuilder = readFirstTrimmed(rawParams, "builder");
  const builder: CatalogQueryParams["builder"] =
    rawBuilder === "1" ? "1" : baseOverrides?.builder;

  const rawSlot = readFirstTrimmed(rawParams, "slot");
  const slot = rawSlot ?? baseOverrides?.slot;

  const rawPrefilter = readFirstTrimmed(rawParams, "prefilter");
  const prefilter: CatalogQueryParams["prefilter"] =
    rawPrefilter === "1" ? "1" : baseOverrides?.prefilter;

  const result: CatalogQueryParams = {
    category,
    page,
    limit,
  };

  if (q !== undefined) result.q = q;
  if (baseOverrides?.brand !== undefined) {
    // Route-level brand segment always locks brand filter against ?brand= overrides
    result.brand = baseOverrides.brand;
  } else if (brands !== undefined) {
    result.brands = brands;
  }
  if (minPrice !== undefined) result.minPrice = minPrice;
  if (maxPrice !== undefined) result.maxPrice = maxPrice;
  if (sockets !== undefined) result.sockets = sockets;
  if (ramTypes !== undefined) result.ramTypes = ramTypes;
  if (formFactors !== undefined) result.formFactors = formFactors;
  if (storageInterfaces !== undefined) {
    result.storageInterfaces = storageInterfaces;
  }
  if (availability !== undefined) result.availability = availability;
  if (sort !== undefined) result.sort = sort;
  if (builder !== undefined) result.builder = builder;
  if (slot !== undefined) result.slot = slot;
  if (prefilter !== undefined) result.prefilter = prefilter;

  return result;
}

function normalizeDeterministicList(
  values: string[] | undefined,
  lowercase = false
): string[] {
  if (!values || values.length === 0) {
    return [];
  }
  const seen = new Map<string, string>();
  for (const val of values) {
    const trimmed = val.trim();
    if (!trimmed) continue;
    const normalized = lowercase ? trimmed.toLowerCase() : trimmed;
    seen.set(normalized.toLowerCase(), normalized);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

/**
 * Serializes non-default catalog query parameters deterministically onto `basePath`.
 */
export function buildCatalogUrl(
  basePath: string,
  nextParams: Partial<CatalogQueryParams>
): string {
  const cleanBase = basePath.split("?")[0] ?? basePath;
  const search = new URLSearchParams();

  const q = nextParams.q?.trim();
  if (q) {
    search.set("q", q);
  }

  if (nextParams.minPrice !== undefined || nextParams.maxPrice !== undefined) {
    const minPart =
      nextParams.minPrice !== undefined ? String(nextParams.minPrice) : "";
    const maxPart =
      nextParams.maxPrice !== undefined ? String(nextParams.maxPrice) : "";
    search.set("price", `${minPart}-${maxPart}`);
  }

  const brandList = normalizeDeterministicList(
    [
      ...(nextParams.brand ? [nextParams.brand] : []),
      ...(nextParams.brands ?? []),
    ],
    true
  );
  if (brandList.length > 0) {
    search.set("brand", brandList.join(","));
  }

  if (nextParams.availability === "in-stock") {
    search.set("availability", "in-stock");
  }

  const sockets = normalizeDeterministicList(nextParams.sockets);
  if (sockets.length > 0) {
    search.set("socket", sockets.join(","));
  }

  const ramTypes = normalizeDeterministicList(nextParams.ramTypes);
  if (ramTypes.length > 0) {
    search.set("ramType", ramTypes.join(","));
  }

  const formFactors = normalizeDeterministicList(nextParams.formFactors);
  if (formFactors.length > 0) {
    search.set("formFactor", formFactors.join(","));
  }

  const storageInterfaces = normalizeDeterministicList(
    nextParams.storageInterfaces
  );
  if (storageInterfaces.length > 0) {
    search.set("storageInterface", storageInterfaces.join(","));
  }

  if (nextParams.sort) {
    search.set("sort", nextParams.sort);
  }

  if (nextParams.limit !== undefined && nextParams.limit !== DEFAULT_LIMIT) {
    search.set("limit", String(nextParams.limit));
  }

  if (nextParams.page !== undefined && nextParams.page > 1) {
    search.set("page", String(nextParams.page));
  }

  if (nextParams.builder === "1") {
    search.set("builder", "1");
  }

  const slot = nextParams.slot?.trim();
  if (slot) {
    search.set("slot", slot);
  }

  if (nextParams.prefilter === "1") {
    search.set("prefilter", "1");
  }

  const queryString = search.toString();
  return queryString ? `${cleanBase}?${queryString}` : cleanBase;
}

/**
 * Returns true when any filter, sort, page, limit, or search query parameter is present.
 * Used by SEO metadata to emit canonical URLs and `noindex,follow`.
 */
export function hasNonCanonicalFilterParams(
  rawParams: RawSearchParams
): boolean {
  for (const key of NON_CANONICAL_PARAM_KEYS) {
    if (readFirstTrimmed(rawParams, key) !== undefined) {
      return true;
    }
  }
  return false;
}
