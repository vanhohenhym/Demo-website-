import React from "react";
import Link from "next/link";
import type { Brand } from "@/lib/cms/types";
import { buildCatalogUrl } from "@/lib/catalog/url-params";

export interface BrandNavStripProps {
  categorySlug: string;
  brands: Brand[];
  activeBrandSlug?: string;
  builder?: "1";
  slot?: string;
  sockets?: string[];
  ramTypes?: string[];
  formFactors?: string[];
  storageInterfaces?: string[];
}

export function BrandNavStrip({
  categorySlug,
  brands,
  activeBrandSlug,
  builder,
  slot,
  sockets,
  ramTypes,
  formFactors,
  storageInterfaces,
}: BrandNavStripProps) {
  if (brands.length === 0) {
    return null;
  }

  const normalizedActive = activeBrandSlug?.toLowerCase();
  const sharedContext = {
    ...(builder === "1" ? { builder: "1" as const } : {}),
    ...(slot ? { slot } : {}),
    ...(sockets?.length ? { sockets } : {}),
    ...(ramTypes?.length ? { ramTypes } : {}),
    ...(formFactors?.length ? { formFactors } : {}),
    ...(storageInterfaces?.length ? { storageInterfaces } : {}),
  };

  const allBrandsHref = buildCatalogUrl(
    `/category/${categorySlug}`,
    sharedContext
  );

  return (
    <nav
      aria-label="Brands in category"
      className="rounded-card border border-brand-border bg-white p-3 shadow-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-brand-textMuted">
          Brands:
        </span>
        <Link
          href={allBrandsHref}
          aria-current={!normalizedActive ? "page" : undefined}
          className={`inline-flex items-center rounded-control border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1 ${
            !normalizedActive
              ? "border-brand-blue bg-brand-blue text-white"
              : "border-brand-border bg-brand-grayBg/60 text-brand-textMain hover:border-brand-blue hover:text-brand-blue"
          }`}
        >
          All Brands
        </Link>

        {brands.map((brand) => {
          const isActive = normalizedActive === brand.slug.toLowerCase();
          const href = buildCatalogUrl(
            `/category/${categorySlug}/${brand.slug}`,
            sharedContext
          );

          return (
            <Link
              key={brand.slug}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex items-center gap-1 rounded-control border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1 ${
                isActive
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-brand-border bg-white text-brand-textMain hover:border-brand-blue hover:text-brand-blue"
              }`}
            >
              <span>{brand.name}</span>
              <span
                className={
                  isActive ? "text-white/85" : "text-brand-textMuted"
                }
              >
                ({brand.productCount})
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
