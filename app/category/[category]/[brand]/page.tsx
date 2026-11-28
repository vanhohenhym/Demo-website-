import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Cpu } from "lucide-react";
import { getCmsAdapter, resolveComponentCategoryLabel } from "@/lib/cms";
import { toCatalogProduct } from "@/lib/cms/types";
import {
  AUDITED_HEALTH_CATEGORY_SLUGS,
  evaluateCategoryHealth,
} from "@/lib/logic";
import {
  PREFILTER_MIN_COVERAGE_PERCENT,
  getBuilderSlot,
  isBuilderSlotId,
} from "@/lib/pc-builder/builder";
import {
  DEFAULT_LIMIT,
  buildCatalogUrl,
  hasNonCanonicalFilterParams,
  parseCatalogSearchParams,
} from "@/lib/catalog/url-params";
import { constructMetadata } from "@/lib/seo/metadata";
import { getItemListSchema } from "@/lib/seo/schema";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { CATEGORIES } from "@/components/layout/Header";
import { BrandNavStrip } from "@/components/catalog/BrandNavStrip";
import { FilterSidebar } from "@/components/catalog/FilterSidebar";
import { SortSelector } from "@/components/catalog/SortSelector";
import { Pagination } from "@/components/catalog/Pagination";
import { ProductCard } from "@/components/catalog/ProductCard";

export const dynamic = "force-dynamic";

interface BrandCategoryPageProps {
  params: Promise<{ category: string; brand: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatSlugLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function resolveCategoryDisplayName(
  categorySlug: string,
  cmsCategoryName?: string
): string {
  if (cmsCategoryName) {
    return cmsCategoryName;
  }
  if (categorySlug.trim().toLowerCase() === "all") {
    return "All Products";
  }
  const componentLabel = resolveComponentCategoryLabel(categorySlug);
  if (componentLabel) {
    return componentLabel;
  }
  const headerCat = CATEGORIES.find((c) => c.slug === categorySlug);
  return headerCat ? headerCat.name : formatSlugLabel(categorySlug);
}

export async function generateMetadata({
  params,
  searchParams,
}: BrandCategoryPageProps): Promise<Metadata> {
  const [{ category, brand }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const adapter = getCmsAdapter();
  const parsedQuery = parseCatalogSearchParams(rawSearchParams, {
    category,
    brand,
  });

  const [categoryObj, brands, result] = await Promise.all([
    adapter.getCategoryBySlug(category),
    adapter.getBrandsByCategory(category),
    adapter.getProducts(parsedQuery),
  ]);

  const catName = resolveCategoryDisplayName(category, categoryObj?.name);
  const matchedBrand = brands.find(
    (b) => b.slug.toLowerCase() === brand.toLowerCase()
  );
  const brandName = matchedBrand?.name ?? formatSlugLabel(brand);
  const brandTotalCount = matchedBrand?.productCount ?? result.total;

  const hasFilters = hasNonCanonicalFilterParams(rawSearchParams);
  const isThinOrOther =
    brand.toLowerCase() === "other" ||
    !matchedBrand ||
    !matchedBrand.isIndexable ||
    brandTotalCount < 3;

  return constructMetadata({
    title: `${brandName} ${catName} Price in Bangladesh`,
    description: `Browse ${brandName} ${catName} products with live specs, pricing, and availability from our connected CMS catalog.`,
    path: `/category/${category}/${brand}`,
    canonicalPath: `/category/${category}/${brand}`,
    noIndex: hasFilters || isThinOrOther,
  });
}

export default async function BrandCategoryPage({
  params,
  searchParams,
}: BrandCategoryPageProps) {
  const [{ category, brand }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const adapter = getCmsAdapter();
  const parsedQuery = parseCatalogSearchParams(rawSearchParams, {
    category,
    brand,
  });
  const basePath = `/category/${category}/${brand}`;

  const isBuilderMode =
    parsedQuery.builder === "1" && Boolean(parsedQuery.slot?.trim());
  const activeSlot = parsedQuery.slot?.trim();

  let effectiveQuery = parsedQuery;
  let prefilterDisabledCoverage: number | undefined;

  if (
    isBuilderMode &&
    parsedQuery.prefilter === "1" &&
    activeSlot &&
    isBuilderSlotId(activeSlot)
  ) {
    const slotDef = getBuilderSlot(activeSlot);
    if (
      slotDef &&
      AUDITED_HEALTH_CATEGORY_SLUGS.includes(slotDef.componentType)
    ) {
      const allProducts = await adapter.getAllProducts();
      const catalogProducts = allProducts.map((p) => toCatalogProduct(p, true));
      const { health } = evaluateCategoryHealth(
        slotDef.componentType,
        catalogProducts
      );

      if (
        health.status === "red" ||
        health.status === "no-data" ||
        health.coveragePercent < PREFILTER_MIN_COVERAGE_PERCENT
      ) {
        prefilterDisabledCoverage = health.coveragePercent;
        effectiveQuery = {
          ...parsedQuery,
          sockets: undefined,
          ramTypes: undefined,
          formFactors: undefined,
          storageInterfaces: undefined,
          prefilter: undefined,
        };
      }
    }
  }

  const [categoryObj, brands, result] = await Promise.all([
    adapter.getCategoryBySlug(category),
    adapter.getBrandsByCategory(category),
    adapter.getProducts(effectiveQuery),
  ]);

  const catName = resolveCategoryDisplayName(category, categoryObj?.name);
  const matchedBrand = brands.find(
    (b) => b.slug.toLowerCase() === brand.toLowerCase()
  );
  const brandName = matchedBrand?.name ?? formatSlugLabel(brand);

  const hasFilters = hasNonCanonicalFilterParams(rawSearchParams);
  const hasCompatParams = Boolean(
    effectiveQuery.sockets?.length ||
      effectiveQuery.ramTypes?.length ||
      effectiveQuery.formFactors?.length ||
      effectiveQuery.storageInterfaces?.length
  );
  const ignoreCompatHref = buildCatalogUrl(basePath, {
    ...effectiveQuery,
    sockets: undefined,
    ramTypes: undefined,
    formFactors: undefined,
    storageInterfaces: undefined,
    prefilter: undefined,
    page: undefined,
  });

  const limit = effectiveQuery.limit ?? DEFAULT_LIMIT;
  const page = effectiveQuery.page ?? 1;

  const itemListSchema =
    result.products.length > 0
      ? getItemListSchema(
          `${brandName} ${catName}`,
          result.products.map((product, index) => ({
            name: product.name,
            slug: product.slug,
            position: (page - 1) * limit + index + 1,
          }))
        )
      : null;

  const clearFiltersHref = buildCatalogUrl(basePath, {
    builder: parsedQuery.builder,
    slot: parsedQuery.slot,
  });

  const backToCategoryHref = buildCatalogUrl(`/category/${category}`, {
    builder: parsedQuery.builder,
    slot: parsedQuery.slot,
  });

  return (
    <div className="space-y-4">
      {itemListSchema ? <JsonLd schema={itemListSchema} /> : null}
      <Breadcrumbs
        items={[
          { label: catName, href: backToCategoryHref },
          { label: brandName, href: basePath },
        ]}
      />

      {/* Builder Mode Banner */}
      {isBuilderMode && activeSlot ? (
        <div
          role="region"
          aria-label="PC Builder selection mode"
          className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand-blue/30 bg-brand-flashBg px-4 py-3 text-xs"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-brand-textMain">
              <Cpu className="h-4 w-4 text-brand-blue" aria-hidden="true" />
              <span>
                Selecting for PC Builder:{" "}
                <strong className="font-bold uppercase text-brand-blue">
                  {activeSlot}
                </strong>
              </span>
            </div>
            {prefilterDisabledCoverage !== undefined ? (
              <p className="text-amber-800 font-medium">
                Compatibility pre-filtering disabled: attribute coverage is{" "}
                {prefilterDisabledCoverage >= PREFILTER_MIN_COVERAGE_PERCENT
                  ? `${prefilterDisabledCoverage}% (below ${PREFILTER_MIN_COVERAGE_PERCENT}% unrounded threshold).`
                  : `${prefilterDisabledCoverage}% (< ${PREFILTER_MIN_COVERAGE_PERCENT}% threshold).`}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasCompatParams ? (
              <Link
                href={ignoreCompatHref}
                className="inline-flex items-center rounded-control border border-brand-blue/40 bg-white px-3 py-1.5 font-semibold text-brand-blue transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                Ignore compatibility filter
              </Link>
            ) : null}
            <Link
              href="/pc-builder"
              className="inline-flex items-center rounded-control bg-brand-blue px-3 py-1.5 font-semibold text-white transition-colors hover:bg-brand-blueDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            >
              Back to PC Builder
            </Link>
          </div>
        </div>
      ) : null}

      {/* Header Bar — Exactly ONE h1 */}
      <div className="flex flex-col justify-between gap-3 rounded-card border border-brand-border bg-white p-4 shadow-card sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-brand-textMain">
            {brandName} {catName}
          </h1>
          <p className="mt-0.5 text-xs text-brand-textMuted tabular-nums">
            {result.total} {result.total === 1 ? "product" : "products"} found
          </p>
        </div>
        <SortSelector basePath={basePath} query={effectiveQuery} />
      </div>

      {/* Dynamic Brand Strip */}
      <BrandNavStrip
        categorySlug={category}
        brands={brands}
        activeBrandSlug={brand}
        builder={effectiveQuery.builder}
        slot={effectiveQuery.slot}
        sockets={effectiveQuery.sockets}
        ramTypes={effectiveQuery.ramTypes}
        formFactors={effectiveQuery.formFactors}
        storageInterfaces={effectiveQuery.storageInterfaces}
      />

      {/* Main Catalog Layout */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <FilterSidebar
          basePath={basePath}
          facets={result.facets}
          query={effectiveQuery}
          lockedBrandSlug={brand}
        />

        <div className="min-w-0 flex-1 space-y-4">
          {result.products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {result.products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={index < 4}
                    builderMode={isBuilderMode}
                    slot={activeSlot}
                  />
                ))}
              </div>

              <Pagination
                basePath={basePath}
                query={effectiveQuery}
                total={result.total}
              />
            </>
          ) : (
            <section className="space-y-3 rounded-card border border-brand-border bg-white p-10 text-center shadow-card">
              <h2 className="text-base font-bold text-brand-textMain">
                {hasFilters
                  ? `No ${brandName} ${catName} products match your filters`
                  : `No ${brandName} products in ${catName} yet`}
              </h2>
              <p className="mx-auto max-w-md text-xs text-brand-textMuted">
                {hasFilters
                  ? "Try clearing your active filters or view all brands in this category."
                  : "Brand sub-categories are generated dynamically from CMS product data."}
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {hasFilters ? (
                  <Link
                    href={clearFiltersHref}
                    className="inline-block rounded-control bg-brand-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blueDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                  >
                    Clear All Filters
                  </Link>
                ) : null}
                <Link
                  href={backToCategoryHref}
                  className="inline-block rounded-control border border-brand-border bg-white px-4 py-2 text-xs font-semibold text-brand-textMain transition-colors hover:border-brand-blue hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                >
                  All {catName}
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
