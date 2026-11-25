"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import type { CatalogQueryParams, FacetGroup } from "@/lib/cms/types";
import { buildCatalogUrl } from "@/lib/catalog/url-params";

export interface FilterSidebarProps {
  basePath: string;
  facets: FacetGroup[];
  query: CatalogQueryParams;
  lockedBrandSlug?: string;
}

type MultiAttributeKey =
  | "socket"
  | "ramType"
  | "formFactor"
  | "storageInterface";

const ATTRIBUTE_FACET_KEYS: readonly MultiAttributeKey[] = [
  "socket",
  "ramType",
  "formFactor",
  "storageInterface",
];

function getQueryValuesForKey(
  query: CatalogQueryParams,
  key: MultiAttributeKey
): string[] {
  switch (key) {
    case "socket":
      return query.sockets ?? [];
    case "ramType":
      return query.ramTypes ?? [];
    case "formFactor":
      return query.formFactors ?? [];
    case "storageInterface":
      return query.storageInterfaces ?? [];
  }
}

function withUpdatedAttributeKey(
  query: CatalogQueryParams,
  key: MultiAttributeKey,
  values: string[]
): Partial<CatalogQueryParams> {
  const next: Partial<CatalogQueryParams> = {
    ...query,
    page: 1,
  };
  switch (key) {
    case "socket":
      next.sockets = values.length > 0 ? values : undefined;
      break;
    case "ramType":
      next.ramTypes = values.length > 0 ? values : undefined;
      break;
    case "formFactor":
      next.formFactors = values.length > 0 ? values : undefined;
      break;
    case "storageInterface":
      next.storageInterfaces = values.length > 0 ? values : undefined;
      break;
  }
  return next;
}

function toggleListValue(
  current: readonly string[],
  target: string,
  checked: boolean
): string[] {
  const lowerTarget = target.toLowerCase();
  const filtered = current.filter((v) => v.toLowerCase() !== lowerTarget);
  if (checked) {
    filtered.push(target);
  }
  return filtered;
}

export function FilterSidebar({
  basePath,
  facets,
  query,
  lockedBrandSlug,
}: FilterSidebarProps) {
  const router = useRouter();
  const uid = useId();
  const panelId = `${uid}-filter-panel`;
  const minPriceId = `${uid}-min-price`;
  const maxPriceId = `${uid}-max-price`;
  const searchInputId = `${uid}-search-q`;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [minInput, setMinInput] = useState<string>(
    query.minPrice !== undefined ? String(query.minPrice) : ""
  );
  const [maxInput, setMaxInput] = useState<string>(
    query.maxPrice !== undefined ? String(query.maxPrice) : ""
  );
  const [searchInput, setSearchInput] = useState<string>(query.q ?? "");

  useEffect(() => {
    setMinInput(query.minPrice !== undefined ? String(query.minPrice) : "");
    setMaxInput(query.maxPrice !== undefined ? String(query.maxPrice) : "");
    setSearchInput(query.q ?? "");
  }, [query.minPrice, query.maxPrice, query.q]);

  const priceFacet = facets.find((f) => f.key === "price");
  const availabilityFacet = facets.find((f) => f.key === "availability");
  const brandFacet = lockedBrandSlug
    ? undefined
    : facets.find((f) => f.key === "brand");

  const attributeFacets = ATTRIBUTE_FACET_KEYS.map((key) =>
    facets.find((f) => f.key === key)
  ).filter((group): group is FacetGroup => {
    if (!group) return false;
    return group.values.some((v) => v.count > 0);
  });

  const hasActiveFilters = Boolean(
    query.q ||
      query.minPrice !== undefined ||
      query.maxPrice !== undefined ||
      query.availability === "in-stock" ||
      (!lockedBrandSlug && (query.brands?.length ?? 0) > 0) ||
      (query.sockets?.length ?? 0) > 0 ||
      (query.ramTypes?.length ?? 0) > 0 ||
      (query.formFactors?.length ?? 0) > 0 ||
      (query.storageInterfaces?.length ?? 0) > 0
  );

  const clearAllHref = buildCatalogUrl(basePath, {
    sort: query.sort,
    limit: query.limit,
    builder: query.builder,
    slot: query.slot,
  });

  const pushNextQuery = (next: Partial<CatalogQueryParams>) => {
    const cleanNext: Partial<CatalogQueryParams> = {
      ...next,
      brand: undefined,
      prefilter: undefined,
    };
    router.push(buildCatalogUrl(basePath, cleanNext));
  };

  const handlePriceSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedMin = minInput.trim() ? Number(minInput.trim()) : undefined;
    const parsedMax = maxInput.trim() ? Number(maxInput.trim()) : undefined;

    const validMin =
      parsedMin !== undefined && Number.isFinite(parsedMin) && parsedMin >= 0
        ? parsedMin
        : undefined;
    const validMax =
      parsedMax !== undefined && Number.isFinite(parsedMax) && parsedMax >= 0
        ? parsedMax
        : undefined;

    pushNextQuery({
      ...query,
      minPrice: validMin,
      maxPrice: validMax,
      page: 1,
    });
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    pushNextQuery({
      ...query,
      q: trimmed.length > 0 ? trimmed : undefined,
      page: 1,
    });
  };

  const handleAvailabilityChange = (val: "all" | "in-stock") => {
    pushNextQuery({
      ...query,
      availability: val === "in-stock" ? "in-stock" : undefined,
      page: 1,
    });
  };

  const handleBrandToggle = (brandSlug: string, checked: boolean) => {
    const nextBrands = toggleListValue(query.brands ?? [], brandSlug, checked);
    pushNextQuery({
      ...query,
      brands: nextBrands.length > 0 ? nextBrands : undefined,
      page: 1,
    });
  };

  const handleAttributeToggle = (
    key: MultiAttributeKey,
    value: string,
    checked: boolean
  ) => {
    const current = getQueryValuesForKey(query, key);
    const nextVals = toggleListValue(current, value, checked);
    pushNextQuery(withUpdatedAttributeKey(query, key, nextVals));
  };

  return (
    <aside aria-label="Catalog filters" className="w-full lg:w-64 lg:flex-shrink-0">
      {/* Mobile Toggle */}
      <div className="mb-3 flex items-center justify-between lg:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls={panelId}
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex w-full items-center justify-between rounded-card border border-brand-border bg-white px-3.5 py-2.5 text-xs font-semibold text-brand-textMain shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-brand-blue" aria-hidden="true" />
            <span>Filters</span>
            {hasActiveFilters ? (
              <span className="rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold text-white">
                Active
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-brand-textMuted transition-transform ${
              mobileOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        id={panelId}
        className={`${
          mobileOpen ? "block" : "hidden"
        } space-y-3 lg:block`}
      >
        {hasActiveFilters ? (
          <div className="flex items-center justify-between rounded-card border border-brand-border bg-white px-3.5 py-2.5 shadow-card">
            <span className="text-xs font-semibold text-brand-textMain">
              Active Filters
            </span>
            <Link
              href={clearAllHref}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-orange hover:text-brand-orangeHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear All Filters</span>
            </Link>
          </div>
        ) : null}

        {/* Keyword Search within Category */}
        <search className="rounded-card border border-brand-border bg-white p-3.5 shadow-card">
          <form onSubmit={handleSearchSubmit} className="space-y-2">
            <label
              htmlFor={searchInputId}
              className="block text-xs font-bold uppercase tracking-wide text-brand-textMain"
            >
              Filter by Keyword
            </label>
            <div className="flex gap-1.5">
              <input
                id={searchInputId}
                name="q"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Model, SKU, spec..."
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-control border border-gray-300 px-2.5 py-1.5 text-xs text-brand-textMain placeholder:text-brand-textMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              />
              <button
                type="submit"
                className="rounded-control bg-brand-blue px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-blueDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1"
              >
                Go
              </button>
            </div>
          </form>
        </search>

        {/* Price Range */}
        <div className="rounded-card border border-brand-border bg-white p-3.5 shadow-card">
          <form onSubmit={handlePriceSubmit}>
            <fieldset className="space-y-2.5">
              <legend className="text-xs font-bold uppercase tracking-wide text-brand-textMain">
                Price Range (৳)
              </legend>
              {priceFacet &&
              priceFacet.min !== undefined &&
              priceFacet.max !== undefined ? (
                <p className="text-[11px] text-brand-textMuted tabular-nums">
                  Range: {priceFacet.min.toLocaleString("en-US")}৳ –{" "}
                  {priceFacet.max.toLocaleString("en-US")}৳
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor={minPriceId}
                    className="mb-1 block text-[11px] font-medium text-brand-textMuted"
                  >
                    Min
                  </label>
                  <input
                    id={minPriceId}
                    name="minPrice"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={minInput}
                    onChange={(e) => setMinInput(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-control border border-gray-300 px-2 py-1.5 text-xs text-brand-textMain tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                  />
                </div>
                <div>
                  <label
                    htmlFor={maxPriceId}
                    className="mb-1 block text-[11px] font-medium text-brand-textMuted"
                  >
                    Max
                  </label>
                  <input
                    id={maxPriceId}
                    name="maxPrice"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={maxInput}
                    onChange={(e) => setMaxInput(e.target.value)}
                    placeholder="Any"
                    className="w-full rounded-control border border-gray-300 px-2 py-1.5 text-xs text-brand-textMain tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-control bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-blueDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1"
              >
                Apply Price
              </button>
            </fieldset>
          </form>
        </div>

        {/* Availability */}
        {availabilityFacet && availabilityFacet.values.length > 0 ? (
          <div className="rounded-card border border-brand-border bg-white p-3.5 shadow-card">
            <fieldset className="space-y-2">
              <legend className="text-xs font-bold uppercase tracking-wide text-brand-textMain">
                {availabilityFacet.title}
              </legend>
              <div className="space-y-1.5">
                {availabilityFacet.values
                  .filter((opt) => opt.count > 0)
                  .map((opt) => {
                    const inputId = `${uid}-avail-${opt.value}`;
                    const isChecked =
                      opt.value === "in-stock"
                        ? query.availability === "in-stock"
                        : query.availability !== "in-stock";
                    return (
                      <div key={opt.value} className="flex items-center gap-2">
                        <input
                          id={inputId}
                          type="radio"
                          name={`${uid}-availability`}
                          value={opt.value}
                          checked={isChecked}
                          onChange={() =>
                            handleAvailabilityChange(
                              opt.value === "in-stock" ? "in-stock" : "all"
                            )
                          }
                          className="h-4 w-4 accent-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                        />
                        <label
                          htmlFor={inputId}
                          className="flex flex-1 cursor-pointer items-center justify-between text-xs text-brand-textMain"
                        >
                          <span>{opt.label}</span>
                          <span className="text-[11px] text-brand-textMuted tabular-nums">
                            ({opt.count})
                          </span>
                        </label>
                      </div>
                    );
                  })}
              </div>
            </fieldset>
          </div>
        ) : null}

        {/* Brand Checkboxes (hidden on locked brand page) */}
        {brandFacet && brandFacet.values.some((v) => v.count > 0) ? (
          <div className="rounded-card border border-brand-border bg-white p-3.5 shadow-card">
            <fieldset className="space-y-2">
              <legend className="text-xs font-bold uppercase tracking-wide text-brand-textMain">
                {brandFacet.title}
              </legend>
              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                {brandFacet.values
                  .filter((v) => v.count > 0)
                  .map((opt) => {
                    const inputId = `${uid}-brand-${opt.value}`;
                    const checked = (query.brands ?? []).some(
                      (b) => b.toLowerCase() === opt.value.toLowerCase()
                    );
                    return (
                      <div key={opt.value} className="flex items-center gap-2">
                        <input
                          id={inputId}
                          type="checkbox"
                          name="brand"
                          value={opt.value}
                          checked={checked}
                          onChange={(e) =>
                            handleBrandToggle(opt.value, e.target.checked)
                          }
                          className="h-4 w-4 rounded accent-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                        />
                        <label
                          htmlFor={inputId}
                          className="flex flex-1 cursor-pointer items-center justify-between text-xs text-brand-textMain"
                        >
                          <span>{opt.label}</span>
                          <span className="text-[11px] text-brand-textMuted tabular-nums">
                            ({opt.count})
                          </span>
                        </label>
                      </div>
                    );
                  })}
              </div>
            </fieldset>
          </div>
        ) : null}

        {/* Dynamic Attribute Facets */}
        {attributeFacets.map((group) => {
          const facetKey = group.key as MultiAttributeKey;
          const activeValues = getQueryValuesForKey(query, facetKey);

          return (
            <div
              key={group.key}
              className="rounded-card border border-brand-border bg-white p-3.5 shadow-card"
            >
              <fieldset className="space-y-2">
                <legend className="text-xs font-bold uppercase tracking-wide text-brand-textMain">
                  {group.title}
                </legend>
                <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {group.values
                    .filter((v) => v.count > 0)
                    .map((opt) => {
                      const inputId = `${uid}-${group.key}-${opt.value}`;
                      const checked = activeValues.some(
                        (v) => v.toLowerCase() === opt.value.toLowerCase()
                      );
                      return (
                        <div key={opt.value} className="flex items-center gap-2">
                          <input
                            id={inputId}
                            type="checkbox"
                            name={group.key}
                            value={opt.value}
                            checked={checked}
                            onChange={(e) =>
                              handleAttributeToggle(
                                facetKey,
                                opt.value,
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 rounded accent-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                          />
                          <label
                            htmlFor={inputId}
                            className="flex flex-1 cursor-pointer items-center justify-between text-xs text-brand-textMain"
                          >
                            <span>{opt.label}</span>
                            <span className="text-[11px] text-brand-textMuted tabular-nums">
                              ({opt.count})
                            </span>
                          </label>
                        </div>
                      );
                    })}
                </div>
              </fieldset>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
