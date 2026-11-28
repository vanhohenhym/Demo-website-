"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Cpu,
  ExternalLink,
  Eye,
  LayoutGrid,
  Monitor,
  Save,
  Send,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { normalizeRawProduct } from "@/lib/cms/normalize/pipeline";
import type {
  Availability,
  NormalizedAttribute,
  Product,
  RawAdapterProduct,
} from "@/lib/cms/types";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SafeProductImage } from "@/components/catalog/SafeProductImage";
import {
  parseOptionalNumber,
  parseOptionalPositivePrice,
  slugifyClient,
  type AdminCategoryRecord,
  type ProductFormState,
} from "./types";

export interface LiveProductPreviewProps {
  form: ProductFormState;
  categories: readonly AdminCategoryRecord[];
  isDirty: boolean;
  saving: boolean;
  savedSlug?: string;
  onSaveDraft: () => void;
  onPublish: () => void;
}

type PreviewViewMode = "card" | "pdp";

function formatBdt(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")}৳`;
}

function getAvailabilityBadge(availability: Availability): {
  label: string;
  classes: string;
} {
  switch (availability) {
    case "in_stock":
      return {
        label: "In Stock",
        classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "preorder":
      return {
        label: "Pre-Order",
        classes: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "upcoming":
      return {
        label: "Upcoming",
        classes: "bg-sky-50 text-sky-700 border-sky-200",
      };
    case "out_of_stock":
    default:
      return {
        label: "Out of Stock",
        classes: "bg-rose-50 text-rose-700 border-rose-200",
      };
  }
}

interface SpecRow {
  label: string;
  value: string;
  source?: "explicit" | "parsed" | "override" | "raw";
  confidence?: "high" | "medium" | "low";
}

function pushAttrRow(
  rows: SpecRow[],
  label: string,
  attr: NormalizedAttribute<unknown> | undefined,
  formatter: (val: unknown) => string | null
) {
  if (!attr) return;
  const formatted = formatter(attr.value);
  if (!formatted) return;
  rows.push({
    label,
    value: formatted,
    source: attr.source,
    confidence: attr.confidence,
  });
}

function buildSpecRows(product: Product): SpecRow[] {
  const rows: SpecRow[] = [];
  const attrs = product.attributes;

  pushAttrRow(rows, "Socket", attrs.socket, (v) =>
    typeof v === "string" && v.trim() ? v.trim() : null
  );
  pushAttrRow(rows, "RAM Type", attrs.ramType, (v) =>
    typeof v === "string" && v.trim() ? v.trim() : null
  );
  pushAttrRow(rows, "Form Factor", attrs.formFactor, (v) =>
    typeof v === "string" && v.trim() ? v.trim() : null
  );
  pushAttrRow(rows, "TDP", attrs.tdp, (v) =>
    typeof v === "number" && Number.isFinite(v) ? `${v}W` : null
  );
  pushAttrRow(rows, "Wattage", attrs.wattage, (v) =>
    typeof v === "number" && Number.isFinite(v) ? `${v}W` : null
  );
  pushAttrRow(rows, "Length", attrs.lengthMm, (v) =>
    typeof v === "number" && Number.isFinite(v) ? `${v} mm` : null
  );
  pushAttrRow(rows, "Max GPU Length", attrs.maxGpuLengthMm, (v) =>
    typeof v === "number" && Number.isFinite(v) ? `${v} mm` : null
  );
  pushAttrRow(rows, "Cooler Sockets", attrs.coolerSockets, (v) =>
    Array.isArray(v) && v.length > 0 ? v.join(", ") : null
  );

  const storageMulti = attrs.storageInterfaces;
  const storageSingle = attrs.storageInterface;
  if (
    storageMulti &&
    Array.isArray(storageMulti.value) &&
    storageMulti.value.length > 0
  ) {
    rows.push({
      label: "Storage Interface",
      value: storageMulti.value.join(", "),
      source: storageMulti.source,
      confidence: storageMulti.confidence,
    });
  } else {
    pushAttrRow(rows, "Storage Interface", storageSingle, (v) =>
      typeof v === "string" && v.trim() ? v.trim() : null
    );
  }

  if (product.unmappedAttributes) {
    for (const [key, val] of Object.entries(product.unmappedAttributes)) {
      if (val.trim()) {
        rows.push({
          label: key,
          value: val.trim(),
          source: "raw",
        });
      }
    }
  }

  return rows;
}

function PreviewImageFallback({
  brand,
  categoryName,
}: {
  brand: string;
  categoryName: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${brand} ${categoryName} product illustration`}
      className="flex h-full w-full flex-col items-center justify-center rounded-md bg-gradient-to-b from-slate-50 to-slate-100 p-4"
    >
      <svg
        viewBox="0 0 180 130"
        className="h-32 w-full max-w-[160px] drop-shadow-sm"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="26"
          y="20"
          width="128"
          height="90"
          rx="10"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="2.5"
        />
        <rect
          x="40"
          y="34"
          width="100"
          height="62"
          rx="6"
          fill="#0f172a"
          stroke="#475569"
          strokeWidth="1.5"
        />
        <circle
          cx="90"
          cy="65"
          r="20"
          fill="#1e3a8a"
          stroke="#38bdf8"
          strokeWidth="2"
        />
        <circle cx="90" cy="65" r="7" fill="#ef4a23" />
      </svg>
      <span className="mt-2 rounded bg-white px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-600 shadow-sm ring-1 ring-slate-200">
        {brand.toUpperCase()}
      </span>
    </div>
  );
}

function sanitizePreviewHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

export function LiveProductPreview({
  form,
  categories,
  isDirty,
  saving,
  savedSlug,
  onSaveDraft,
  onPublish,
}: LiveProductPreviewProps) {
  const [viewMode, setViewMode] = useState<PreviewViewMode>("card");
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const normalizedProduct = useMemo(() => {
    const matchedCat = categories.find((c) => c.slug === form.categorySlug);
    const title = form.title.trim() || "Untitled Product";
    const sku = form.sku.trim() || "SKU-PENDING";
    const slug = form.slug.trim() || slugifyClient(`${title}-${sku}`) || "preview-product";
    const parsedPrice = parseOptionalPositivePrice(form.priceInput);
    const parsedSalePrice = parseOptionalPositivePrice(form.salePriceInput);
    const parsedStock = parseOptionalNumber(form.stockQuantityInput);

    const raw: RawAdapterProduct = {
      id: form.id || "preview-draft",
      sku,
      title,
      slug,
      categorySlug: form.categorySlug || "other",
      categoryName: matchedCat?.name || form.categoryName || "Components",
      subCategorySlugs:
        form.subCategorySlugs.length > 0
          ? form.subCategorySlugs
          : matchedCat?.parentSlug
            ? [matchedCat.parentSlug]
            : undefined,
      explicitComponentType: form.explicitComponentType.trim() || undefined,
      brandTaxonomy: form.brandTaxonomy.trim() || undefined,
      price: parsedPrice,
      salePrice: parsedSalePrice,
      availability: form.availability,
      stockQuantity: parsedStock,
      images: form.images.filter((img) => img.url.trim().length > 0),
      shortDescription: form.shortDescription.trim() || undefined,
      descriptionHtml: form.descriptionHtml.trim() || undefined,
      explicitAttributes: form.explicitAttributes
        .filter((pair) => pair.key.trim().length > 0 && pair.value.trim().length > 0)
        .map((pair) => ({ key: pair.key.trim(), value: pair.value.trim() })),
      customFields: [],
      warranty: form.warranty.trim() || undefined,
      isFeatured: form.isFeatured,
      isFlashDeal: form.isFlashDeal,
    };

    return normalizeRawProduct(raw, { logUnmapped: false });
  }, [form, categories]);

  const specRows = useMemo(
    () => buildSpecRows(normalizedProduct),
    [normalizedProduct]
  );

  const activeImageIndex =
    selectedImageIdx < normalizedProduct.images.length ? selectedImageIdx : 0;
  const activeImage = normalizedProduct.images[activeImageIndex];
  const availabilityBadge = getAvailabilityBadge(normalizedProduct.availability);

  const hasValidPrice =
    normalizedProduct.price != null && Number.isFinite(normalizedProduct.price);
  const hasDiscount =
    hasValidPrice &&
    normalizedProduct.salePrice != null &&
    Number.isFinite(normalizedProduct.salePrice) &&
    normalizedProduct.salePrice < (normalizedProduct.price as number);
  const savingsAmount =
    hasDiscount &&
    normalizedProduct.price != null &&
    normalizedProduct.salePrice != null
      ? Math.round(normalizedProduct.price - normalizedProduct.salePrice)
      : 0;

  const canOpenFullPreview = Boolean(savedSlug && savedSlug.trim().length > 0);
  const fullPreviewHref = canOpenFullPreview
    ? `/product/${encodeURIComponent(savedSlug as string)}?preview=1`
    : undefined;

  return (
    <aside
      aria-label="Live Storefront Preview"
      className="flex flex-col overflow-hidden rounded-card border border-brand-border bg-white shadow-card"
    >
      {/* Publish & Actions Bar (WordPress Publish Metabox style) */}
      <div className="border-b border-brand-border bg-slate-50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-brand-blue" aria-hidden="true" />
            <h2 className="text-sm font-bold text-brand-textMain">
              Publish &amp; Live Storefront Preview
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {isDirty ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Unsaved edits
              </span>
            ) : null}
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                form.status === "publish"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {form.status === "publish" ? "Published" : "Draft"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-control border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-textMain transition-colors hover:border-brand-blue hover:text-brand-blue disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-control bg-brand-orange px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-orangeHover disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {saving
                ? "Publishing..."
                : form.id && form.status === "publish"
                  ? "Update Published"
                  : "Publish Product"}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {fullPreviewHref ? (
            <a
              href={fullPreviewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:text-brand-orange"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Open Full Page Preview</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-brand-textMuted">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Save once to enable full-page preview tab</span>
            </span>
          )}

          {/* View Switcher */}
          <div
            role="tablist"
            aria-label="Live preview mode"
            className="inline-flex rounded-control border border-brand-border bg-white p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "card"}
              onClick={() => setViewMode("card")}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                viewMode === "card"
                  ? "bg-brand-blue text-white"
                  : "text-brand-textMuted hover:text-brand-textMain"
              }`}
            >
              <LayoutGrid className="h-3 w-3" aria-hidden="true" />
              <span>Catalog Card View</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "pdp"}
              onClick={() => setViewMode("pdp")}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                viewMode === "pdp"
                  ? "bg-brand-blue text-white"
                  : "text-brand-textMuted hover:text-brand-textMain"
              }`}
            >
              <Monitor className="h-3 w-3" aria-hidden="true" />
              <span>Product Detail Page View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Viewport */}
      <div className="bg-brand-grayBg/80 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-brand-textMuted">
          <span>
            Updates live on every keystroke &middot; Resolved brand:{" "}
            <strong className="text-brand-textMain">
              {normalizedProduct.brand}
            </strong>{" "}
            &middot; Slot:{" "}
            <code className="rounded bg-white px-1 py-0.5 font-mono text-[10px] text-brand-blue ring-1 ring-brand-border">
              {normalizedProduct.componentType}
            </code>
          </span>
          {normalizedProduct.isFlashDeal ? (
            <span className="rounded bg-brand-orange/10 px-1.5 py-0.5 font-semibold text-brand-orange">
              Flash Deal
            </span>
          ) : null}
        </div>

        {viewMode === "card" ? (
          <div className="flex flex-col items-center py-2">
            <div
              className="w-full max-w-[265px]"
              onClickCapture={(e) => {
                const target = e.target as HTMLElement | null;
                if (target?.closest("a")) {
                  e.preventDefault();
                }
              }}
            >
              <ProductCard product={normalizedProduct} />
            </div>
            <p className="mt-3 text-center text-[11px] text-brand-textMuted">
              Rendered with the real storefront{" "}
              <code className="font-mono">&lt;ProductCard /&gt;</code> and{" "}
              <code className="font-mono">&lt;SafeProductImage /&gt;</code>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simulated PDP Breadcrumb */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-brand-textMuted">
              <span>Home</span>
              <span>/</span>
              <span>{normalizedProduct.categoryName}</span>
              <span>/</span>
              <span>{normalizedProduct.brand}</span>
              <span>/</span>
              <span className="truncate font-medium text-brand-textMain">
                {normalizedProduct.name}
              </span>
            </div>

            {/* Simulated PDP Overview Card */}
            <div className="space-y-4 rounded-card border border-brand-border bg-white p-4 shadow-card">
              <div className="space-y-2">
                <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-card border border-brand-border/70 bg-white p-3">
                  <SafeProductImage
                    src={activeImage?.url}
                    alt={activeImage?.alt || normalizedProduct.name}
                    sizes="360px"
                    className="object-contain p-3"
                    fallback={
                      <PreviewImageFallback
                        brand={normalizedProduct.brand}
                        categoryName={normalizedProduct.categoryName}
                      />
                    }
                  />
                </div>
                {normalizedProduct.images.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {normalizedProduct.images.map((img, idx) => (
                      <button
                        key={`${img.url}-${idx}`}
                        type="button"
                        onClick={() => setSelectedImageIdx(idx)}
                        className={`rounded border px-2 py-1 text-[10px] font-medium ${
                          idx === activeImageIndex
                            ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                            : "border-brand-border bg-white text-brand-textMuted hover:border-brand-blue"
                        }`}
                      >
                        Image {idx + 1}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-control bg-brand-grayBg px-2 py-0.5 font-semibold text-brand-blue">
                    {normalizedProduct.brand}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-control border px-2 py-0.5 font-semibold ${availabilityBadge.classes}`}
                  >
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    <span>{availabilityBadge.label}</span>
                  </span>
                  {normalizedProduct.stockQuantity != null ? (
                    <span className="text-[11px] font-medium text-brand-textMuted tabular-nums">
                      Stock: {normalizedProduct.stockQuantity}
                    </span>
                  ) : null}
                  <span className="text-brand-textMuted tabular-nums">
                    SKU:{" "}
                    <strong className="text-brand-textMain">
                      {normalizedProduct.sku}
                    </strong>
                  </span>
                </div>

                <h3 className="text-lg font-bold leading-snug text-brand-textMain">
                  {normalizedProduct.name}
                </h3>

                <div className="rounded-card border border-brand-border/70 bg-brand-grayBg/50 p-3">
                  <div className="flex flex-wrap items-baseline gap-2.5 tabular-nums">
                    {!hasValidPrice || normalizedProduct.price == null ? (
                      <span className="text-base font-bold text-brand-orange">
                        Call for price
                      </span>
                    ) : hasDiscount && normalizedProduct.salePrice != null ? (
                      <>
                        <span className="text-xl font-bold text-brand-orange">
                          {formatBdt(normalizedProduct.salePrice)}
                        </span>
                        <del className="text-xs font-medium text-brand-textMuted">
                          {formatBdt(normalizedProduct.price)}
                        </del>
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-badgePurple px-2 py-0.5 text-[10px] font-semibold text-white">
                          <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                          <span>Save {formatBdt(savingsAmount)}</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-xl font-bold text-brand-orange">
                        {formatBdt(normalizedProduct.price)}
                      </span>
                    )}
                  </div>
                </div>

                {normalizedProduct.shortDescription ? (
                  <p className="text-xs leading-relaxed text-brand-textMain">
                    {normalizedProduct.shortDescription}
                  </p>
                ) : null}

                {normalizedProduct.warranty ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-textMain">
                    <ShieldCheck
                      className="h-4 w-4 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span>
                      Warranty: <strong>{normalizedProduct.warranty}</strong>
                    </span>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-control bg-brand-blue px-3 py-2 text-[11px] font-semibold text-white">
                    <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Add to PC Builder</span>
                  </span>
                  <span className="inline-flex items-center rounded-control border border-brand-border bg-white px-3 py-2 text-[11px] font-semibold text-brand-textMain">
                    Browse More {normalizedProduct.categoryName}
                  </span>
                </div>
              </div>

              {normalizedProduct.descriptionHtml ? (
                <div className="border-t border-brand-border pt-3">
                  <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-textMuted">
                    Description Preview
                  </h4>
                  <div
                    className="prose prose-sm max-w-none text-xs leading-relaxed text-brand-textMain [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-1.5"
                    dangerouslySetInnerHTML={{
                      __html: sanitizePreviewHtml(
                        normalizedProduct.descriptionHtml
                      ),
                    }}
                  />
                </div>
              ) : null}
            </div>

            {/* Simulated Specification Table */}
            <div className="rounded-card border border-brand-border bg-white p-4 shadow-card">
              <h4 className="mb-2.5 text-sm font-bold text-brand-textMain">
                Specification (Live Normalized)
              </h4>
              <div className="overflow-x-auto rounded-control border border-brand-border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-brand-grayBg text-brand-textMain">
                    <tr>
                      <th
                        scope="col"
                        className="border-b border-brand-border px-3 py-2 font-semibold"
                      >
                        Attribute
                      </th>
                      <th
                        scope="col"
                        className="border-b border-brand-border px-3 py-2 font-semibold"
                      >
                        Value
                      </th>
                      <th
                        scope="col"
                        className="border-b border-brand-border px-3 py-2 font-semibold"
                      >
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border bg-white">
                    {specRows.length > 0 ? (
                      specRows.map((row) => (
                        <tr key={`${row.label}-${row.value}`}>
                          <th
                            scope="row"
                            className="w-1/3 px-3 py-2 font-medium text-brand-textMuted"
                          >
                            {row.label}
                          </th>
                          <td className="px-3 py-2 font-semibold text-brand-textMain tabular-nums">
                            {row.value}
                          </td>
                          <td className="px-3 py-2">
                            {row.source === "parsed" ? (
                              <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200">
                                Parsed ({row.confidence ?? "medium"})
                              </span>
                            ) : row.source === "override" ? (
                              <span className="inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-sky-200">
                                Override
                              </span>
                            ) : row.source === "raw" ? (
                              <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                CMS Raw
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                                Explicit
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-4 text-center text-brand-textMuted"
                        >
                          Add specs in Hardware Spec Builder to see live
                          normalized attributes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
