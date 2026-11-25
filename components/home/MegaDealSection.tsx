import React from "react";
import Link from "next/link";
import type { Product } from "@/lib/cms/types";
import { ProductCard } from "@/components/catalog/ProductCard";
import { MegaDealCountdown } from "@/components/home/MegaDealCountdown";

export interface MegaDealSectionProps {
  title?: string;
  subtitle?: string;
  targetDateIso?: string;
  products: readonly Product[];
  showAllHref?: string;
  showAllLabel?: string;
}

function MegaDealRibbonBanner() {
  return (
    <div className="mb-4 rounded-2xl bg-[#2c1419] p-1 shadow-sm ring-1 ring-amber-300/35 md:rounded-full">
      <div className="relative overflow-hidden rounded-xl border border-dashed border-amber-300/75 bg-gradient-to-r from-brand-megaRibbonFrom via-brand-megaRibbonMid to-brand-megaRibbonFrom px-4 py-3 text-white sm:px-7 sm:py-3.5 md:rounded-full">
        {/* Subtle center warm radial spotlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-1/4 -top-6 h-24 rounded-full bg-amber-300/20 blur-xl"
        />

        <div className="relative z-10 flex flex-col items-center justify-between gap-3 md:flex-row md:gap-4">
          {/* Left Navy Ornamental Discount Pill */}
          <div className="inline-flex items-center justify-center rounded-full border border-amber-300/80 bg-[#0b2047] px-4 py-1.5 text-center shadow-md sm:px-5">
            <span className="text-xs font-extrabold tracking-tight text-white tabular-nums sm:text-sm">
              Up to{" "}
              <span className="text-amber-300">30,000৳</span>{" "}
              OFF
            </span>
          </div>

          {/* Center 11.11 Emblem + Lightning Bolt + Festival Title */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-center">
            <div className="relative inline-flex items-center gap-1.5">
              <span className="text-2xl font-black leading-none tracking-tight text-white drop-shadow-[0_2px_0_rgba(104,22,4,0.95)] tabular-nums sm:text-3xl">
                11.11
              </span>
              <svg
                viewBox="0 0 20 24"
                className="h-5 w-4 flex-shrink-0 text-amber-300 drop-shadow-sm sm:h-6 sm:w-5"
                fill="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M11.8 1L2 13.4h6.7L7.4 23l10.6-12.8h-6.8L11.8 1z" />
              </svg>
            </div>

            <span
              aria-hidden="true"
              className="hidden h-7 w-px bg-amber-200/60 sm:inline-block"
            />

            <div className="text-center sm:text-left">
              <span className="block text-sm font-extrabold leading-tight tracking-tight text-amber-50 sm:text-base">
                Mega Savings Festival
              </span>
              <span className="block text-[11px] font-medium text-amber-100/90">
                Genuine Tech &amp; Official Warranty
              </span>
            </div>
          </div>

          {/* Right Navy Ornamental Delivery Pill */}
          <div className="inline-flex items-center justify-center gap-1.5 rounded-full border border-amber-300/80 bg-[#0b2047] px-4 py-1.5 text-center shadow-md sm:px-5">
            <span className="text-xs font-bold text-white sm:text-sm">
              Free Delivery
            </span>
            <span
              aria-hidden="true"
              className="text-amber-300/80"
            >
              ·
            </span>
            <span className="text-xs font-extrabold text-amber-300 tabular-nums sm:text-sm">
              64 Districts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MegaDealSection({
  title = "11.11 Mega Deal",
  subtitle = "Enjoy Exciting Discounts on your desired Products!",
  targetDateIso,
  products,
  showAllHref,
  showAllLabel = "Show all",
}: MegaDealSectionProps) {
  return (
    <section className="flash-sale-frame rounded-2xl p-4 shadow-card sm:p-5">
      {/* Header Row: Title/Subtitle Left, Live Countdown Right */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-brand-textMain sm:text-xl">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 sm:text-[13px]">
            {subtitle}
          </p>
        </div>

        <MegaDealCountdown targetDateIso={targetDateIso} />
      </div>

      {/* Full-Width Horizontal Campaign Ribbon Banner */}
      <MegaDealRibbonBanner />

      {/* 5-Column Multi-Row Live CMS Product Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 items-stretch gap-3 gap-y-3.5 sm:grid-cols-2 sm:gap-3.5 sm:gap-y-4 md:grid-cols-3 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-brand-blue/30 bg-white/90 p-8 text-center">
          <p className="text-sm font-semibold text-brand-textMain">
            No Mega Deal items are currently available.
          </p>
          <p className="text-xs text-brand-textMuted">
            Explore our categories for the latest hardware arrivals and offers.
          </p>
        </div>
      )}

      {/* Optional Full-Width Bottom Show All CTA (Activated in Mini-Phase 7) */}
      {showAllHref ? (
        <div className="mt-5">
          <Link
            href={showAllHref}
            className="inline-flex w-full items-center justify-center rounded-control bg-brand-blue px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-blueDark sm:text-sm"
          >
            {showAllLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
