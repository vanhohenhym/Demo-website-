"use client";

import React, { useId } from "react";
import { useRouter } from "next/navigation";
import type { CatalogQueryParams } from "@/lib/cms/types";
import {
  ALLOWED_LIMITS,
  DEFAULT_LIMIT,
  buildCatalogUrl,
  type AllowedLimit,
} from "@/lib/catalog/url-params";

export interface SortSelectorProps {
  basePath: string;
  query: CatalogQueryParams;
}

type SortOptionValue = "" | NonNullable<CatalogQueryParams["sort"]>;

const SORT_OPTIONS: ReadonlyArray<{ value: SortOptionValue; label: string }> = [
  { value: "", label: "Default" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "name-asc", label: "Name: A–Z" },
];

export function SortSelector({ basePath, query }: SortSelectorProps) {
  const router = useRouter();
  const uid = useId();
  const sortId = `${uid}-sort`;
  const limitId = `${uid}-limit`;

  const currentSort: SortOptionValue = query.sort ?? "";
  const currentLimit = query.limit ?? DEFAULT_LIMIT;

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as SortOptionValue;
    const nextUrl = buildCatalogUrl(basePath, {
      ...query,
      brand: undefined,
      sort: val === "" ? undefined : val,
      page: 1,
    });
    router.push(nextUrl);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const parsed = Number.parseInt(e.target.value, 10) as AllowedLimit;
    const nextUrl = buildCatalogUrl(basePath, {
      ...query,
      brand: undefined,
      limit: parsed,
      page: 1,
    });
    router.push(nextUrl);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <div className="flex items-center gap-2">
        <label htmlFor={limitId} className="font-medium text-brand-textMuted">
          Show:
        </label>
        <select
          id={limitId}
          name="limit"
          value={String(currentLimit)}
          onChange={handleLimitChange}
          className="rounded-control border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-brand-textMain tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          {ALLOWED_LIMITS.map((limitVal) => (
            <option key={limitVal} value={String(limitVal)}>
              {limitVal}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={sortId} className="font-medium text-brand-textMuted">
          Sort By:
        </label>
        <select
          id={sortId}
          name="sort"
          value={currentSort}
          onChange={handleSortChange}
          className="rounded-control border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-brand-textMain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value || "default"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
