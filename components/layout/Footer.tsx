import React from "react";
import Link from "next/link";
import { Phone, MapPin } from "lucide-react";
import { CookieSettingsButton } from "@/components/analytics/CookieSettingsButton";

interface FooterLinkItem {
  label: string;
  href: string;
}

const ABOUT_LINK_COLUMNS: readonly (readonly FooterLinkItem[])[] = [
  [
    { label: "Affiliate Program", href: "/contact" },
    { label: "Online Delivery", href: "/terms#delivery" },
    { label: "Refund and Return Policy", href: "/terms#refund" },
    { label: "Blog", href: "/category/component" },
  ],
  [
    { label: "EMI Terms", href: "/terms#emi" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Star Point Policy", href: "/terms#star-points" },
    { label: "Contact Us", href: "/contact" },
  ],
  [
    { label: "About Us", href: "/contact" },
    { label: "Terms and Conditions", href: "/terms" },
    { label: "Career", href: "/contact" },
    { label: "Brands", href: "/category/component" },
  ],
] as const;

export function Footer() {
  return (
    <footer className="mt-14 w-full border-t border-white/10 bg-brand-navy text-xs text-gray-300">
      <div className="mx-auto max-w-site px-4 pb-8 pt-12">
        {/* Top 3-Zone Grid: SUPPORT | ABOUT US (3-col) | STAY CONNECTED */}
        <div className="grid grid-cols-1 gap-10 pb-10 lg:grid-cols-12">
          {/* Left Zone: SUPPORT */}
          <div className="lg:col-span-3">
            <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.22em] text-white">
              SUPPORT
            </h2>
            <div className="space-y-3.5">
              <a
                href="tel:16793"
                className="flex items-center gap-4 rounded-full border border-white/15 px-5 py-3 transition-colors hover:border-brand-orange/70"
              >
                <Phone
                  className="h-5 w-5 flex-shrink-0 text-white"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span
                  aria-hidden="true"
                  className="h-7 w-px flex-shrink-0 bg-white/15"
                />
                <span className="flex flex-col leading-tight">
                  <span className="text-[11px] text-gray-400">9 AM - 8 PM</span>
                  <span className="mt-0.5 text-base font-bold text-brand-orange tabular-nums">
                    16793
                  </span>
                </span>
              </a>

              <Link
                href="/contact"
                className="flex items-center gap-4 rounded-full border border-white/15 px-5 py-3 transition-colors hover:border-brand-orange/70"
              >
                <MapPin
                  className="h-5 w-5 flex-shrink-0 text-white"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span
                  aria-hidden="true"
                  className="h-7 w-px flex-shrink-0 bg-white/15"
                />
                <span className="flex flex-col leading-tight">
                  <span className="text-[11px] text-gray-400">Store Locator</span>
                  <span className="mt-0.5 text-base font-bold text-brand-orange">
                    Find Our Stores
                  </span>
                </span>
              </Link>
            </div>
          </div>

          {/* Center Zone: ABOUT US (3-Column Link Grid) */}
          <div className="lg:col-span-6">
            <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.22em] text-white">
              ABOUT US
            </h2>
            <nav
              aria-label="Footer"
              className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3"
            >
              {ABOUT_LINK_COLUMNS.map((column, colIdx) => (
                <ul key={colIdx} className="space-y-3">
                  {column.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-[13px] text-gray-300 underline-offset-2 transition-colors hover:text-brand-orange hover:underline"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </nav>
          </div>

          {/* Right Zone: STAY CONNECTED */}
          <div className="lg:col-span-3">
            <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.22em] text-white">
              STAY CONNECTED
            </h2>
            <address className="space-y-2.5 not-italic leading-relaxed">
              <p className="text-[13px] font-semibold text-white">
                Star Tech Ltd
              </p>
              <p className="text-[13px] text-gray-400">
                Head Office: 28 Kazi Nazrul Islam Ave, Navana Zohura Square, Dhaka 1000
              </p>
              <div className="pt-0.5">
                <p className="text-[12px] text-gray-300">Email:</p>
                <a
                  href="mailto:webteam@startechbd.com"
                  className="text-[13px] text-brand-orange underline-offset-2 hover:underline"
                >
                  webteam@startechbd.com
                </a>
              </div>
            </address>
          </div>
        </div>

        {/* Middle App Download & Social Strip */}
        <div className="flex flex-col items-center justify-between gap-4 border-y border-white/10 py-5 md:flex-row">
          {/* App Download Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <span className="text-xs text-gray-300">
              Experience Star Tech App on your mobile:
            </span>

            <a
              href="https://play.google.com/store"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-md border border-white/25 bg-white/[0.03] px-3 py-1.5 text-white transition-colors hover:border-brand-orange hover:bg-white/[0.06]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 flex-shrink-0"
                fill="none"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M4 3.5l11.2 8.5L4 20.5V3.5z" fill="#38bdf8" />
                <path d="M15.2 12l4.8 3.6-12.5 5.4 7.7-9z" fill="#ef4a23" />
                <path d="M15.2 12l4.8-3.6-12.5-5.4 7.7 9z" fill="#22c55e" />
                <path d="M15.2 12l4.8-3.6v7.2L15.2 12z" fill="#f59e0b" />
              </svg>
              <span className="flex flex-col text-left leading-none">
                <span className="text-[9px] text-gray-300">Download on</span>
                <span className="mt-0.5 text-xs font-semibold text-white">
                  Google Play
                </span>
              </span>
            </a>

            <a
              href="https://www.apple.com/app-store/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-md border border-white/25 bg-white/[0.03] px-3 py-1.5 text-white transition-colors hover:border-brand-orange hover:bg-white/[0.06]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 flex-shrink-0 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <path d="M12 7.5l-4 8.5" />
                <path d="M12 7.5l4 8.5" />
                <path d="M7.5 13.5h9" />
              </svg>
              <span className="flex flex-col text-left leading-none">
                <span className="text-[9px] text-gray-300">Download on</span>
                <span className="mt-0.5 text-xs font-semibold text-white">
                  App Store
                </span>
              </span>
            </a>
          </div>

          {/* 4 Circular Social Buttons */}
          <div className="flex items-center gap-2.5">
            <a
              href="https://www.whatsapp.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Star Tech on WhatsApp"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand-orange"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12.04 2a9.94 9.94 0 0 0-8.6 14.92L2 22l5.24-1.37A9.94 9.94 0 1 0 12.04 2zm5.82 14.08c-.24.68-1.42 1.3-1.97 1.38-.52.08-1.18.12-1.9-.11-.44-.14-1-.33-1.72-.64-3.03-1.31-5-4.36-5.15-4.56-.15-.2-1.23-1.64-1.23-3.13 0-1.49.78-2.22 1.06-2.52.28-.3.61-.38.81-.38h.58c.19 0 .44-.07.69.53.25.6.85 2.08.92 2.23.08.15.13.33.03.53-.1.2-.15.33-.3.51-.15.18-.32.4-.45.54-.15.15-.31.32-.13.62.18.3.79 1.31 1.7 2.12 1.17 1.04 2.15 1.37 2.46 1.52.3.15.48.13.66-.08.18-.2.76-.89.96-1.19.2-.3.41-.25.69-.15.28.1 1.78.84 2.08.99.3.15.5.23.58.35.07.13.07.74-.17 1.42z" />
              </svg>
            </a>

            <a
              href="https://www.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Star Tech on Facebook"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand-orange"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.24-1.46 1.49-1.46h1.59V4.45c-.28-.04-1.22-.12-2.32-.12-2.3 0-3.87 1.4-3.87 3.98v2.19H7.8v3h2.59V21h3.11z" />
              </svg>
            </a>

            <a
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Star Tech on YouTube"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand-orange"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9C1.9 8.9 1.9 12 1.9 12s0 3.1.5 4.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9c.5-1.7.5-4.8.5-4.8s0-3.1-.5-4.8zM10 15.1V8.9l5.2 3.1-5.2 3.1z" />
              </svg>
            </a>

            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Star Tech on Instagram"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand-orange"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
        </div>

        {/* Bottom Copyright Row */}
        <div className="flex flex-col items-center justify-between gap-2 pt-5 text-[11px] text-gray-400 sm:flex-row">
          <p>&copy; 2026 Star Tech Ltd | All rights reserved</p>
          <div className="flex items-center gap-4">
            <CookieSettingsButton className="text-[11px] text-gray-300 underline-offset-2 transition-colors hover:text-brand-orange hover:underline" />
            <p>Powered By: Star Tech</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
