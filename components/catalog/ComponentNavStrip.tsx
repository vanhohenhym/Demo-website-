import React from "react";
import Link from "next/link";
import {
  COMPONENT_MENU_ITEMS,
  type ComponentNavItem,
} from "@/lib/cms/component-categories";
import { buildCatalogUrl } from "@/lib/catalog/url-params";

export interface ComponentNavStripProps {
  activeCategorySlug: string;
  items?: readonly ComponentNavItem[];
  builder?: "1";
  slot?: string;
  sockets?: string[];
  ramTypes?: string[];
  formFactors?: string[];
  storageInterfaces?: string[];
}

/**
 * Horizontal pill strip listing Component sub-categories (Processor, CPU Cooler,
 * Motherboard, RAM, SSD, etc.) when browsing `/category/component` or a Component sub-category.
 */
export function ComponentNavStrip({
  activeCategorySlug,
  items = COMPONENT_MENU_ITEMS,
  builder,
  slot,
  sockets,
  ramTypes,
  formFactors,
  storageInterfaces,
}: ComponentNavStripProps) {
  const normalizedActive = activeCategorySlug.trim().toLowerCase();
  const sharedContext = {
    ...(builder === "1" ? { builder: "1" as const } : {}),
    ...(slot ? { slot } : {}),
    ...(sockets?.length ? { sockets } : {}),
    ...(ramTypes?.length ? { ramTypes } : {}),
    ...(formFactors?.length ? { formFactors } : {}),
    ...(storageInterfaces?.length ? { storageInterfaces } : {}),
  };

  return (
    <nav
      aria-label="Component categories"
      className="rounded-card border border-brand-border bg-white p-3 shadow-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-brand-textMuted">
          Components:
        </span>
        {items.map((item) => {
          const isActive = normalizedActive === item.slug.toLowerCase();
          const href = buildCatalogUrl(`/category/${item.slug}`, sharedContext);

          return (
            <Link
              key={item.slug}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex items-center rounded-control border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1 ${
                isActive
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-brand-border bg-white text-brand-textMain hover:border-brand-blue hover:text-brand-blue"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
