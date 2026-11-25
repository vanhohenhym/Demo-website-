import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/seo/metadata";
import {
  DEFAULT_INDEX_MIN_PRODUCTS,
  DEFAULT_MIN_BRAND_PRODUCTS,
  getCmsAdapter,
  matchesCategorySlug,
  toCatalogProduct,
} from "@/lib/cms";
import { brandVisibility } from "@/lib/logic";

export const revalidate = 3600;

export const SITEMAP_PARENT_CATEGORIES: readonly string[] = [
  "component",
  "power",
  "accessories",
  "gaming",
  "server-storage",
];

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const adapter = getCmsAdapter();

  const [categories, products] = await Promise.all([
    adapter.getCategories(),
    adapter.getAllProducts(),
  ]);

  const minBrandProducts = parsePositiveIntEnv(
    process.env.MIN_BRAND_PRODUCTS,
    DEFAULT_MIN_BRAND_PRODUCTS
  );
  const indexMinProducts = parsePositiveIntEnv(
    process.env.INDEX_MIN_PRODUCTS,
    DEFAULT_INDEX_MIN_PRODUCTS
  );

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/pc-builder`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const categorySlugs: string[] = [];
  const seenCategorySlugs = new Set<string>(["all"]);

  for (const category of categories) {
    const cleanSlug = category.slug.trim();
    if (cleanSlug && !seenCategorySlugs.has(cleanSlug)) {
      seenCategorySlugs.add(cleanSlug);
      categorySlugs.push(cleanSlug);
    }
  }

  for (const parentSlug of SITEMAP_PARENT_CATEGORIES) {
    if (!seenCategorySlugs.has(parentSlug)) {
      seenCategorySlugs.add(parentSlug);
      categorySlugs.push(parentSlug);
    }
  }

  // Include non-empty categories (>= 1 product) and indexable brand pages (>= INDEX_MIN_PRODUCTS, never "other")
  for (const categorySlug of categorySlugs) {
    const categoryProducts = products.map((product) => {
      const projected = toCatalogProduct(product, false);
      return matchesCategorySlug(product, categorySlug)
        ? { ...projected, categorySlug }
        : projected;
    });

    const visibility = brandVisibility({
      categorySlug,
      products: categoryProducts,
      minBrandProducts,
      indexMinProducts,
    });

    if (visibility.totalCategoryProducts < 1) {
      continue;
    }

    entries.push({
      url: `${BASE_URL}/category/${encodeURIComponent(categorySlug)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });

    for (const brand of visibility.brands) {
      if (!brand.indexable) {
        continue;
      }
      entries.push({
        url: `${BASE_URL}/category/${encodeURIComponent(categorySlug)}/${encodeURIComponent(brand.brandSlug)}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  }

  // Include all active products returned by the CMS adapter
  const seenProductSlugs = new Set<string>();
  for (const product of products) {
    if (!product.slug || seenProductSlugs.has(product.slug)) {
      continue;
    }
    seenProductSlugs.add(product.slug);

    const parsedDate = product.createdAt ? new Date(product.createdAt) : now;
    const lastModified = Number.isNaN(parsedDate.getTime()) ? now : parsedDate;

    entries.push({
      url: `${BASE_URL}/product/${encodeURIComponent(product.slug)}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
