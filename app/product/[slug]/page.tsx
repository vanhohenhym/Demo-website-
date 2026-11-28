import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Cpu, ShieldCheck, Tag } from "lucide-react";
import { CustomCmsAdapter, getCmsAdapter } from "@/lib/cms";
import { isAdminAuthenticated } from "@/lib/cms/admin-auth";
import type {
  Availability,
  CmsProductStatus,
  ComponentType,
  NormalizedAttribute,
  Product,
} from "@/lib/cms/types";
import { SITE_NAME, constructMetadata } from "@/lib/seo/metadata";
import { getProductSchema } from "@/lib/seo/schema";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SafeProductImage } from "@/components/catalog/SafeProductImage";
import { isRenderableImageUrl } from "@/lib/cms/image-url";
import { CompareButton } from "@/components/compare/CompareButton";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function resolveProductForPage(
  slug: string,
  previewParam: string | string[] | undefined
): Promise<{
  product: Product | null;
  isPreviewActive: boolean;
  previewStatus: CmsProductStatus | null;
}> {
  const adapter = getCmsAdapter();
  const wantsPreview =
    previewParam === "1" ||
    (Array.isArray(previewParam) && previewParam[0] === "1");

  if (wantsPreview && (await isAdminAuthenticated())) {
    if (adapter instanceof CustomCmsAdapter) {
      const preview = await adapter.getProductPreviewBySlug(slug);
      if (!preview) {
        return { product: null, isPreviewActive: true, previewStatus: null };
      }
      return {
        product: preview.product,
        isPreviewActive: true,
        previewStatus: preview.status,
      };
    }

    const fallbackProduct = await adapter.getProductBySlug(slug);
    return {
      product: fallbackProduct,
      isPreviewActive: true,
      previewStatus: fallbackProduct ? "publish" : null,
    };
  }

  const product = await adapter.getProductBySlug(slug);
  return {
    product,
    isPreviewActive: false,
    previewStatus: null,
  };
}

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

function mapComponentTypeToBuilderSlot(
  componentType: ComponentType
): string | null {
  switch (componentType) {
    case "cpu":
    case "motherboard":
    case "ram":
    case "gpu":
    case "storage":
    case "psu":
    case "case":
    case "cooler":
    case "monitor":
    case "keyboard":
    case "mouse":
      return componentType;
    case "other":
      return "others";
    default:
      return null;
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

function ProductImageFallback({
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
      className="flex h-full w-full flex-col items-center justify-center rounded-md bg-gradient-to-b from-slate-50 to-slate-100 p-6"
    >
      <svg
        viewBox="0 0 180 130"
        className="h-44 w-full max-w-[200px] drop-shadow-sm"
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
        <circle cx="90" cy="65" r="20" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="90" cy="65" r="7" fill="#ef4a23" />
      </svg>
      <span className="mt-2 rounded bg-white px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-slate-600 shadow-sm ring-1 ring-slate-200">
        {brand.toUpperCase()}
      </span>
    </div>
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { product, isPreviewActive } = await resolveProductForPage(
    slug,
    resolvedSearchParams.preview
  );

  if (!product) {
    return constructMetadata({
      title: "Product Not Found",
      description: "The requested product could not be found in our catalog.",
      path: `/product/${slug}`,
      noIndex: true,
    });
  }

  const primaryImage = product.images[0]?.url;
  const ogImage = isRenderableImageUrl(primaryImage)
    ? primaryImage
    : "/opengraph-image";

  return constructMetadata({
    title: product.name,
    description:
      product.shortDescription ||
      `${product.name} by ${product.brand} — view full normalized specifications, stock availability, and pricing at ${SITE_NAME}.`,
    path: `/product/${product.slug}`,
    canonicalPath: `/product/${product.slug}`,
    image: ogImage,
    noIndex: isPreviewActive,
    noFollow: isPreviewActive,
  });
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const adapter = getCmsAdapter();
  const { product, isPreviewActive, previewStatus } =
    await resolveProductForPage(slug, resolvedSearchParams.preview);

  if (!product) {
    notFound();
  }

  const relatedResult = await adapter.getProducts({
    category: product.categorySlug,
    limit: 12,
  });
  const relatedProducts = relatedResult.products
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const primaryImage = product.images[0];
  const availabilityBadge = getAvailabilityBadge(product.availability);
  const builderSlot = mapComponentTypeToBuilderSlot(product.componentType);
  const specRows = buildSpecRows(product);

  const hasValidPrice =
    product.price != null && Number.isFinite(product.price);
  const hasDiscount =
    hasValidPrice &&
    product.salePrice != null &&
    Number.isFinite(product.salePrice) &&
    product.salePrice < (product.price as number);

  const savingsAmount =
    hasDiscount && product.price != null && product.salePrice != null
      ? Math.round(product.price - product.salePrice)
      : 0;

  return (
    <div className="space-y-6">
      {isPreviewActive && previewStatus ? (
        <div
          role="status"
          className="sticky top-2 z-40 flex flex-wrap items-center justify-between gap-3 rounded-card border border-amber-300 bg-amber-50/95 px-4 py-2.5 text-xs font-medium text-amber-950 shadow-sm backdrop-blur"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              PREVIEW MODE ({previewStatus === "draft" ? "Draft" : "Live"})
            </span>
            <span>
              Authenticated CMS preview{" "}
              {previewStatus === "draft"
                ? "— this draft is hidden from public catalog pages."
                : "— this product is live on the storefront."}
            </span>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-control bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            Back to /admin
          </Link>
        </div>
      ) : null}
      <JsonLd schema={getProductSchema(product)} />
      <Breadcrumbs
        items={[
          {
            label: product.categoryName,
            href: `/category/${product.categorySlug}`,
          },
          {
            label: product.brand,
            href: `/category/${product.categorySlug}/${product.brandSlug}`,
          },
          { label: product.name },
        ]}
      />

      {/* Primary Product Overview Card */}
      <section className="grid grid-cols-1 gap-6 rounded-card border border-brand-border bg-white p-5 shadow-card lg:grid-cols-12">
        {/* Image Frame */}
        <div className="lg:col-span-5">
          <div className="relative flex h-72 w-full items-center justify-center overflow-hidden rounded-card border border-brand-border/70 bg-white p-4 sm:h-80">
            <SafeProductImage
              src={primaryImage?.url}
              alt={primaryImage?.alt || product.name}
              sizes="(max-width: 1024px) 100vw, 40vw"
              priority
              className="object-contain p-4"
              fallback={
                <ProductImageFallback
                  brand={product.brand}
                  categoryName={product.categoryName}
                />
              }
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col space-y-4 lg:col-span-7">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={`/category/${product.categorySlug}/${product.brandSlug}`}
                className="rounded-control bg-brand-grayBg px-2 py-0.5 font-semibold text-brand-blue hover:bg-brand-blue hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                {product.brand}
              </Link>
              <span
                className={`inline-flex items-center gap-1 rounded-control border px-2 py-0.5 font-semibold ${availabilityBadge.classes}`}
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                <span>{availabilityBadge.label}</span>
              </span>
              <span className="text-brand-textMuted tabular-nums">
                SKU: <strong className="text-brand-textMain">{product.sku}</strong>
              </span>
            </div>

            {/* Exactly ONE h1 */}
            <h1 className="text-xl font-bold leading-snug text-brand-textMain sm:text-2xl">
              {product.name}
            </h1>
          </div>

          {/* Pricing Block */}
          <div className="rounded-card border border-brand-border/70 bg-brand-grayBg/50 p-4">
            <div className="flex flex-wrap items-baseline gap-3 tabular-nums">
              {!hasValidPrice || product.price == null ? (
                <span className="text-lg font-bold text-brand-orange">
                  Call for price
                </span>
              ) : hasDiscount && product.salePrice != null ? (
                <>
                  <span className="text-2xl font-bold text-brand-orange">
                    {formatBdt(product.salePrice)}
                  </span>
                  <del className="text-sm font-medium text-brand-textMuted">
                    <span className="sr-only">Regular price: </span>
                    {formatBdt(product.price)}
                  </del>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-badgePurple px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    <span>Save {formatBdt(savingsAmount)}</span>
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-brand-orange">
                  {formatBdt(product.price)}
                </span>
              )}
            </div>
          </div>

          {product.shortDescription ? (
            <p className="text-sm leading-relaxed text-brand-textMain">
              {product.shortDescription}
            </p>
          ) : null}

          {product.warranty ? (
            <div className="inline-flex items-center gap-2 text-xs font-medium text-brand-textMain">
              <ShieldCheck
                className="h-4 w-4 text-emerald-600"
                aria-hidden="true"
              />
              <span>
                Warranty: <strong>{product.warranty}</strong>
              </span>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {builderSlot ? (
              <Link
                href={`/pc-builder?add=${encodeURIComponent(product.slug)}&slot=${encodeURIComponent(builderSlot)}`}
                className="inline-flex items-center gap-2 rounded-control bg-brand-blue px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-blueDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1"
              >
                <Cpu className="h-4 w-4" aria-hidden="true" />
                <span>Add to PC Builder</span>
              </Link>
            ) : null}

            <CompareButton product={product} variant="detail" />

            <Link
              href={`/category/${product.categorySlug}`}
              className="inline-flex items-center rounded-control border border-brand-border bg-white px-4 py-2.5 text-xs font-semibold text-brand-textMain transition-colors hover:border-brand-blue hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1"
            >
              Browse More {product.categoryName}
            </Link>
          </div>
        </div>
      </section>

      {/* Normalized Specifications Table */}
      <section
        aria-labelledby="specs-heading"
        className="rounded-card border border-brand-border bg-white p-5 shadow-card"
      >
        <h2
          id="specs-heading"
          className="mb-3 text-base font-bold text-brand-textMain"
        >
          Specification
        </h2>

        <div
          tabIndex={0}
          role="region"
          aria-labelledby="specs-heading"
          className="overflow-x-auto rounded-control border border-brand-border"
        >
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-brand-grayBg text-brand-textMain">
              <tr>
                <th
                  scope="col"
                  className="border-b border-brand-border px-4 py-2.5 font-semibold"
                >
                  Attribute
                </th>
                <th
                  scope="col"
                  className="border-b border-brand-border px-4 py-2.5 font-semibold"
                >
                  Value
                </th>
                <th
                  scope="col"
                  className="border-b border-brand-border px-4 py-2.5 font-semibold"
                >
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border bg-white">
              {specRows.length > 0 ? (
                specRows.map((row) => (
                  <tr key={`${row.label}-${row.value}`} className="hover:bg-brand-grayBg/40">
                    <th
                      scope="row"
                      className="w-1/3 px-4 py-2.5 font-medium text-brand-textMuted"
                    >
                      {row.label}
                    </th>
                    <td className="px-4 py-2.5 font-semibold text-brand-textMain tabular-nums">
                      {row.value}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.source === "parsed" ? (
                        <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                          Parsed ({row.confidence ?? "medium"})
                        </span>
                      ) : row.source === "override" ? (
                        <span className="inline-flex items-center rounded bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200">
                          Override ({row.confidence ?? "high"})
                        </span>
                      ) : row.source === "raw" ? (
                        <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          CMS Raw
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
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
                    className="px-4 py-6 text-center text-brand-textMuted"
                  >
                    No technical specifications provided by the connected CMS for this item.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 ? (
        <section aria-labelledby="related-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="related-heading"
              className="text-base font-bold text-brand-textMain"
            >
              Related {product.categoryName} Products
            </h2>
            <Link
              href={`/category/${product.categorySlug}`}
              className="text-xs font-semibold text-brand-blue hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-4">
            {relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
