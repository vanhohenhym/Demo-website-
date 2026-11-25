import {
  brandVisibility,
  resolveBrand,
  type BrandConfig,
  type RawCmsProduct,
} from "../../logic/index.ts";
import { loadBrandConfigs } from "../config-loader.ts";
import { matchesCategorySlug } from "../query-engine.ts";
import {
  toCatalogProduct,
  type Brand,
  type BrandEnrichmentConfig,
  type Product,
  type RawAdapterProduct,
} from "../types.ts";

export const DEFAULT_MIN_BRAND_PRODUCTS = 1;
export const DEFAULT_INDEX_MIN_PRODUCTS = 3;

function parsePositiveIntEnv(
  envValue: string | undefined,
  fallback: number
): number {
  if (!envValue) {
    return fallback;
  }
  const parsed = Number.parseInt(envValue, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

function toLogicBrandConfigs(
  configs: readonly BrandEnrichmentConfig[]
): BrandConfig[] {
  return configs.map((cfg) => ({
    name: cfg.name,
    slug: cfg.slug,
    aliases: cfg.aliases,
    skuPrefixes: cfg.skuPrefixes,
  }));
}

export interface ResolvedProductBrand {
  brand: string;
  brandSlug: string;
  rawBrandInput?: string;
}

/**
 * Resolves a product's canonical brand name & slug via `lib/logic/resolveBrand`,
 * using the enrichment alias & SKU-prefix rules from `data/brands.json`.
 */
export function resolveProductBrand(
  raw: RawAdapterProduct,
  brandConfigs?: readonly BrandEnrichmentConfig[]
): ResolvedProductBrand {
  const configs = brandConfigs ?? loadBrandConfigs();

  const logicProduct: RawCmsProduct = {
    id: raw.id,
    title: raw.title,
    sku: raw.sku,
    categorySlug: raw.categorySlug,
    componentType: raw.explicitComponentType,
    brandTaxonomy: raw.brandTaxonomy,
    explicitAttributes: raw.explicitAttributes,
    customFields: raw.customFields,
    descriptionSpecs: raw.descriptionSpecs ?? [],
    skuOverrides: [],
  };

  const resolved = resolveBrand(logicProduct, toLogicBrandConfigs(configs));

  const explicitBrandAttr = raw.explicitAttributes.find(
    (pair) => pair.key.trim().toLowerCase() === "brand"
  )?.value;
  const customBrandAttr = raw.customFields.find(
    (pair) => pair.key.trim().toLowerCase() === "brand"
  )?.value;

  return {
    brand: resolved.brand,
    brandSlug: resolved.brandSlug,
    rawBrandInput: raw.brandTaxonomy ?? explicitBrandAttr ?? customBrandAttr,
  };
}

export interface GetCategoryBrandsOptions {
  brandConfigs?: readonly BrandEnrichmentConfig[];
  minBrandProducts?: number;
  indexMinProducts?: number;
}

/**
 * Computes visible & indexable brands for a single category using `lib/logic/brandVisibility`,
 * enriched with logos, aliases, skuPrefixes, featured flags, and display order from `data/brands.json`.
 * "Other" is always placed last (only when it has >= minBrandProducts) and is never indexable.
 */
export function getCategoryBrands(
  categorySlug: string,
  products: readonly Product[],
  options: GetCategoryBrandsOptions = {}
): Brand[] {
  const configs = options.brandConfigs ?? loadBrandConfigs();
  const minBrandProducts =
    options.minBrandProducts ??
    parsePositiveIntEnv(
      process.env.MIN_BRAND_PRODUCTS,
      DEFAULT_MIN_BRAND_PRODUCTS
    );
  const indexMinProducts =
    options.indexMinProducts ??
    parsePositiveIntEnv(
      process.env.INDEX_MIN_PRODUCTS,
      DEFAULT_INDEX_MIN_PRODUCTS
    );

  const catalogProducts = products
    .filter((product) => matchesCategorySlug(product, categorySlug))
    .map((product) => ({
      ...toCatalogProduct(product, false),
      categorySlug,
    }));
  const visibility = brandVisibility({
    categorySlug,
    products: catalogProducts,
    minBrandProducts,
    indexMinProducts,
  });

  const enrichmentBySlug = new Map<string, BrandEnrichmentConfig>();
  for (const cfg of configs) {
    enrichmentBySlug.set(cfg.slug.toLowerCase(), cfg);
  }

  return visibility.brands.map((item) => {
    const enrichment = enrichmentBySlug.get(item.brandSlug.toLowerCase());
    return {
      name: item.brand,
      slug: item.brandSlug,
      logo: enrichment?.logo,
      aliases: enrichment?.aliases ?? [],
      skuPrefixes: enrichment?.skuPrefixes ?? [],
      productCount: item.count,
      featured: enrichment?.featured,
      order: enrichment?.order,
      isIndexable: item.indexable,
    };
  });
}
