import type {
  BrandVisibilityInput,
  BrandVisibilityItem,
  BrandVisibilityResult,
} from "./types.ts";

export function brandVisibility(input: BrandVisibilityInput): BrandVisibilityResult {
  const minBrandProducts = input.minBrandProducts ?? 1;
  const indexMinProducts = input.indexMinProducts ?? 3;

  const categoryProducts = input.products.filter(
    (item) => item.categorySlug === input.categorySlug,
  );
  const totalCategoryProducts = categoryProducts.length;
  const categoryIndexable = totalCategoryProducts >= indexMinProducts;

  let otherCount = 0;
  const namedSlugCounts = new Map<string, { brand: string; count: number }>();

  for (const item of categoryProducts) {
    if (item.brandSlug === "other") {
      otherCount += 1;
    } else {
      const existing = namedSlugCounts.get(item.brandSlug);
      if (existing == null) {
        namedSlugCounts.set(item.brandSlug, { brand: item.brand, count: 1 });
      } else {
        // Spec: brand name = the name of the last matching product
        existing.brand = item.brand;
        existing.count += 1;
      }
    }
  }

  const sortedSlugs = Array.from(namedSlugCounts.keys()).sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );

  const brands: BrandVisibilityItem[] = [];
  for (const slug of sortedSlugs) {
    const entry = namedSlugCounts.get(slug);
    if (entry != null && entry.count >= minBrandProducts) {
      brands.push({
        brand: entry.brand,
        brandSlug: slug,
        count: entry.count,
        indexable: entry.count >= indexMinProducts,
      });
    }
  }

  // Append Other LAST, never indexable
  if (otherCount > 0 && otherCount >= minBrandProducts) {
    brands.push({
      brand: "Other",
      brandSlug: "other",
      count: otherCount,
      indexable: false,
    });
  }

  return {
    brands,
    totalCategoryProducts,
    categoryIndexable,
  };
}
