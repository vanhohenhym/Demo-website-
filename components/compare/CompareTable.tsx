"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import { buildCompareRows } from "@/lib/compare/compare";
import { useCompare } from "@/components/compare/CompareProvider";
import { Button } from "@/components/ui/Button";

function isRenderableImageUrl(url?: string): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:image/")
  );
}

export function CompareTable() {
  const {
    items,
    count,
    maxItems,
    categorySlug,
    categoryName,
    removeItem,
    clearAll,
  } = useCompare();

  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const effectiveShowDifferencesOnly = count >= 2 && showDifferencesOnly;

  useEffect(() => {
    if (count < 2) {
      setShowDifferencesOnly(false);
    }
  }, [count]);

  const allRows = useMemo(() => buildCompareRows(items), [items]);
  const visibleRows = useMemo(
    () =>
      effectiveShowDifferencesOnly
        ? allRows.filter((row) => row.hasDifference)
        : allRows,
    [allRows, effectiveShowDifferencesOnly]
  );

  const addMoreHref = categorySlug
    ? `/category/${categorySlug}`
    : "/category/component";

  if (count === 0) {
    return (
      <div className="rounded-lg border border-brand-border bg-white p-6 text-center shadow-card">
        <div className="mx-auto max-w-md space-y-4 py-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-grayBg text-brand-textMuted">
            <SlidersHorizontal className="h-8 w-8" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-brand-textMain">
            No products selected for comparison
          </h2>
          <p className="text-xs text-brand-textMuted">
            Select &quot;Compare&quot; on any product card in the category
            catalog or on a product page to compare specifications side by side.
          </p>
          <div className="pt-2">
            <Link href="/category/component">
              <Button variant="primary" size="md">
                Explore Components
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-border bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-brand-textMain tabular-nums">
            Comparing {count} of {maxItems}
          </span>
          {categoryName ? (
            <span className="rounded-control bg-brand-grayBg px-2.5 py-0.5 text-xs font-medium text-brand-textMuted">
              {categoryName}
            </span>
          ) : null}
          {count >= 2 ? (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-control border border-brand-border bg-brand-grayBg/50 px-3 py-1.5 text-xs font-medium text-brand-textMain hover:border-brand-blue">
              <input
                type="checkbox"
                checked={effectiveShowDifferencesOnly}
                onChange={(e) => setShowDifferencesOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-brand-orange focus:ring-brand-orange"
              />
              <span>Show differences only</span>
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {count < maxItems ? (
            <Link
              href={addMoreHref}
              className="inline-flex items-center gap-1.5 rounded-control border border-brand-blue bg-white px-3 py-1.5 text-xs font-semibold text-brand-blue transition-colors hover:bg-brand-blue hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add more{categoryName ? ` ${categoryName}` : ""}</span>
            </Link>
          ) : null}
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 rounded-control border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-textMuted transition-colors hover:border-red-300 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Partial State Notice */}
      {count === 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
          <span>
            Add at least 1 more{" "}
            <strong>{categoryName ?? "product"}</strong> to highlight
            differences side by side.
          </span>
          <Link
            href={addMoreHref}
            className="font-semibold text-brand-blue underline underline-offset-2 hover:text-brand-orange"
          >
            Browse {categoryName ?? "Catalog"}
          </Link>
        </div>
      ) : null}

      {/* Accessible Responsive Comparison Table */}
      <div className="rounded-lg border border-brand-border bg-white shadow-card">
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="compare-table-caption"
          className="overflow-x-auto"
        >
          <table className="w-full border-separate border-spacing-0 text-left text-xs">
            <caption id="compare-table-caption" className="sr-only">
              Side-by-side product specification comparison for {count}{" "}
              {categoryName ?? "products"}
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-20 min-w-[150px] border-b border-r border-brand-border bg-brand-grayBg px-4 py-3 align-bottom text-xs font-bold uppercase tracking-wider text-brand-textMuted sm:min-w-[190px]"
                >
                  Specification
                </th>
                {items.map((item) => (
                  <th
                    key={item.id}
                    scope="col"
                    className="min-w-[200px] border-b border-r border-brand-border bg-white p-4 align-top last:border-r-0"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${item.slug}`}
                          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded border border-brand-border/60 bg-white p-1.5 hover:border-brand-blue"
                        >
                          {isRenderableImageUrl(item.imageUrl) ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.imageAlt || item.name}
                              fill
                              sizes="96px"
                              className="object-contain p-1.5"
                            />
                          ) : (
                            <span className="text-xs font-bold uppercase text-brand-textMuted">
                              {item.brand}
                            </span>
                          )}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name} from comparison`}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-brand-border bg-white text-brand-textMuted transition-colors hover:border-red-300 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <Link
                        href={`/product/${item.slug}`}
                        className="line-clamp-2 text-xs font-semibold leading-snug text-brand-textMain hover:text-brand-orange"
                      >
                        {item.name}
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={items.length + 1}
                    className="px-4 py-10 text-center text-xs text-brand-textMuted"
                  >
                    All compared specifications match across the selected
                    products.{" "}
                    <button
                      type="button"
                      onClick={() => setShowDifferencesOnly(false)}
                      className="font-semibold text-brand-blue underline underline-offset-2 hover:text-brand-orange"
                    >
                      Show all specifications
                    </button>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr
                    key={row.key}
                    className={
                      row.hasDifference
                        ? "bg-amber-50/80"
                        : "bg-white hover:bg-brand-grayBg/40"
                    }
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 border-b border-r border-brand-border px-4 py-3 font-semibold text-brand-textMain ${
                        row.hasDifference ? "bg-amber-50" : "bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span>{row.label}</span>
                        {row.hasDifference ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                            Differs
                          </span>
                        ) : null}
                      </div>
                    </th>
                    {row.values.map((val, idx) => (
                      <td
                        key={`${row.key}-${items[idx]?.id ?? idx}`}
                        className={`border-b border-r border-brand-border px-4 py-3 text-brand-textMain tabular-nums last:border-r-0 ${
                          row.hasDifference ? "font-medium" : ""
                        }`}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
