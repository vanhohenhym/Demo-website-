import {
  deriveComponentType,
  parseDescriptionSpecs,
  slugify,
} from "../field-map.ts";
import { matchesCategorySlug } from "../query-engine.ts";
import type {
  BrandEnrichmentConfig,
  Category,
  Product,
  RawAdapterProduct,
  RawCmsCategoryInput,
  SkuOverridesMap,
} from "../types.ts";
import { normalizeProductAttributes } from "./attributes.ts";
import { resolveProductBrand } from "./brands.ts";

export interface NormalizePipelineOptions {
  brandConfigs?: BrandEnrichmentConfig[];
  overridesMap?: SkuOverridesMap;
  logUnmapped?: boolean;
  logger?: (message: string) => void;
}

/**
 * Runs the full CMS normalization pipeline on one raw adapter product:
 * 1. Derives canonical `componentType` from sub-categories & attributes.
 * 2. Resolves brand via `lib/logic` precedence ladder & alias unification.
 * 3. Extracts & normalizes hardware attributes with SKU overrides, provenance, and unmapped tracking.
 */
export function normalizeRawProduct(
  raw: RawAdapterProduct,
  options: NormalizePipelineOptions = {}
): Product {
  const combinedAttrs = [...raw.explicitAttributes, ...raw.customFields];
  const componentType = deriveComponentType({
    explicitComponentType: raw.explicitComponentType,
    categorySlug: raw.categorySlug,
    subCategorySlugs: raw.subCategorySlugs,
    attributes: combinedAttrs,
  });

  const descriptionSpecs =
    raw.descriptionSpecs && raw.descriptionSpecs.length > 0
      ? raw.descriptionSpecs
      : parseDescriptionSpecs(raw.descriptionHtml);

  const enrichedRaw: RawAdapterProduct = {
    ...raw,
    descriptionSpecs,
  };

  const brandResult = resolveProductBrand(enrichedRaw, options.brandConfigs);
  const attrResult = normalizeProductAttributes(enrichedRaw, componentType, {
    overridesMap: options.overridesMap,
    logUnmapped: options.logUnmapped,
    logger: options.logger,
  });

  const slug = raw.slug?.trim() || slugify(`${raw.title}-${raw.sku}`);
  const salePrice =
    raw.price !== undefined &&
    raw.salePrice !== undefined &&
    raw.salePrice > 0 &&
    raw.salePrice < raw.price
      ? raw.salePrice
      : undefined;

  return {
    id: raw.id,
    sku: raw.sku,
    name: raw.title,
    slug,
    categorySlug: raw.categorySlug,
    categoryName: raw.categoryName,
    subCategorySlugs:
      raw.subCategorySlugs && raw.subCategorySlugs.length > 0
        ? [...raw.subCategorySlugs]
        : undefined,
    componentType,
    brand: brandResult.brand,
    brandSlug: brandResult.brandSlug,
    price: raw.price,
    salePrice,
    availability: raw.availability,
    stockQuantity: raw.stockQuantity,
    images: raw.images,
    shortDescription: raw.shortDescription,
    descriptionHtml: raw.descriptionHtml,
    attributes: attrResult.attributes,
    unmappedAttributes:
      Object.keys(attrResult.unmappedAttributes).length > 0
        ? attrResult.unmappedAttributes
        : undefined,
    audit: {
      unmappedAttributeNames: attrResult.unmappedAttributeNames,
      unrecognizedAttributes: attrResult.unrecognizedAttributes,
      hasParsedAttributes: attrResult.hasParsedAttributes,
      hasOverrideAttributes: attrResult.hasOverrideAttributes,
      rawBrandInput: brandResult.rawBrandInput,
    },
    warranty: raw.warranty,
    isFeatured: raw.isFeatured,
    isFlashDeal: raw.isFlashDeal,
    createdAt: raw.createdAt,
  };
}

export function normalizeRawProducts(
  rawProducts: RawAdapterProduct[],
  options: NormalizePipelineOptions = {}
): Product[] {
  return rawProducts.map((raw) => normalizeRawProduct(raw, options));
}

/**
 * Computes live productCount for each category from the normalized product list.
 * Also synthesizes any category referenced by products that wasn't in the static category list.
 */
export function buildCategoriesWithCounts(
  rawCategories: RawCmsCategoryInput[],
  products: Product[]
): Category[] {
  const counts = new Map<string, number>();
  const namesBySlug = new Map<string, string>();

  for (const product of products) {
    counts.set(product.categorySlug, (counts.get(product.categorySlug) ?? 0) + 1);
    if (!namesBySlug.has(product.categorySlug)) {
      namesBySlug.set(product.categorySlug, product.categoryName);
    }
  }

  const seen = new Set<string>();
  const categories: Category[] = [];

  for (const raw of rawCategories) {
    seen.add(raw.slug);
    categories.push({
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      icon: raw.icon,
      image: raw.image,
      parentSlug: raw.parentSlug,
      productCount: products.filter((p) => matchesCategorySlug(p, raw.slug))
        .length,
    });
  }

  for (const [slug] of counts.entries()) {
    if (!seen.has(slug)) {
      categories.push({
        id: `cat-${slug}`,
        name: namesBySlug.get(slug) ?? slug,
        slug,
        productCount: products.filter((p) => matchesCategorySlug(p, slug))
          .length,
      });
    }
  }

  return categories;
}
