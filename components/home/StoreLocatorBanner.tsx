import React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

export interface StoreLocatorBannerProps {
  heading?: string;
  subtitle?: string;
  ctaLabel?: string;
  href?: string;
}

export function StoreLocatorBanner({
  heading = "20+ Physical Stores",
  subtitle = "Visit Our Store & Get Your Desired IT Product!",
  ctaLabel = "Find Our Store",
  href = "/contact",
}: StoreLocatorBannerProps) {
  return (
    <section className="w-full rounded-xl overflow-hidden bg-gradient-to-r from-brand-storeCyan via-brand-storeBlue to-brand-storeNavy text-white shadow-card">
      <div className="px-6 sm:px-9 py-6 sm:py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <svg
            viewBox="0 0 36 36"
            className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 text-white"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M18 3C11.37 3 6 8.37 6 15c0 8.5 10.65 17.13 11.11 17.5a1.42 1.42 0 0 0 1.78 0C19.35 32.13 30 23.5 30 15c0-6.63-5.37-12-12-12zm0 16.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
          </svg>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,32,119,0.4)]">
              {heading}
            </h2>
            <p className="text-xs sm:text-sm text-white/95 mt-1 drop-shadow-[0_1px_2px_rgba(0,32,119,0.35)]">
              {subtitle}
            </p>
          </div>
        </div>

        <Link
          href={href}
          className="inline-flex items-center justify-center gap-2.5 rounded-full bg-brand-storeGold hover:bg-brand-storeGoldHover text-brand-navy text-sm font-bold px-7 py-3 shadow-md transition-colors whitespace-nowrap flex-shrink-0 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
        >
          <span>{ctaLabel}</span>
          <Search className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
