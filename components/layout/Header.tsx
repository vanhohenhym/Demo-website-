import React from "react";
import Link from "next/link";
import { Search, Gift, Zap, User, Menu, X } from "lucide-react";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";

export const CATEGORIES = [
  { name: "Appliance", slug: "appliance" },
  { name: "Desktop", slug: "desktop" },
  { name: "Laptop", slug: "laptop" },
  { name: "Component", slug: "component" },
  { name: "Monitor", slug: "monitor" },
  { name: "Power", slug: "power" },
  { name: "Phone", slug: "phone" },
  { name: "Tablet", slug: "tablet" },
  { name: "Office Equipment", slug: "office-equipment" },
  { name: "Camera", slug: "camera" },
  { name: "Security", slug: "security" },
  { name: "Networking", slug: "networking" },
  { name: "Software", slug: "software" },
  { name: "Server & Storage", slug: "server-storage" },
  { name: "Accessories", slug: "accessories" },
  { name: "Gadget", slug: "gadget" },
  { name: "Gaming", slug: "gaming" },
  { name: "Lifestyle", slug: "lifestyle" },
] as const;

function StarTechLogo() {
  return (
    <svg
      viewBox="0 0 156 54"
      className="h-10 sm:h-11 w-auto flex-shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="st-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="st-star-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4a23" />
        </linearGradient>
        <linearGradient id="st-tech-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      {/* Orbital elliptical sweep */}
      <path
        d="M 18 39 C 8 44, 16 49, 54 49 C 98 49, 144 40, 146 25 C 148 11, 118 4, 80 7"
        fill="none"
        stroke="url(#st-ring-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.92"
      />
      <path
        d="M 28 11 C 46 3, 94 2, 126 11"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Crisp geometric 4-point star spark */}
      <path
        d="M 134 10 L 136 14 L 140 16 L 136 18 L 134 22 L 132 18 L 128 16 L 132 14 Z"
        fill="#fbbf24"
      />

      {/* STAR wordmark */}
      <text
        x="8"
        y="28"
        fill="url(#st-star-grad)"
        fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="22"
        letterSpacing="1.2"
      >
        STAR
      </text>

      {/* TECH wordmark */}
      <text
        x="68"
        y="40"
        fill="url(#st-tech-grad)"
        fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="17"
        letterSpacing="1.1"
      >
        TECH
      </text>

      {/* Subtle tagline */}
      <text
        x="71"
        y="49"
        fill="#94a3b8"
        fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
        fontWeight="600"
        fontSize="5.4"
        letterSpacing="0.9"
      >
        TOTAL IT SOLUTION
      </text>
    </svg>
  );
}

export function Header() {
  return (
    <header className="w-full sticky top-0 z-50 no-print">
      {/* Top Dark Navy Bar */}
      <div className="w-full bg-brand-navy text-white">
        <div className="max-w-site mx-auto px-4 py-2.5 lg:py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-4 gap-y-2.5">
          {/* Left: Mobile Menu Trigger + Brand Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              popoverTarget="mobile-nav-drawer"
              popoverTargetAction="toggle"
              aria-controls="mobile-nav-drawer"
              aria-label="Open menu"
              className="mobile-nav-trigger lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-control text-white hover:bg-white/10 transition-colors"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Native Popover Mobile Drawer (immediately after trigger per Modern Web Guidance navbar) */}
            <MobileNavDrawer
              id="mobile-nav-drawer"
              className="mobile-nav-popover rounded-card bg-brand-navy text-white border border-white/15 shadow-2xl p-4"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <span className="text-sm font-bold tracking-wide text-white">Menu</span>
                <button
                  type="button"
                  popoverTarget="mobile-nav-drawer"
                  popoverTargetAction="hide"
                  aria-label="Close menu"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-control text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-3 mb-3 border-b border-white/10 text-xs">
                <Link
                  href="/category/component"
                  className="flex flex-col items-center gap-1 rounded-control bg-white/5 hover:bg-white/10 p-2.5 text-center transition-colors"
                >
                  <Gift className="h-4 w-4 text-brand-orange" aria-hidden="true" />
                  <span className="font-semibold text-white">Offers</span>
                </Link>
                <Link
                  href="/category/gaming"
                  className="flex flex-col items-center gap-1 rounded-control bg-white/5 hover:bg-white/10 p-2.5 text-center transition-colors"
                >
                  <Zap className="h-4 w-4 text-brand-orange fill-brand-orange" aria-hidden="true" />
                  <span className="font-semibold text-white">11.11</span>
                </Link>
                <Link
                  href="/contact"
                  className="flex flex-col items-center gap-1 rounded-control bg-white/5 hover:bg-white/10 p-2.5 text-center transition-colors"
                >
                  <User className="h-4 w-4 text-brand-orange" aria-hidden="true" />
                  <span className="font-semibold text-white">Account</span>
                </Link>
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
                Categories
              </p>
              <ul className="grid grid-cols-2 gap-1 text-xs">
                {CATEGORIES.map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      href={`/category/${cat.slug}`}
                      className="block rounded-control px-2.5 py-2 text-gray-200 hover:bg-white/10 hover:text-brand-orange transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </MobileNavDrawer>

            <Link
              href="/"
              aria-label="Star Tech Home"
              className="inline-flex items-center rounded-control focus-visible:outline-2 focus-visible:outline-brand-orange"
            >
              <StarTechLogo />
            </Link>
          </div>

          {/* Center: Global Search */}
          <search className="w-full lg:flex-1 lg:max-w-[540px] xl:max-w-[580px] order-3 lg:order-none">
            <form
              action="/category/all"
              method="GET"
              className="relative flex items-center"
            >
              <label htmlFor="site-search" className="sr-only">
                Search products
              </label>
              <input
                id="site-search"
                type="search"
                name="q"
                placeholder="Search"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="search"
                className="w-full h-[40px] lg:h-[42px] pl-4 pr-11 text-sm text-brand-textMain rounded-control bg-white placeholder:text-brand-textMuted focus-visible:outline-2 focus-visible:outline-brand-orange"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-0 top-0 h-[40px] lg:h-[42px] w-11 flex items-center justify-center text-brand-textMain hover:text-brand-orange transition-colors rounded-r-control"
              >
                <Search className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
              </button>
            </form>
          </search>

          {/* Right: Action Links + PC Builder CTA */}
          <div className="flex items-center gap-3 sm:gap-5 xl:gap-6 flex-shrink-0">
            <Link
              href="/category/component"
              className="hidden sm:flex items-center gap-2.5 group rounded-control py-1"
            >
              <Gift
                className="h-5 w-5 text-brand-orange flex-shrink-0 transition-transform group-hover:scale-105"
                strokeWidth={2}
                aria-hidden="true"
              />
              <div className="hidden xl:flex flex-col leading-tight">
                <span className="text-[14px] font-semibold text-white group-hover:text-brand-orange transition-colors">
                  Offers
                </span>
                <span className="text-[11px] text-gray-400">Latest Offers</span>
              </div>
              <span className="sr-only xl:hidden">Offers — Latest Offers</span>
            </Link>

            <Link
              href="/category/gaming"
              className="hidden sm:flex items-center gap-2.5 group rounded-control py-1"
            >
              <Zap
                className="h-5 w-5 text-brand-orange fill-brand-orange flex-shrink-0 transition-transform group-hover:scale-105"
                aria-hidden="true"
              />
              <div className="hidden xl:flex flex-col leading-tight">
                <span className="text-[14px] font-semibold text-white group-hover:text-brand-orange transition-colors">
                  11.11
                </span>
                <span className="text-[11px] text-gray-400">Special Deals</span>
              </div>
              <span className="sr-only xl:hidden">11.11 — Special Deals</span>
            </Link>

            <Link
              href="/contact"
              className="hidden sm:flex items-center gap-2.5 group rounded-control py-1"
            >
              <User
                className="h-5 w-5 text-brand-orange flex-shrink-0 transition-transform group-hover:scale-105"
                strokeWidth={2.2}
                aria-hidden="true"
              />
              <div className="hidden xl:flex flex-col leading-tight">
                <span className="text-[14px] font-semibold text-white group-hover:text-brand-orange transition-colors">
                  Account
                </span>
                <span className="text-[11px] text-gray-400">Register or Login</span>
              </div>
              <span className="sr-only xl:hidden">Account — Register or Login</span>
            </Link>

            {/* PC Builder Gradient CTA */}
            <Link
              href="/pc-builder"
              className="inline-flex items-center justify-center h-[38px] lg:h-[42px] px-4 lg:px-5 rounded-control text-[13px] font-semibold text-white whitespace-nowrap bg-gradient-to-r from-[#0ea5e9] via-[#2563eb] to-brand-blue hover:from-[#0284c7] hover:via-[#1d4ed8] hover:to-brand-blueDeep shadow-sm transition-all"
            >
              PC Builder
            </Link>
          </div>
        </div>
      </div>

      {/* White Category Navigation Bar */}
      <nav
        aria-label="Categories"
        className="w-full bg-white border-b border-brand-border shadow-nav"
      >
        <div className="max-w-site mx-auto px-3 sm:px-4 overflow-x-auto no-scrollbar">
          <ul className="flex items-center justify-between gap-1 xl:gap-0 whitespace-nowrap">
            {CATEGORIES.map((cat) => (
              <li key={cat.slug} className="flex-shrink-0">
                <Link
                  href={`/category/${cat.slug}`}
                  className="inline-flex items-center px-2.5 xl:px-1.5 py-3 text-[13px] font-semibold text-brand-textMain hover:text-brand-orange transition-colors"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
