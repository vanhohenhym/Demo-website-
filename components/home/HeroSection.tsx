"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Pause,
  Play,
  ArrowRight,
  MousePointerClick,
} from "lucide-react";

export interface HeroSlide {
  id: string;
  shortLabel: string;
  href: string;
  ctaLabel: string;
}

const SLIDES: readonly HeroSlide[] = [
  {
    id: "city-it-mega-fair",
    shortLabel: "City IT Mega Fair 2026",
    href: "/category/component",
    ctaLabel: "Explore Fair Offers",
  },
  {
    id: "custom-gaming-pc",
    shortLabel: "Custom Gaming PC Deals",
    href: "/pc-builder",
    ctaLabel: "Build Your PC",
  },
  {
    id: "laptop-festival",
    shortLabel: "Flagship Laptop Festival",
    href: "/category/laptop",
    ctaLabel: "Browse Laptops",
  },
  {
    id: "creator-monitors",
    shortLabel: "OLED & 240Hz Monitors",
    href: "/category/monitor",
    ctaLabel: "Shop Monitors",
  },
  {
    id: "networking-upgrade",
    shortLabel: "Wi-Fi 7 & Office Essentials",
    href: "/category/networking",
    ctaLabel: "Explore Networking",
  },
] as const;

export interface HeroSectionProps {
  /** Auto-advance interval in milliseconds when motion is enabled. Defaults to 6000. */
  autoPlayMs?: number;
}

function CityItFairBackdrop() {
  return (
    <svg
      viewBox="0 0 960 460"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full pointer-events-none select-none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="expo-bg-glow" cx="35%" cy="42%" r="68%">
          <stop offset="0%" stopColor="#2631a8" />
          <stop offset="52%" stopColor="#141a6b" />
          <stop offset="100%" stopColor="#070b36" />
        </radialGradient>
        <linearGradient id="expo-arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
          <stop offset="45%" stopColor="#e879f9" stopOpacity="0.85" />
          <stop offset="75%" stopColor="#fb923c" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="expo-floor-streak" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.1" />
          <stop offset="28%" stopColor="#f472b6" stopOpacity="0.85" />
          <stop offset="52%" stopColor="#fbbf24" stopOpacity="0.95" />
          <stop offset="78%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="expo-bldg-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.78" />
          <stop offset="100%" stopColor="#0c154a" stopOpacity="0.92" />
        </linearGradient>
        <linearGradient id="expo-floor-refl" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1d2b8a" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#06092e" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Deep expo royal blue canvas */}
      <rect width="960" height="460" fill="url(#expo-bg-glow)" />

      {/* Subtle architectural perspective grid */}
      <g stroke="#60a5fa" strokeOpacity="0.09" strokeWidth="1">
        <line x1="0" y1="362" x2="960" y2="362" />
        <line x1="0" y1="395" x2="960" y2="395" />
        <line x1="0" y1="432" x2="960" y2="432" />
        <line x1="160" y1="362" x2="60" y2="460" />
        <line x1="340" y1="362" x2="290" y2="460" />
        <line x1="520" y1="362" x2="540" y2="460" />
        <line x1="700" y1="362" x2="790" y2="460" />
      </g>

      {/* Floor reflection base */}
      <rect x="0" y="362" width="960" height="98" fill="url(#expo-floor-refl)" />

      {/* Glowing orbital light ribbon behind building */}
      <path
        d="M 410 356 C 455 155, 765 75, 885 180 C 950 238, 910 335, 760 368"
        fill="none"
        stroke="url(#expo-arc-grad)"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path
        d="M 435 352 C 495 170, 770 100, 868 192 C 920 242, 885 322, 745 362"
        fill="none"
        stroke="#e0f2fe"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Dhaka Skyline subtle wireframe left horizon */}
      <g stroke="#93c5fd" strokeOpacity="0.42" strokeWidth="1.4" fill="none">
        {/* City towers */}
        <polyline points="20,362 20,322 38,322 38,362" />
        <polyline points="42,362 42,306 58,306 58,362" />
        <polyline points="62,362 62,330 78,330 78,362" />
        {/* Stylized Parliament / Dome hint */}
        <path d="M 94 362 L 94 342 L 128 342 L 128 362 M 102 342 Q 111 328 120 342" />
        {/* National Martyrs Memorial spires */}
        <polygon points="154,362 184,296 214,362" />
        <polygon points="164,362 184,310 204,362" />
        <polygon points="174,362 184,326 194,362" />
        {/* Mid-rise silhouettes */}
        <polyline points="236,362 236,326 254,326 254,362" />
        <polyline points="258,362 258,338 282,338 282,362" />
      </g>

      {/* Stylized IDB Bhaban / BCS Computer City Tower (Right Side) */}
      <g>
        {/* Left glass atrium wing */}
        <path
          d="M 405 362 L 405 326 L 620 278 L 620 362 Z"
          fill="url(#expo-bldg-fill)"
          stroke="#7dd3fc"
          strokeWidth="1.5"
        />
        {/* Atrium horizontal lines */}
        <g stroke="#38bdf8" strokeOpacity="0.45" strokeWidth="1">
          <line x1="405" y1="338" x2="620" y2="296" />
          <line x1="405" y1="350" x2="620" y2="318" />
          <line x1="450" y1="316" x2="450" y2="362" />
          <line x1="495" y1="306" x2="495" y2="362" />
          <line x1="540" y1="296" x2="540" y2="362" />
          <line x1="585" y1="286" x2="585" y2="362" />
        </g>

        {/* Main central tall tower */}
        <polygon
          points="620,362 620,174 670,136 670,362"
          fill="#101c5e"
          stroke="#bae6fd"
          strokeWidth="1.8"
        />
        <polygon
          points="670,362 670,136 742,172 742,362"
          fill="url(#expo-bldg-fill)"
          stroke="#7dd3fc"
          strokeWidth="1.8"
        />

        {/* Tower glowing window grid */}
        <g fill="#7dd3fc" fillOpacity="0.35" stroke="#bae6fd" strokeOpacity="0.5" strokeWidth="0.8">
          {[0, 1, 2, 3, 4, 5, 6].map((row) => (
            <React.Fragment key={row}>
              <rect x="631" y={188 + row * 22} width="10" height="12" rx="1" />
              <rect x="647" y={180 + row * 22} width="10" height="12" rx="1" />
              <rect x="682" y={180 + row * 22} width="12" height="12" rx="1" />
              <rect x="700" y={188 + row * 22} width="12" height="12" rx="1" />
              <rect x="718" y={196 + row * 22} width="12" height="12" rx="1" />
            </React.Fragment>
          ))}
        </g>

        {/* Curved right podium / BCS Computer City entrance */}
        <path
          d="M 678 362 L 678 278 C 728 262, 792 260, 845 278 L 845 362 Z"
          fill="#0f1e63"
          stroke="#7dd3fc"
          strokeWidth="1.7"
        />
        <path
          d="M 678 296 C 728 282, 792 280, 845 296"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          opacity="0.7"
        />
        <path
          d="M 678 318 C 728 306, 792 304, 845 318"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          opacity="0.55"
        />
        <path
          d="M 678 340 C 728 330, 792 328, 845 340"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          opacity="0.45"
        />
        {/* Entrance arch */}
        <path
          d="M 702 362 L 702 324 C 702 314, 738 314, 738 324 L 738 362"
          fill="#1e40af"
          fillOpacity="0.65"
          stroke="#e0f2fe"
          strokeWidth="1.4"
        />
        {/* Signboard text */}
        <text
          x="728"
          y="290"
          fill="#e0f2fe"
          fontFamily="system-ui, sans-serif"
          fontWeight="700"
          fontSize="7.5"
          letterSpacing="0.8"
        >
          BCS COMPUTER CITY
        </text>
      </g>

      {/* Horizon neon light streak */}
      <path
        d="M 0 366 Q 480 356 960 366"
        fill="none"
        stroke="url(#expo-floor-streak)"
        strokeWidth="5"
      />
      <path
        d="M 40 410 C 260 375, 580 365, 920 385"
        fill="none"
        stroke="#f472b6"
        strokeWidth="2.5"
        opacity="0.55"
      />
      <path
        d="M 0 432 C 300 382, 650 374, 960 398"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2"
        opacity="0.45"
      />

      {/* Ambient tech sparkles */}
      <g fill="#e0f2fe" opacity="0.6">
        <circle cx="92" cy="72" r="1.5" />
        <circle cx="240" cy="48" r="1.2" />
        <circle cx="515" cy="76" r="1.8" />
        <circle cx="610" cy="42" r="1.3" />
        <circle cx="775" cy="86" r="1.5" />
        <circle cx="890" cy="128" r="1.8" />
      </g>
    </svg>
  );
}

function PromoFeedbackArt() {
  return (
    <svg
      viewBox="0 0 340 220"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full pointer-events-none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="fb-glow" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#0a66e0" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#001b54" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="340" height="220" fill="url(#fb-glow)" />
      {/* Subtle glowing cyan burst accents matching Image 1 */}
      <g fill="#38bdf8" opacity="0.32">
        <polygon points="36,158 46,138 56,158 76,168 56,178 46,198 36,178 16,168" />
        <polygon points="282,118 289,104 296,118 310,125 296,132 289,146 282,132 268,125" />
      </g>
      <circle cx="298" cy="42" r="42" fill="#38bdf8" opacity="0.08" />
      <circle cx="38" cy="36" r="32" fill="#60a5fa" opacity="0.08" />
    </svg>
  );
}

function LaptopGiftCollageSvg() {
  return (
    <svg
      viewBox="0 0 118 58"
      className="h-12 w-auto flex-shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      {/* Sleek Laptop */}
      <rect x="44" y="8" width="52" height="33" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
      <rect x="47" y="11" width="46" height="27" rx="1.5" fill="#1d4ed8" />
      <path d="M 47 38 L 93 11 L 93 38 Z" fill="#38bdf8" opacity="0.35" />
      <path d="M 36 42 L 104 42 L 100 46 L 40 46 Z" fill="#475569" />

      {/* Tech Backpack / Sleeve */}
      <rect x="6" y="14" width="26" height="34" rx="5" fill="#1e293b" />
      <rect x="10" y="20" width="18" height="11" rx="2" fill="#334155" />
      <line x1="12" y1="24" x2="26" y2="24" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />

      {/* Smartwatch */}
      <rect x="94" y="22" width="16" height="20" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.4" />
      <circle cx="102" cy="32" r="4" fill="#38bdf8" opacity="0.85" />

      {/* Wireless Mouse */}
      <rect x="26" y="34" width="13" height="18" rx="6.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
      <line x1="32.5" y1="37" x2="32.5" y2="42" stroke="#ef4a23" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HeroSection({ autoPlayMs = 6000 }: HeroSectionProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const pendingTargetRef = useRef<number | null>(null);
  const lastSettledIndexRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const userInteractedRef = useRef<boolean>(false);
  const hoverOrFocusPausedRef = useRef<boolean>(false);

  const getNearestSlideIndex = useCallback((): number => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return 0;
    const raw = Math.round(track.scrollLeft / track.clientWidth);
    return Math.max(0, Math.min(SLIDES.length - 1, raw));
  }, []);

  const scrollToSlide = useCallback((targetIndex: number, announceUser = true) => {
    const track = trackRef.current;
    if (!track) return;
    const wrapped = ((targetIndex % SLIDES.length) + SLIDES.length) % SLIDES.length;
    userInteractedRef.current = announceUser;
    pendingTargetRef.current = wrapped;
    setActiveIndex(wrapped);

    const targetLeft = wrapped * track.clientWidth;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    track.scrollTo({
      left: targetLeft,
      behavior: prefersReduced ? "auto" : "smooth",
    });

    // If reduced motion or already positioned, settle immediately
    if (prefersReduced || Math.abs(track.scrollLeft - targetLeft) < 2) {
      pendingTargetRef.current = null;
      if (wrapped !== lastSettledIndexRef.current) {
        lastSettledIndexRef.current = wrapped;
        if (announceUser) {
          setStatusMessage(`Slide ${wrapped + 1} of ${SLIDES.length}: ${SLIDES[wrapped].shortLabel}`);
        }
      }
    }
  }, []);

  const handlePrev = useCallback(() => {
    const base = pendingTargetRef.current ?? getNearestSlideIndex();
    scrollToSlide(base - 1, true);
  }, [getNearestSlideIndex, scrollToSlide]);

  const handleNext = useCallback(() => {
    const base = pendingTargetRef.current ?? getNearestSlideIndex();
    scrollToSlide(base + 1, true);
  }, [getNearestSlideIndex, scrollToSlide]);

  // Settle handler + RAF-throttled live marker updates (Modern Web Guidance: carousel)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const handleSettle = () => {
      const settled = getNearestSlideIndex();
      // Ignore stale settle if a new target scroll is still pending at a different index
      if (pendingTargetRef.current !== null && pendingTargetRef.current !== settled) {
        return;
      }
      pendingTargetRef.current = null;
      setActiveIndex(settled);

      if (settled !== lastSettledIndexRef.current) {
        lastSettledIndexRef.current = settled;
        if (userInteractedRef.current) {
          setStatusMessage(`Slide ${settled + 1} of ${SLIDES.length}: ${SLIDES[settled].shortLabel}`);
        }
      }
    };

    const supportsScrollEnd = "onscrollend" in window;

    const handleScroll = () => {
      // Skip live marker writes during scripted smooth scroll to prevent Safari stutter
      if (pendingTargetRef.current === null && rafIdRef.current === null) {
        rafIdRef.current = window.requestAnimationFrame(() => {
          rafIdRef.current = null;
          const nearest = getNearestSlideIndex();
          setActiveIndex((prev) => (prev === nearest ? prev : nearest));
        });
      }

      if (!supportsScrollEnd) {
        if (debounceTimerRef.current !== null) {
          window.clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = window.setTimeout(() => {
          debounceTimerRef.current = null;
          handleSettle();
        }, 120);
      }
    };

    const handlePointerOrTouch = () => {
      userInteractedRef.current = true;
    };

    track.addEventListener("scroll", handleScroll, { passive: true });
    track.addEventListener("pointerdown", handlePointerOrTouch, { passive: true });
    if (supportsScrollEnd) {
      track.addEventListener("scrollend", handleSettle);
    }

    return () => {
      track.removeEventListener("scroll", handleScroll);
      track.removeEventListener("pointerdown", handlePointerOrTouch);
      if (supportsScrollEnd) {
        track.removeEventListener("scrollend", handleSettle);
      }
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [getNearestSlideIndex]);

  // Respect prefers-reduced-motion and pause state for auto-advance
  useEffect(() => {
    if (isPaused || autoPlayMs <= 0) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      if (hoverOrFocusPausedRef.current) return;
      const base = pendingTargetRef.current ?? getNearestSlideIndex();
      scrollToSlide(base + 1, false);
    }, autoPlayMs);

    return () => window.clearInterval(interval);
  }, [autoPlayMs, getNearestSlideIndex, isPaused, scrollToSlide]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_340px] gap-4 lg:gap-5 items-stretch">
      {/* Main Hero Carousel (Left ~74%) */}
      <section
        aria-roledescription="carousel"
        aria-label="Featured promotions"
        onMouseEnter={() => {
          hoverOrFocusPausedRef.current = true;
        }}
        onMouseLeave={() => {
          hoverOrFocusPausedRef.current = false;
        }}
        onFocusCapture={() => {
          hoverOrFocusPausedRef.current = true;
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            hoverOrFocusPausedRef.current = false;
          }
        }}
        className="relative rounded-card overflow-hidden shadow-card bg-brand-expoDeep min-h-[300px] sm:min-h-[380px] lg:min-h-[450px] flex flex-col"
      >
        {/* Previous / Next Controls (before track in DOM order per Modern Web Guidance: carousel) */}
        <div className="pointer-events-none absolute inset-y-0 inset-x-0 z-20 flex items-center justify-between px-2.5 sm:px-3.5">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous slide"
            className="pointer-events-auto inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-brand-navy/50 hover:bg-brand-navy/85 text-white border border-white/20 backdrop-blur-sm transition-colors touch-manipulation"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next slide"
            className="pointer-events-auto inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-brand-navy/50 hover:bg-brand-navy/85 text-white border border-white/20 backdrop-blur-sm transition-colors touch-manipulation"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Pause / Play Auto-Rotation Control (WCAG 2.2.2; dynamic label without aria-pressed) */}
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          aria-label={isPaused ? "Play slide rotation" : "Pause slide rotation"}
          className="absolute bottom-3 right-3 z-20 inline-flex items-center justify-center h-7 w-7 rounded-full bg-brand-navy/60 hover:bg-brand-navy/90 text-white/90 hover:text-white border border-white/20 backdrop-blur-sm transition-colors touch-manipulation"
        >
          {isPaused ? (
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          ) : (
            <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          )}
        </button>

        {/* Scrollable Snap Track */}
        <div
          ref={trackRef}
          tabIndex={0}
          role="group"
          aria-label="Slides"
          className="hero-carousel-track no-scrollbar flex-1 h-full"
        >
          {/* SLIDE 1: City IT Mega Fair 2026 (Faithful recreation of Image 1) */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="1 of 5"
            className="hero-carousel-slide relative min-h-[300px] sm:min-h-[380px] lg:min-h-[450px] overflow-hidden flex flex-col justify-between p-5 sm:p-8 lg:p-10 text-white"
          >
            <CityItFairBackdrop />

            {/* Top Expo Crest Row */}
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="inline-flex flex-col leading-none">
                <span className="text-sm sm:text-base font-black italic tracking-wider text-white">
                  STAR<span className="text-sky-300">TECH</span>
                </span>
                <span className="text-[8px] font-semibold tracking-[0.2em] text-blue-200 uppercase mt-0.5">
                  Total IT Solution
                </span>
              </div>

              <div className="rounded border border-white/30 bg-white/10 backdrop-blur-sm px-2.5 py-1.5 text-center leading-tight">
                <div className="text-[9px] font-bold tracking-wider uppercase text-sky-200">
                  BCS Computer City
                </div>
                <div className="text-[10px] font-extrabold text-white mt-0.5">
                  27th Edition Expo
                </div>
              </div>
            </div>

            {/* Center-Left Expo Typography Showcase */}
            <div className="relative z-10 max-w-md my-auto py-4 sm:py-6">
              <p className="text-lg sm:text-2xl font-black italic tracking-tight text-sky-100 drop-shadow">
                City IT
              </p>
              <h2 className="text-3xl sm:text-5xl font-black italic tracking-tight leading-[0.98] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]">
                MEGA FAIR
              </h2>

              {/* Neon-framed 2026 Badge */}
              <div className="mt-2.5 inline-flex items-center px-5 py-1 -skew-x-12 rounded-sm border-2 border-cyan-300/80 bg-brand-expoDeep/80 shadow-[0_0_20px_rgba(56,189,248,0.35)]">
                <span className="skew-x-12 text-xl sm:text-3xl font-black tracking-widest text-white tabular-nums">
                  2026
                </span>
              </div>

              {/* Tagline with flanking lines */}
              <div className="mt-3.5 flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-blue-100">
                <span className="h-px w-6 bg-sky-300/70" aria-hidden="true" />
                <span>With AI &amp; Technology, Towards the Future</span>
                <span className="h-px w-6 bg-sky-300/70" aria-hidden="true" />
              </div>

              {/* Date Pill */}
              <div className="mt-3.5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-md">
                <Calendar className="h-3.5 w-3.5 text-brand-navy flex-shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-extrabold text-brand-orange tracking-tight">
                  8 – 15 December
                </span>
              </div>

              {/* Venue Line */}
              <div className="mt-3 flex items-start gap-1.5 text-xs sm:text-sm text-blue-100">
                <MapPin className="h-4 w-4 text-sky-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="leading-snug">
                  BCS Computer City,{" "}
                  <strong className="font-bold text-amber-300">IDB Bhaban</strong>, Agargaon, Dhaka
                </p>
              </div>

              <div className="mt-4">
                <Link
                  href={SLIDES[0].href}
                  className="inline-flex items-center gap-1.5 rounded-control bg-brand-orange hover:bg-brand-orangeHover text-white text-xs font-bold px-4 py-2 shadow transition-colors"
                >
                  <span>{SLIDES[0].ctaLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="h-4" aria-hidden="true" />
          </div>

          {/* SLIDE 2: Custom Gaming PC Deals */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="2 of 5"
            className="hero-carousel-slide relative min-h-[300px] sm:min-h-[380px] lg:min-h-[450px] overflow-hidden flex items-center p-6 sm:p-10 lg:p-12 text-white bg-gradient-to-br from-[#081621] via-[#131d47] to-[#2c1238]"
          >
            {/* Subtle geometric vector GPU / Rig accent */}
            <svg
              viewBox="0 0 420 340"
              className="hidden sm:block absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 h-64 lg:h-80 w-auto opacity-85 pointer-events-none"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="60" y="30" width="230" height="270" rx="14" fill="#0d1b2a" stroke="#38bdf8" strokeWidth="2.5" />
              <rect x="82" y="54" width="186" height="190" rx="8" fill="#081120" stroke="#6366f1" strokeWidth="1.5" />
              <circle cx="175" cy="118" r="36" fill="none" stroke="#ef4a23" strokeWidth="4" strokeDasharray="16 8" />
              <circle cx="175" cy="118" r="14" fill="#ef4a23" fillOpacity="0.25" stroke="#fb923c" strokeWidth="2" />
              <rect x="98" y="176" width="154" height="44" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx="132" cy="198" r="13" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
              <circle cx="175" cy="198" r="13" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
              <circle cx="218" cy="198" r="13" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="94" y1="264" x2="256" y2="264" stroke="#ef4a23" strokeWidth="4" strokeLinecap="round" />
            </svg>

            <div className="relative z-10 max-w-md space-y-3.5">
              <span className="inline-block rounded-full bg-brand-orange/20 border border-brand-orange/50 px-3 py-1 text-[11px] font-bold text-amber-300">
                Verified Compatibility Engine
              </span>
              <h2 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">
                Build Your Next-Gen Custom Gaming Rig
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                Pair processors, motherboards, DDR5 memory, and high-wattage PSUs with real-time socket, clearance, and wattage checks.
              </p>
              <div className="pt-1">
                <Link
                  href={SLIDES[1].href}
                  className="inline-flex items-center gap-2 rounded-control bg-brand-orange hover:bg-brand-orangeHover text-white text-xs sm:text-sm font-bold px-5 py-2.5 shadow transition-colors"
                >
                  <span>{SLIDES[1].ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          {/* SLIDE 3: Flagship Laptop Festival */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="3 of 5"
            className="hero-carousel-slide relative min-h-[300px] sm:min-h-[380px] lg:min-h-[450px] overflow-hidden flex items-center p-6 sm:p-10 lg:p-12 text-white bg-gradient-to-br from-[#0a2342] via-[#0e4066] to-[#1e1b4b]"
          >
            <svg
              viewBox="0 0 420 300"
              className="hidden sm:block absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 h-56 lg:h-72 w-auto opacity-85 pointer-events-none"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="65" y="45" width="270" height="175" rx="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
              <rect x="78" y="58" width="244" height="148" rx="6" fill="#1e3a8a" />
              <path d="M 78 206 L 322 58 L 322 206 Z" fill="#38bdf8" opacity="0.22" />
              <path d="M 28 224 L 372 224 L 352 246 L 48 246 Z" fill="#cbd5e1" />
              <rect x="165" y="228" width="70" height="6" rx="3" fill="#64748b" />
            </svg>

            <div className="relative z-10 max-w-md space-y-3.5">
              <span className="inline-block rounded-full bg-sky-400/20 border border-sky-300/40 px-3 py-1 text-[11px] font-bold text-sky-200">
                Official Brand Warranty
              </span>
              <h2 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">
                Ultrabooks &amp; Creator Laptops Ready to Ship
              </h2>
              <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed">
                Compare display panels, battery life, and thermal performance across leading productivity and gaming laptops.
              </p>
              <div className="pt-1">
                <Link
                  href={SLIDES[2].href}
                  className="inline-flex items-center gap-2 rounded-control bg-brand-orange hover:bg-brand-orangeHover text-white text-xs sm:text-sm font-bold px-5 py-2.5 shadow transition-colors"
                >
                  <span>{SLIDES[2].ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          {/* SLIDE 4: Creator & Esports Monitors */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="4 of 5"
            className="hero-carousel-slide relative min-h-[300px] sm:min-h-[380px] lg:min-h-[450px] overflow-hidden flex items-center p-6 sm:p-10 lg:p-12 text-white bg-gradient-to-br from-[#17123b] via-[#261e6b] to-[#0a2a4d]"
          >
            <svg
              viewBox="0 0 420 300"
              className="hidden sm:block absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 h-56 lg:h-72 w-auto opacity-85 pointer-events-none"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="42" y="42" width="320" height="175" rx="12" fill="#090d24" stroke="#a78bfa" strokeWidth="2.5" />
              <rect x="54" y="54" width="296" height="151" rx="6" fill="#1e1b4b" />
              <circle cx="202" cy="130" r="54" fill="#38bdf8" opacity="0.22" />
              <circle cx="235" cy="115" r="36" fill="#f472b6" opacity="0.28" />
              <rect x="186" y="217" width="32" height="34" fill="#94a3b8" />
              <path d="M 132 251 L 272 251 L 260 263 L 144 263 Z" fill="#cbd5e1" />
            </svg>

            <div className="relative z-10 max-w-md space-y-3.5">
              <span className="inline-block rounded-full bg-violet-400/20 border border-violet-300/40 px-3 py-1 text-[11px] font-bold text-violet-200">
                Color-Accurate &amp; High Refresh
              </span>
              <h2 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">
                4K OLED &amp; 240Hz Esports Monitors
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
                Crisp IPS, Mini-LED, and QD-OLED displays engineered for zero-ghosting gameplay and color-critical studio work.
              </p>
              <div className="pt-1">
                <Link
                  href={SLIDES[3].href}
                  className="inline-flex items-center gap-2 rounded-control bg-brand-orange hover:bg-brand-orangeHover text-white text-xs sm:text-sm font-bold px-5 py-2.5 shadow transition-colors"
                >
                  <span>{SLIDES[3].ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          {/* SLIDE 5: Networking & Office Essentials */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="5 of 5"
            className="hero-carousel-slide relative min-h-[300px] sm:min-h-[380px] lg:min-h-[450px] overflow-hidden flex items-center p-6 sm:p-10 lg:p-12 text-white bg-gradient-to-br from-[#071c2c] via-[#0e324a] to-[#081621]"
          >
            <svg
              viewBox="0 0 420 300"
              className="hidden sm:block absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 h-56 lg:h-72 w-auto opacity-85 pointer-events-none"
              aria-hidden="true"
              focusable="false"
            >
              <line x1="120" y1="180" x2="96" y2="75" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
              <line x1="205" y1="180" x2="205" y2="60" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
              <line x1="290" y1="180" x2="314" y2="75" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
              <path d="M 162 104 A 60 60 0 0 1 248 104" fill="none" stroke="#34d399" strokeWidth="3" opacity="0.7" />
              <path d="M 138 82 A 92 92 0 0 1 272 82" fill="none" stroke="#38bdf8" strokeWidth="2.5" opacity="0.5" />
              <rect x="78" y="178" width="254" height="44" rx="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="115" cy="200" r="4.5" fill="#10b981" />
              <circle cx="136" cy="200" r="4.5" fill="#38bdf8" />
              <circle cx="157" cy="200" r="4.5" fill="#f59e0b" />
            </svg>

            <div className="relative z-10 max-w-md space-y-3.5">
              <span className="inline-block rounded-full bg-emerald-400/20 border border-emerald-300/40 px-3 py-1 text-[11px] font-bold text-emerald-200">
                Mesh &amp; Tri-Band Performance
              </span>
              <h2 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">
                Wi-Fi 7 Routers &amp; Smart Office Gear
              </h2>
              <p className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed">
                Upgrade home studios and growing teams with multi-gigabit routers, UPS backups, and commercial printers.
              </p>
              <div className="pt-1">
                <Link
                  href={SLIDES[4].href}
                  className="inline-flex items-center gap-2 rounded-control bg-brand-orange hover:bg-brand-orangeHover text-white text-xs sm:text-sm font-bold px-5 py-2.5 shadow transition-colors"
                >
                  <span>{SLIDES[4].ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Polite Status Region (empty on initial load per Modern Web Guidance: carousel) */}
        <p className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </p>

        {/* Bottom-Center 5 Horizontal Dash Indicators */}
        <nav
          aria-label="Choose a slide"
          className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1"
        >
          {SLIDES.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => scrollToSlide(idx, true)}
                aria-label={`Go to slide ${idx + 1}: ${slide.shortLabel}`}
                aria-current={isActive ? "true" : undefined}
                className="group inline-flex items-center justify-center min-h-[24px] min-w-[24px] px-1 py-2 touch-manipulation rounded-sm"
              >
                <span
                  data-active={isActive ? "true" : "false"}
                  className={`carousel-marker-bar block h-[5px] rounded-[1px] transition-all ${
                    isActive
                      ? "w-9 bg-brand-orange ring-1 ring-white/80"
                      : "w-6 bg-white/55 group-hover:bg-white/85"
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </section>

      {/* Right Column: 2 Stacked Promotional Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-5">
        {/* Top Promo Card: Customer Feedback / Opinion & Complain */}
        <Link
          href="/contact"
          className="relative overflow-hidden rounded-card bg-gradient-to-br from-brand-promoBlueFrom via-[#003494] to-brand-promoBlueTo text-white p-6 flex flex-col items-center justify-center text-center shadow-card hover:shadow-cardHover transition-shadow group min-h-[210px]"
        >
          <PromoFeedbackArt />
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-xs font-medium text-sky-200 tracking-wide">
              About Star Tech
            </span>
            <h2 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight text-white">
              Feedback or
              <br />
              Complaint
            </h2>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-amberWarm group-hover:from-brand-amber group-hover:to-brand-orange px-5 py-2 text-xs font-bold text-white shadow-md transition-all">
              <span>Share Here</span>
              <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </Link>

        {/* Bottom Promo Card: Laptop Mela / Festival */}
        <Link
          href="/category/laptop"
          className="relative overflow-hidden rounded-card bg-gradient-to-br from-brand-promoRedFrom via-[#dc2e14] to-brand-promoRedTo text-white pt-5 px-4 pb-4 flex flex-col items-center justify-between text-center shadow-card hover:shadow-cardHover transition-shadow group min-h-[210px]"
        >
          {/* Decorative sunburst rays & subtle confetti */}
          <svg
            viewBox="0 0 340 220"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full pointer-events-none"
            aria-hidden="true"
            focusable="false"
          >
            <g fill="#fbbf24" opacity="0.16">
              <polygon points="170,70 60,0 110,0" />
              <polygon points="170,70 230,0 280,0" />
              <polygon points="170,70 0,70 0,115" />
              <polygon points="170,70 340,65 340,110" />
            </g>
            <g fill="#fde68a" opacity="0.45">
              <polygon points="48,34 55,44 43,46" />
              <polygon points="292,28 300,38 286,40" />
              <circle cx="72" cy="72" r="2.5" />
              <circle cx="272" cy="76" r="2.5" />
            </g>
          </svg>

          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-[26px] font-black italic leading-[1.02] tracking-tight text-amber-50 drop-shadow">
              Laptop
              <span className="block text-amber-200">Mela</span>
            </h2>
            <p className="mt-1.5 text-[11px] font-medium text-amber-100">
              Exclusive offers on selected laptops
            </p>
          </div>

          {/* Crisp White Bottom Info Box */}
          <div className="relative z-10 mt-3 w-full rounded-control bg-white px-3 py-2.5 flex items-center justify-between gap-2 text-left shadow-sm group-hover:scale-[1.01] transition-transform">
            <div>
              <p className="text-xs font-extrabold text-brand-navy leading-tight">
                Exciting Tech
                <br />
                Gifts Included
              </p>
              <p className="text-[9px] text-brand-textMuted mt-0.5">*Terms apply</p>
            </div>
            <LaptopGiftCollageSvg />
          </div>
        </Link>
      </div>
    </div>
  );
}
