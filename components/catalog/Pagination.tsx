import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CatalogQueryParams } from "@/lib/cms/types";
import { DEFAULT_LIMIT, buildCatalogUrl } from "@/lib/catalog/url-params";

export interface PaginationProps {
  basePath: string;
  query: CatalogQueryParams;
  total: number;
}

type PageToken = number | "ellipsis-left" | "ellipsis-right";

function buildPageTokens(current: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const tokens: PageToken[] = [1];
  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(totalPages - 1, current + 1);

  if (windowStart > 2) {
    tokens.push("ellipsis-left");
  }
  for (let p = windowStart; p <= windowEnd; p += 1) {
    tokens.push(p);
  }
  if (windowEnd < totalPages - 1) {
    tokens.push("ellipsis-right");
  }
  tokens.push(totalPages);

  return tokens;
}

export function Pagination({ basePath, query, total }: PaginationProps) {
  const limit = query.limit ?? DEFAULT_LIMIT;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(Math.max(1, query.page ?? 1), totalPages);

  if (total <= 0 || totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(total, currentPage * limit);
  const tokens = buildPageTokens(currentPage, totalPages);

  const pageHref = (page: number) =>
    buildCatalogUrl(basePath, {
      ...query,
      brand: undefined,
      page,
    });

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-card border border-brand-border bg-white px-4 py-3 shadow-card sm:flex-row">
      <p className="text-xs text-brand-textMuted tabular-nums">
        Showing <span className="font-semibold text-brand-textMain">{startItem}</span>–
        <span className="font-semibold text-brand-textMain">{endItem}</span> of{" "}
        <span className="font-semibold text-brand-textMain">{total}</span> products
      </p>

      <nav aria-label="Pagination">
        <ul className="flex flex-wrap items-center gap-1">
          <li>
            {currentPage > 1 ? (
              <Link
                href={pageHref(currentPage - 1)}
                aria-label="Previous page"
                className="inline-flex h-8 items-center gap-1 rounded-control border border-brand-border bg-white px-2.5 text-xs font-medium text-brand-textMain transition-colors hover:border-brand-blue hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Prev</span>
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-control border border-brand-border bg-brand-grayBg px-2.5 text-xs font-medium text-brand-textMuted opacity-60"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Prev</span>
              </span>
            )}
          </li>

          {tokens.map((token) => {
            if (typeof token !== "number") {
              return (
                <li key={token} aria-hidden="true">
                  <span className="inline-flex h-8 min-w-[2rem] items-center justify-center px-1 text-xs text-brand-textMuted">
                    …
                  </span>
                </li>
              );
            }

            const isCurrent = token === currentPage;
            return (
              <li key={token}>
                <Link
                  href={pageHref(token)}
                  aria-current={isCurrent ? "page" : undefined}
                  aria-label={`Page ${token}`}
                  className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-control border px-2 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange ${
                    isCurrent
                      ? "border-brand-blue bg-brand-blue text-white"
                      : "border-brand-border bg-white text-brand-textMain hover:border-brand-blue hover:text-brand-blue"
                  }`}
                >
                  {token}
                </Link>
              </li>
            );
          })}

          <li>
            {currentPage < totalPages ? (
              <Link
                href={pageHref(currentPage + 1)}
                aria-label="Next page"
                className="inline-flex h-8 items-center gap-1 rounded-control border border-brand-border bg-white px-2.5 text-xs font-medium text-brand-textMain transition-colors hover:border-brand-blue hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-control border border-brand-border bg-brand-grayBg px-2.5 text-xs font-medium text-brand-textMuted opacity-60"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
}
