import React from "react";
import Link from "next/link";
import type { ComponentType, Product } from "@/lib/cms/types";
import { CompareButton } from "@/components/compare/CompareButton";
import { SafeProductImage } from "@/components/catalog/SafeProductImage";

export interface ProductCardProps {
  product: Product;
  priority?: boolean;
  badgeLabel?: string;
  giftLabel?: string;
  builderMode?: boolean;
  slot?: string;
}

function formatBdt(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")}৳`;
}

function computeSavingsBadge(product: Product): string | null {
  if (
    product.price != null &&
    Number.isFinite(product.price) &&
    product.salePrice != null &&
    Number.isFinite(product.salePrice) &&
    product.salePrice < product.price &&
    product.price > 0
  ) {
    const savings = Math.round(product.price - product.salePrice);
    const percent = Math.round((savings / product.price) * 100);
    return `Save: ${savings.toLocaleString("en-US")}৳ (-${percent}%)`;
  }
  return null;
}

function resolveGiftText(product: Product, giftLabel?: string): string | null {
  if (giftLabel && giftLabel.trim().length > 0) {
    return giftLabel.trim();
  }

  const attrGift = product.attributes.freeGift?.value;
  if (typeof attrGift === "string" && attrGift.trim().length > 0) {
    return attrGift.trim();
  }

  const unmappedGift =
    product.unmappedAttributes?.gift ?? product.unmappedAttributes?.free_gift;
  if (typeof unmappedGift === "string" && unmappedGift.trim().length > 0) {
    return unmappedGift.trim();
  }

  return null;
}

function formatGiftBadge(giftText: string): string {
  return /^gift\s*:/i.test(giftText) ? giftText : `Gift: ${giftText}`;
}

function ProductComponentArtwork({
  componentType,
  brand,
  label,
}: {
  componentType: ComponentType;
  brand: string;
  label: string;
}) {
  const uid = React.useId();
  const ramRgbId = `ramRgb-${uid}`;
  const screenGlowId = `screenGlow-${uid}`;
  const brandTag = brand && brand !== "Other" ? brand.toUpperCase() : "TECH";

  const renderShape = () => {
    switch (componentType) {
      case "motherboard":
        return (
          <g>
            <rect x="28" y="18" width="104" height="84" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <rect x="36" y="26" width="16" height="34" rx="2" fill="#475569" />
            <rect x="58" y="28" width="28" height="28" rx="3" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="64" y="34" width="16" height="16" rx="1.5" fill="#cbd5e1" />
            <rect x="94" y="26" width="5" height="34" rx="1" fill="#38bdf8" />
            <rect x="103" y="26" width="5" height="34" rx="1" fill="#94a3b8" />
            <rect x="112" y="26" width="5" height="34" rx="1" fill="#38bdf8" />
            <rect x="121" y="26" width="5" height="34" rx="1" fill="#94a3b8" />
            <rect x="44" y="70" width="52" height="5" rx="1.5" fill="#e2e8f0" />
            <rect x="44" y="81" width="44" height="4" rx="1.5" fill="#64748b" />
            <rect x="102" y="69" width="22" height="22" rx="3" fill="#3749bb" opacity="0.9" />
            <circle cx="113" cy="80" r="5" fill="#ef4a23" />
          </g>
        );
      case "cpu":
        return (
          <g>
            <rect x="40" y="20" width="80" height="80" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <rect x="50" y="30" width="60" height="60" rx="5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="60" y="40" width="40" height="40" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
            <path d="M52 20v-6M68 20v-6M84 20v-6M100 20v-6M52 100v6M68 100v6M84 100v6M100 100v6" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M40 36h-6M40 52h-6M40 68h-6M40 84h-6M120 36h6M120 52h6M120 68h6M120 84h6" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="54,84 62,84 54,76" fill="#ef4a23" />
          </g>
        );
      case "gpu":
        return (
          <g>
            <rect x="18" y="36" width="124" height="52" rx="7" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <rect x="24" y="42" width="112" height="40" rx="4" fill="#1e293b" />
            <circle cx="48" cy="62" r="14" fill="#0f172a" stroke="#475569" strokeWidth="2" />
            <circle cx="48" cy="62" r="5" fill="#3749bb" />
            <circle cx="80" cy="62" r="14" fill="#0f172a" stroke="#475569" strokeWidth="2" />
            <circle cx="80" cy="62" r="5" fill="#ef4a23" />
            <circle cx="112" cy="62" r="14" fill="#0f172a" stroke="#475569" strokeWidth="2" />
            <circle cx="112" cy="62" r="5" fill="#3749bb" />
            <rect x="28" y="32" width="60" height="4" rx="2" fill="#38bdf8" />
            <rect x="30" y="88" width="42" height="5" rx="1" fill="#f59e0b" />
          </g>
        );
      case "psu":
        return (
          <g>
            <rect x="28" y="28" width="104" height="64" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <circle cx="68" cy="60" r="22" fill="#0f172a" stroke="#475569" strokeWidth="2" />
            <circle cx="68" cy="60" r="15" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="68" cy="60" r="5" fill="#f59e0b" />
            <rect x="100" y="38" width="22" height="10" rx="2" fill="#334155" />
            <rect x="100" y="54" width="22" height="10" rx="2" fill="#334155" />
            <rect x="100" y="70" width="22" height="10" rx="2" fill="#ef4a23" />
          </g>
        );
      case "ram":
        return (
          <g>
            <rect x="22" y="38" width="116" height="32" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <rect x="26" y="34" width="108" height="6" rx="2" fill={`url(#${ramRgbId})`} />
            <rect x="34" y="48" width="18" height="14" rx="1.5" fill="#334155" />
            <rect x="60" y="48" width="18" height="14" rx="1.5" fill="#334155" />
            <rect x="86" y="48" width="18" height="14" rx="1.5" fill="#334155" />
            <rect x="112" y="48" width="14" height="14" rx="1.5" fill="#334155" />
            <rect x="28" y="70" width="44" height="6" rx="1" fill="#f59e0b" />
            <rect x="78" y="70" width="54" height="6" rx="1" fill="#f59e0b" />
          </g>
        );
      case "storage":
        return (
          <g>
            <rect x="24" y="42" width="112" height="34" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <rect x="36" y="49" width="24" height="20" rx="2" fill="#3749bb" />
            <rect x="66" y="49" width="38" height="20" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <line x1="72" y1="56" x2="96" y2="56" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
            <line x1="72" y1="62" x2="88" y2="62" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <rect x="128" y="48" width="8" height="22" rx="1" fill="#f59e0b" />
          </g>
        );
      case "cooler":
        return (
          <g>
            <rect x="44" y="20" width="72" height="72" rx="10" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <circle cx="80" cy="56" r="26" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="80" cy="56" r="14" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 3" />
            <circle cx="80" cy="56" r="6" fill="#38bdf8" />
            <rect x="58" y="92" width="44" height="8" rx="2" fill="#94a3b8" />
          </g>
        );
      case "case":
        return (
          <g>
            <rect x="44" y="16" width="72" height="88" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <rect x="52" y="24" width="38" height="66" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
            <circle cx="71" cy="40" r="9" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
            <circle cx="71" cy="64" r="9" fill="none" stroke="#ef4a23" strokeWidth="1.8" />
            <rect x="96" y="24" width="12" height="66" rx="2" fill="#334155" />
            <line x1="102" y1="30" x2="102" y2="82" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case "monitor":
        return (
          <g>
            <rect x="22" y="20" width="116" height="68" rx="5" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <rect x="28" y="26" width="104" height="56" rx="2" fill={`url(#${screenGlowId})`} />
            <rect x="73" y="88" width="14" height="12" fill="#475569" />
            <rect x="54" y="98" width="52" height="5" rx="2.5" fill="#334155" />
          </g>
        );
      case "keyboard":
        return (
          <g>
            <rect x="18" y="40" width="124" height="44" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <rect x="26" y="48" width="108" height="6" rx="1.5" fill="#475569" />
            <rect x="26" y="58" width="108" height="6" rx="1.5" fill="#38bdf8" opacity="0.8" />
            <rect x="26" y="68" width="24" height="6" rx="1.5" fill="#475569" />
            <rect x="54" y="68" width="52" height="6" rx="1.5" fill="#ef4a23" />
            <rect x="110" y="68" width="24" height="6" rx="1.5" fill="#475569" />
          </g>
        );
      case "mouse":
        return (
          <g>
            <rect x="56" y="20" width="48" height="80" rx="24" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <line x1="80" y1="20" x2="80" y2="52" stroke="#475569" strokeWidth="1.5" />
            <line x1="56" y1="52" x2="104" y2="52" stroke="#475569" strokeWidth="1.5" />
            <rect x="77" y="30" width="6" height="14" rx="3" fill="#ef4a23" />
            <circle cx="80" cy="74" r="5" fill="#38bdf8" opacity="0.85" />
          </g>
        );
      default:
        return (
          <g>
            <rect x="34" y="24" width="92" height="72" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <circle cx="80" cy="60" r="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="80" cy="60" r="7" fill="#ef4a23" />
          </g>
        );
    }
  };

  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-full w-full flex-col items-center justify-center rounded-md bg-gradient-to-b from-slate-50 to-slate-100/80 px-3 py-2 transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
    >
      <svg
        viewBox="0 0 160 116"
        className="h-28 w-full max-w-[160px] drop-shadow-sm"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={ramRgbId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4a23" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6e2594" />
          </linearGradient>
          <linearGradient id={screenGlowId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="55%" stopColor="#3749bb" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        {renderShape()}
      </svg>
      <span className="mt-1 rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-600 shadow-sm ring-1 ring-slate-200/80">
        {brandTag}
      </span>
    </div>
  );
}

function OfficialWarrantyBadge({ warranty }: { warranty: string }) {
  return (
    <div
      className="pointer-events-none absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded bg-white/95 px-1.5 py-0.5 shadow-sm ring-1 ring-slate-200/90"
      title={`${warranty} Official Warranty`}
      aria-label={`${warranty} Official Warranty`}
    >
      <svg
        viewBox="0 0 20 22"
        className="h-4 w-4 flex-shrink-0"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M10 1.5L2.5 4.8v5.5c0 4.6 3.2 8.7 7.5 10.2 4.3-1.5 7.5-5.6 7.5-10.2V4.8L10 1.5z"
          fill="#fff7ed"
          stroke="#244b7d"
          strokeWidth="1.6"
        />
        <path
          d="M6.8 11.2l2.2 2.2 4.4-4.6"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-[8px] font-extrabold tracking-tight text-amber-600">
          OFFICIAL
        </span>
        <span className="text-[7px] font-bold tracking-wider text-brand-blueDark">
          WARRANTY
        </span>
      </span>
    </div>
  );
}

function FreeGiftRibbon({
  giftText,
  hasWarrantyBadge,
}: {
  giftText: string;
  hasWarrantyBadge: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute bottom-2 left-2 z-10 inline-flex items-center gap-1.5 rounded bg-gradient-to-r from-brand-blue to-brand-sky px-2 py-1 text-white shadow-sm ${
        hasWarrantyBadge ? "max-w-[calc(100%-6.25rem)]" : "max-w-[calc(100%-1rem)]"
      }`}
      title={`Free Gift: ${giftText}`}
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 flex-shrink-0 text-amber-200"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="2" y="6.5" width="12" height="7.5" rx="1" />
        <rect x="1.5" y="4" width="13" height="2.5" rx="0.7" />
        <line x1="8" y1="4" x2="8" y2="14" />
        <path d="M8 4C6.8 2 4.5 2 4.5 3.3c0 .7.8.7 3.5.7z" />
        <path d="M8 4c1.2-2 3.5-2 3.5-.7 0 .7-.8.7-3.5.7z" />
      </svg>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-[9px] font-extrabold uppercase tracking-wider text-white">
          FREE GIFT
        </span>
        <span className="truncate text-[8px] font-medium text-sky-100">
          {giftText}
        </span>
      </span>
    </div>
  );
}

export function ProductCard({
  product,
  priority = false,
  badgeLabel,
  giftLabel,
  builderMode = false,
  slot,
}: ProductCardProps) {
  const explicitBadge = badgeLabel?.trim() || null;
  const savingsBadge = computeSavingsBadge(product);
  const resolvedGift = resolveGiftText(product, giftLabel);
  const computedBadge =
    explicitBadge ??
    savingsBadge ??
    (resolvedGift ? formatGiftBadge(resolvedGift) : null);

  const primaryImage = product.images[0];
  const imageAlt = primaryImage?.alt?.trim() || product.name;
  const warrantyText = product.warranty?.trim() || "";
  const hasWarrantyBadge = warrantyText.length > 0;

  const hasValidPrice =
    product.price != null && Number.isFinite(product.price);
  const hasDiscount =
    hasValidPrice &&
    product.salePrice != null &&
    Number.isFinite(product.salePrice) &&
    product.salePrice < (product.price as number);

  const builderHref = slot
    ? `/pc-builder?add=${encodeURIComponent(product.slug)}&slot=${encodeURIComponent(slot)}`
    : `/pc-builder?add=${encodeURIComponent(product.slug)}`;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-brand-border/60 bg-white shadow-card transition-shadow duration-200 hover:shadow-cardHover focus-within:ring-2 focus-within:ring-brand-orange/60">
      {/* Top-left Save / Gift / Promo Pill Badge */}
      {computedBadge ? (
        <span className="pointer-events-none absolute left-0 top-2.5 z-10 max-w-[calc(100%-0.75rem)] truncate rounded-r-full bg-brand-badgePurple px-2.5 py-0.5 text-[11px] font-semibold leading-tight text-white shadow-sm tabular-nums">
          {computedBadge}
        </span>
      ) : null}

      {/* Product Visual Frame */}
      <div className="relative flex h-44 w-full items-center justify-center overflow-hidden border-b border-brand-grayBg bg-white px-3 pb-3 pt-7 sm:h-48">
        <SafeProductImage
          src={primaryImage?.url}
          alt={imageAlt}
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          priority={priority}
          className="object-contain p-4 pt-7 transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          fallback={
            <ProductComponentArtwork
              componentType={product.componentType}
              brand={product.brand}
              label={imageAlt}
            />
          }
        />

        {/* Bottom-left FREE GIFT Blue Gradient Strip */}
        {resolvedGift ? (
          <FreeGiftRibbon
            giftText={resolvedGift}
            hasWarrantyBadge={hasWarrantyBadge}
          />
        ) : null}

        {/* Bottom-right Official Warranty Mini-Badge */}
        {hasWarrantyBadge ? (
          <OfficialWarrantyBadge warranty={warrantyText} />
        ) : null}
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col p-3.5 pt-3">
        <h3 className="text-xs font-semibold leading-snug text-brand-textMain sm:text-[13px]">
          <Link
            href={`/product/${product.slug}`}
            className="line-clamp-2 transition-colors hover:text-brand-orange group-hover:text-brand-orange after:absolute after:inset-0 focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto space-y-2.5 pt-3">
          {/* Price Row */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
            {!hasValidPrice || product.price == null ? (
              <span className="text-sm font-bold text-brand-orange">
                Call for price
              </span>
            ) : hasDiscount && product.salePrice != null ? (
              <>
                <span className="text-[15px] font-bold text-brand-orange">
                  {formatBdt(product.salePrice)}
                </span>
                <del className="text-xs font-medium text-brand-textMuted">
                  <span className="sr-only">Regular price: </span>
                  {formatBdt(product.price)}
                </del>
              </>
            ) : (
              <span className="text-[15px] font-bold text-brand-orange">
                {formatBdt(product.price)}
              </span>
            )}
          </div>

          {/* Compare + Optional Phase 4/6 PC Builder Mode CTA */}
          <CompareButton product={product} variant="card" />

          {builderMode ? (
            <Link
              href={builderHref}
              className="relative z-10 inline-flex w-full items-center justify-center rounded-control bg-brand-blue px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blueDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1"
            >
              Add to PC Builder
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
