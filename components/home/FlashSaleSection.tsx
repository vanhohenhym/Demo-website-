import React from "react";
import Link from "next/link";
import type { Product } from "@/lib/cms/types";
import { ProductCard } from "@/components/catalog/ProductCard";

export interface FlashSaleSectionProps {
  title: string;
  subtitle: string;
  showAllHref: string;
  products: readonly Product[];
  posterVariant?: "blue" | "orange";
  posterTitle: string;
  posterSubtitle: string;
  posterBadge?: string;
}

function FestiveTrimBar({ variant }: { variant: "blue" | "orange" }) {
  const accentColor = variant === "blue" ? "#38bdf8" : "#fde047";
  return (
    <svg
      viewBox="0 0 240 10"
      className="h-2.5 w-full flex-shrink-0"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="240" height="10" fill="#071226" fillOpacity="0.45" />
      <g fill={accentColor} fillOpacity="0.9">
        <polygon points="8,5 12,2 16,5 12,8" />
        <polygon points="32,5 36,2 40,5 36,8" />
        <polygon points="56,5 60,2 64,5 60,8" />
        <polygon points="80,5 84,2 88,5 84,8" />
        <polygon points="104,5 108,2 112,5 108,8" />
        <polygon points="128,5 132,2 136,5 132,8" />
        <polygon points="152,5 156,2 160,5 156,8" />
        <polygon points="176,5 180,2 184,5 180,8" />
        <polygon points="200,5 204,2 208,5 204,8" />
        <polygon points="224,5 228,2 232,5 228,8" />
      </g>
      <g fill="#ef4a23">
        <circle cx="24" cy="5" r="1.8" />
        <circle cx="48" cy="5" r="1.8" />
        <circle cx="72" cy="5" r="1.8" />
        <circle cx="96" cy="5" r="1.8" />
        <circle cx="120" cy="5" r="1.8" />
        <circle cx="144" cy="5" r="1.8" />
        <circle cx="168" cy="5" r="1.8" />
        <circle cx="192" cy="5" r="1.8" />
        <circle cx="216" cy="5" r="1.8" />
      </g>
    </svg>
  );
}

function FlashSalePosterCard({
  variant,
  posterTitle,
  posterSubtitle,
  posterBadge,
  href,
}: {
  variant: "blue" | "orange";
  posterTitle: string;
  posterSubtitle: string;
  posterBadge: string;
  href: string;
}) {
  const isBlue = variant === "blue";
  const surfaceGradient = isBlue
    ? "bg-gradient-to-b from-brand-flashPosterBlueFrom via-[#0a2a6b] to-brand-flashPosterBlueTo"
    : "bg-gradient-to-b from-brand-flashPosterOrangeFrom via-brand-orange to-brand-flashPosterOrangeTo";

  const pillClasses = isBlue
    ? "border-sky-400/60 bg-[#061533]/90 text-white"
    : "border-amber-300/70 bg-[#081b3e]/95 text-white";

  return (
    <Link
      href={href}
      aria-label={`${posterTitle} — ${posterSubtitle}`}
      className={`group relative flex h-full min-h-[280px] flex-col justify-between overflow-hidden rounded-lg text-white shadow-card transition-shadow duration-200 hover:shadow-cardHover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange sm:min-h-[300px] ${surfaceGradient}`}
    >
      {/* Top Festive Border Strip */}
      <FestiveTrimBar variant={variant} />

      {/* Ambient Studio Glow & Inline SVG Focal Artwork */}
      <div className="relative flex flex-1 flex-col items-center justify-between px-4 py-4 text-center">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-4 h-32 rounded-full blur-2xl ${
            isBlue ? "top-6 bg-sky-400/25" : "bottom-4 bg-amber-300/35"
          }`}
        />

        {isBlue ? (
          <>
            {/* Hero Vector Hardware Showcase (Blue Variant: Top Artwork) */}
            <svg
              viewBox="0 0 180 120"
              className="relative z-10 h-28 w-full max-w-[176px] drop-shadow-md transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              aria-hidden="true"
              focusable="false"
            >
              <g>
                {/* Stylized Studio Hardware Showcase */}
                <rect
                  x="46"
                  y="10"
                  width="88"
                  height="98"
                  rx="10"
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                />
                <rect x="56" y="20" width="68" height="44" rx="5" fill="#0f172a" />
                <circle cx="90" cy="42" r="14" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="2.5" />
                <circle cx="90" cy="42" r="5" fill="#38bdf8" />
                <rect x="64" y="72" width="52" height="10" rx="3" fill="#0f172a" />
                <circle cx="76" cy="77" r="2.2" fill="#38bdf8" />
                <circle cx="90" cy="77" r="2.2" fill="#f59e0b" />
                <circle cx="104" cy="77" r="2.2" fill="#ef4a23" />
                <rect x="118" y="28" width="12" height="6" rx="2" fill="#a3e635" />
                <rect x="74" y="92" width="32" height="4" rx="2" fill="#94a3b8" />
              </g>
            </svg>

            {/* Campaign Emblem + Ornamental Headline Pill */}
            <div className="relative z-10 mt-3 w-full space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-navy/80 px-3 py-1 text-[11px] font-extrabold tracking-wide text-amber-300 ring-1 ring-white/20 tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" aria-hidden="true" />
                <span>{posterBadge}</span>
              </div>

              <p className="text-[11px] font-medium leading-snug text-white/95">
                {posterSubtitle}
              </p>

              <div
                className={`mx-auto w-full rounded-full border px-3 py-2 text-center shadow-md ${pillClasses}`}
              >
                <span className="block text-sm font-extrabold leading-tight tracking-tight">
                  {posterTitle}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Orange Variant (Image 4): Festive Badge + Dark Navy Ribbon Pill Top */}
            <div className="relative z-10 w-full space-y-2 pt-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-navy/85 px-3 py-1 text-[11px] font-extrabold tracking-wide text-amber-300 ring-1 ring-amber-200/30 tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                <span>{posterBadge}</span>
              </div>

              <p className="text-[11px] font-medium leading-snug text-white/95">
                {posterSubtitle}
              </p>

              <div
                className={`mx-auto w-full rounded-full border px-3 py-2 text-center shadow-md ${pillClasses}`}
              >
                <span className="block text-sm font-extrabold leading-tight tracking-tight">
                  {posterTitle}
                </span>
              </div>
            </div>

            {/* Studio-Pedestal Gadget & Hardware Showcase (Orange Variant: Bottom Artwork) */}
            <svg
              viewBox="0 0 180 116"
              className="relative z-10 mt-3 h-28 w-full max-w-[176px] drop-shadow-md transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              aria-hidden="true"
              focusable="false"
            >
              <g>
                {/* Warm Studio Pedestal Blocks */}
                <rect x="16" y="84" width="44" height="22" rx="4" fill="#ea580c" stroke="#fdba74" strokeWidth="1.2" />
                <rect x="64" y="72" width="52" height="34" rx="4" fill="#f97316" stroke="#fde68a" strokeWidth="1.4" />
                <rect x="120" y="80" width="44" height="26" rx="4" fill="#ea580c" stroke="#fdba74" strokeWidth="1.2" />

                {/* Left Pedestal: Sleek Gaming Mouse */}
                <rect x="28" y="46" width="20" height="36" rx="10" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" />
                <rect x="36.5" y="52" width="3" height="8" rx="1.5" fill="#f59e0b" />

                {/* Center Pedestal: Wide Gaming Display / Cooler Showcase */}
                <rect x="58" y="18" width="64" height="44" rx="5" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.8" />
                <rect x="63" y="23" width="54" height="34" rx="2.5" fill="#1e293b" />
                <circle cx="80" cy="40" r="9" fill="#0f172a" stroke="#fb923c" strokeWidth="2" />
                <circle cx="80" cy="40" r="3" fill="#ef4a23" />
                <circle cx="100" cy="40" r="9" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="100" cy="40" r="3" fill="#38bdf8" />
                <rect x="85" y="62" width="10" height="8" fill="#475569" />
                <rect x="75" y="69" width="30" height="3" rx="1.5" fill="#94a3b8" />

                {/* Right Pedestal: Compact Audio / Smart Gadget */}
                <rect x="130" y="42" width="24" height="36" rx="5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <rect x="134" y="47" width="16" height="14" rx="2" fill="#0f172a" />
                <circle cx="142" cy="68" r="3.5" fill="#ef4a23" />
              </g>
            </svg>
          </>
        )}
      </div>

      {/* Bottom Festive Border Strip */}
      <FestiveTrimBar variant={variant} />
    </Link>
  );
}

export function FlashSaleSection({
  title,
  subtitle,
  showAllHref,
  products,
  posterVariant = "blue",
  posterTitle,
  posterSubtitle,
  posterBadge = "11.11 FLASH SALE",
}: FlashSaleSectionProps) {
  const visibleProducts = products.slice(0, 4);

  return (
    <section className="flash-sale-frame rounded-2xl p-4 shadow-card sm:p-5">
      {/* Header Row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-brand-textMain sm:text-xl">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 sm:text-[13px]">
            {subtitle}
          </p>
        </div>

        <Link
          href={showAllHref}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-control bg-brand-blue px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-blueDark"
        >
          Show All
        </Link>
      </div>

      {/* 5-Column Body Grid: Col 1 Poster + Cols 2–5 Product Cards */}
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-5">
        <FlashSalePosterCard
          variant={posterVariant}
          posterTitle={posterTitle}
          posterSubtitle={posterSubtitle}
          posterBadge={posterBadge}
          href={showAllHref}
        />

        {visibleProducts.length > 0 ? (
          visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-brand-blue/30 bg-white/90 p-6 text-center sm:col-span-1 md:col-span-2 lg:col-span-4">
            <p className="text-sm font-semibold text-brand-textMain">
              No flash sale deals are currently active.
            </p>
            <p className="text-xs text-brand-textMuted">
              Check our catalog for the latest hardware arrivals and everyday offers.
            </p>
            <Link
              href={showAllHref}
              className="mt-1 inline-flex items-center justify-center rounded-control bg-brand-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blueDark"
            >
              Browse Catalog
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
