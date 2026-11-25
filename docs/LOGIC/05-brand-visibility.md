# 05 brand_visibility

Builds the brand sub-category navigation for one category (brands = sub-categories) and SEO indexability flags.

**Inputs:** `categorySlug`, `products: CatalogProduct[]`, `minBrandProducts` (>= 1, default 1), `indexMinProducts` (>= 1, default 3).
**Outputs:** `brands: BrandVisibilityItem[]` (default []), `totalCategoryProducts`, `categoryIndexable`.

1. Keep products where `item.categorySlug == categorySlug`. `totalCategoryProducts` = their count.
2. Count products with `brandSlug == "other"` as `otherCount`. Collect the distinct other brand slugs.
3. `categoryIndexable = totalCategoryProducts >= indexMinProducts`.
4. Sort the distinct slugs ascending (by slug). For each slug: `count` = products with that slug; `brand` name = the name of the last matching product. If `count >= minBrandProducts` add `{ brand, brandSlug, count, indexable: count >= indexMinProducts }`.
5. Append Other LAST, only if `otherCount > 0 && otherCount >= minBrandProducts`, with `{ brand: "Other", brandSlug: "other", count: otherCount, indexable: false }`. **Other is never indexable.**

## Use in the site
- Brand nav shows `brand (count)`.
- Brand page with `indexable == false`: `noindex,follow`, excluded from sitemap.
- Category with `categoryIndexable == false` (or empty): friendly empty state, `noindex`, excluded from sitemap.
- Brands below `minBrandProducts` are hidden. A category with no brands shows no brand nav.

## Tests
`tests/brand-visibility.test.json` (10 cases).
