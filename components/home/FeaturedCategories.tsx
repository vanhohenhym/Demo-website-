import React from "react";
import Link from "next/link";

export type FeaturedCategoryIconId =
  | "ac"
  | "portable-power-station"
  | "air-fryer"
  | "drone"
  | "gimbal"
  | "tablet-pc"
  | "tv"
  | "fridge"
  | "mobile-phone"
  | "mobile-accessories"
  | "blood-pressure-monitor"
  | "wifi-camera"
  | "trimmer"
  | "smart-watch"
  | "earbuds"
  | "torch-light";

export interface FeaturedCategoryTile {
  id: FeaturedCategoryIconId;
  label: string;
  href: string;
}

export const FEATURED_CATEGORY_TILES: readonly FeaturedCategoryTile[] = [
  { id: "ac", label: "AC", href: "/category/appliance" },
  {
    id: "portable-power-station",
    label: "Portable Power Station",
    href: "/category/power",
  },
  { id: "air-fryer", label: "Air Fryer", href: "/category/appliance" },
  { id: "drone", label: "Drone", href: "/category/gadget" },
  { id: "gimbal", label: "Gimbal", href: "/category/camera" },
  { id: "tablet-pc", label: "Tablet PC", href: "/category/tablet" },
  { id: "tv", label: "TV", href: "/category/appliance" },
  { id: "fridge", label: "Fridge", href: "/category/appliance" },
  { id: "mobile-phone", label: "Mobile Phone", href: "/category/phone" },
  {
    id: "mobile-accessories",
    label: "Mobile Accessories",
    href: "/category/accessories",
  },
  {
    id: "blood-pressure-monitor",
    label: "Blood Pressure Monitor",
    href: "/category/lifestyle",
  },
  { id: "wifi-camera", label: "WiFi Camera", href: "/category/security" },
  { id: "trimmer", label: "Trimmer", href: "/category/lifestyle" },
  { id: "smart-watch", label: "Smart Watch", href: "/category/gadget" },
  { id: "earbuds", label: "Earbuds", href: "/category/accessories" },
  { id: "torch-light", label: "Torch Light", href: "/category/lifestyle" },
] as const;

export interface FeaturedCategoriesProps {
  heading?: string;
  subtitle?: string;
  items?: readonly FeaturedCategoryTile[];
}

function CategoryOutlineIcon({ id }: { id: FeaturedCategoryIconId }) {
  const svgProps = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className:
      "h-11 w-11 text-brand-textMain group-hover:text-brand-orange transition-colors flex-shrink-0",
    "aria-hidden": true as const,
    focusable: "false" as const,
  };

  switch (id) {
    case "ac":
      return (
        <svg {...svgProps}>
          <rect x="6" y="12" width="36" height="16" rx="2.5" />
          <line x1="10" y1="22" x2="38" y2="22" />
          <line x1="10" y1="25" x2="38" y2="25" />
          <rect x="31" y="16" width="6" height="3" rx="0.8" />
          <circle cx="12" cy="17.5" r="1" fill="currentColor" stroke="none" />
          <path d="M14 31c0 2.5-1.5 3.5-1.5 5.5" />
          <path d="M21 31c0 2.5-1.5 3.5-1.5 5.5" />
          <path d="M28 31c0 2.5-1.5 3.5-1.5 5.5" />
          <path d="M35 31c0 2.5-1.5 3.5-1.5 5.5" />
        </svg>
      );

    case "portable-power-station":
      return (
        <svg {...svgProps}>
          <path d="M16 14v-3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
          <rect x="9" y="14" width="30" height="24" rx="3" />
          <rect x="13" y="19" width="11" height="6" rx="1" />
          <path d="M18.5 20.5l-1.5 2h2l-1 2" />
          <circle cx="31" cy="21" r="2.2" />
          <circle cx="31" cy="29.5" r="2.2" />
          <rect x="13" y="29" width="4" height="4" rx="0.8" />
          <rect x="20" y="29" width="4" height="4" rx="0.8" />
          <line x1="12" y1="38" x2="12" y2="40" />
          <line x1="36" y1="38" x2="36" y2="40" />
        </svg>
      );

    case "air-fryer":
      return (
        <svg {...svgProps}>
          <path d="M14 10h20l2 7v19a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V17l2-7z" />
          <line x1="12" y1="22" x2="36" y2="22" />
          <circle cx="24" cy="16" r="2.2" />
          <line x1="18" y1="16" x2="19.5" y2="16" />
          <line x1="28.5" y1="16" x2="30" y2="16" />
          <rect x="21.5" y="25" width="5" height="9" rx="1.5" />
          <line x1="15" y1="36" x2="33" y2="36" />
        </svg>
      );

    case "drone":
      return (
        <svg {...svgProps}>
          <rect x="19" y="19" width="10" height="10" rx="2.5" />
          <circle cx="24" cy="24" r="2" />
          <line x1="19" y1="20" x2="11" y2="12" />
          <line x1="29" y1="20" x2="37" y2="12" />
          <line x1="19" y1="28" x2="11" y2="36" />
          <line x1="29" y1="28" x2="37" y2="36" />
          <circle cx="11" cy="12" r="2" />
          <circle cx="37" cy="12" r="2" />
          <circle cx="11" cy="36" r="2" />
          <circle cx="37" cy="36" r="2" />
          <path d="M6.5 14.5l9-5" />
          <path d="M32.5 9.5l9 5" />
          <path d="M6.5 33.5l9 5" />
          <path d="M32.5 38.5l9-5" />
        </svg>
      );

    case "gimbal":
      return (
        <svg {...svgProps}>
          <rect x="19" y="9" width="18" height="12" rx="2" />
          <circle cx="28" cy="15" r="3.5" />
          <path d="M19 15h-5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h9" />
          <rect x="21" y="24" width="6" height="16" rx="2" />
          <circle cx="24" cy="29" r="1.2" />
          <line x1="19" y1="40" x2="29" y2="40" />
        </svg>
      );

    case "tablet-pc":
      return (
        <svg {...svgProps}>
          <rect x="17" y="10" width="23" height="28" rx="2.5" />
          <line x1="26" y1="34.5" x2="31" y2="34.5" />
          <rect x="8" y="19" width="13" height="20" rx="2" fill="white" />
          <line x1="13" y1="36" x2="16" y2="36" />
          <line x1="12.5" y1="22" x2="16.5" y2="22" />
        </svg>
      );

    case "tv":
      return (
        <svg {...svgProps}>
          <rect x="6" y="11" width="36" height="23" rx="2" />
          <rect x="9" y="14" width="30" height="17" rx="1" />
          <path d="M17.5 19.5h5M20 19.5v6.5" />
          <path d="M25.5 19.5l2.5 6.5 2.5-6.5" />
          <line x1="16" y1="34" x2="13" y2="39" />
          <line x1="32" y1="34" x2="35" y2="39" />
          <line x1="11" y1="39" x2="37" y2="39" />
        </svg>
      );

    case "fridge":
      return (
        <svg {...svgProps}>
          <rect x="14" y="7" width="20" height="34" rx="2.5" />
          <line x1="14" y1="20" x2="34" y2="20" />
          <line x1="29.5" y1="11" x2="29.5" y2="16.5" />
          <line x1="29.5" y1="23.5" x2="29.5" y2="30" />
          <rect x="18" y="11" width="6" height="5" rx="0.8" />
          <line x1="17" y1="41" x2="17" y2="42.5" />
          <line x1="31" y1="41" x2="31" y2="42.5" />
        </svg>
      );

    case "mobile-phone":
      return (
        <svg {...svgProps}>
          <rect x="14" y="7" width="20" height="34" rx="3" />
          <line x1="21" y1="11" x2="27" y2="11" />
          <line x1="20" y1="37" x2="28" y2="37" />
        </svg>
      );

    case "mobile-accessories":
      return (
        <svg {...svgProps}>
          <rect x="11" y="15" width="14" height="12" rx="2" />
          <line x1="15" y1="10" x2="15" y2="15" />
          <line x1="21" y1="10" x2="21" y2="15" />
          <path d="M18 27v4a5 5 0 0 0 5 5h10a4 4 0 0 0 0-8h-3" />
          <rect x="26" y="25.5" width="6" height="5" rx="1" />
        </svg>
      );

    case "blood-pressure-monitor":
      return (
        <svg {...svgProps}>
          <rect x="8" y="17" width="16" height="21" rx="2" />
          <rect x="11" y="20" width="10" height="8" rx="1" />
          <circle cx="13.5" cy="33" r="1.3" />
          <circle cx="18.5" cy="33" r="1.3" />
          <rect x="29" y="13" width="11" height="19" rx="2" />
          <line x1="32" y1="18" x2="37" y2="18" />
          <line x1="32" y1="22" x2="37" y2="22" />
          <path d="M24 27h2.5a2.5 2.5 0 0 0 2.5-2.5V22" />
          <path d="M16 17v-4a3 3 0 0 1 3-3h10" />
        </svg>
      );

    case "wifi-camera":
      return (
        <svg {...svgProps}>
          <circle cx="24" cy="21" r="10.5" />
          <circle cx="24" cy="21" r="4.5" />
          <circle cx="24" cy="21" r="1.3" fill="currentColor" stroke="none" />
          <path d="M19 30.5L16 37h16l-3-6.5" />
          <line x1="12" y1="37" x2="36" y2="37" />
        </svg>
      );

    case "trimmer":
      return (
        <svg {...svgProps}>
          <path d="M19 10h10v5H19z" />
          <line x1="21" y1="8" x2="21" y2="10" />
          <line x1="24" y1="8" x2="24" y2="10" />
          <line x1="27" y1="8" x2="27" y2="10" />
          <path d="M19.5 15h9l-1 22a3.5 3.5 0 0 1-7 0l-1-22z" />
          <rect x="22.5" y="21" width="3" height="6" rx="1.5" />
          <line x1="24" y1="31" x2="24" y2="33" />
        </svg>
      );

    case "smart-watch":
      return (
        <svg {...svgProps}>
          <path d="M18 14l1.5-6h9l1.5 6" />
          <path d="M18 34l1.5 6h9l1.5-6" />
          <rect x="14" y="14" width="20" height="20" rx="4" />
          <rect x="17.5" y="17.5" width="13" height="13" rx="2" />
          <line x1="34" y1="21" x2="36.5" y2="21" />
          <line x1="34" y1="26" x2="36" y2="26" />
          <path d="M21 24l2 2 4-4" />
        </svg>
      );

    case "earbuds":
      return (
        <svg {...svgProps}>
          <path d="M15 21a4 4 0 1 1 6-3.4V25h-3v-4h-3z" />
          <path d="M33 21a4 4 0 1 0-6-3.4V25h3v-4h3z" />
          <rect x="12" y="25" width="24" height="14" rx="4" />
          <line x1="12" y1="30" x2="36" y2="30" />
          <line x1="21" y1="30" x2="27" y2="30" strokeWidth="2.2" />
          <circle cx="24" cy="34.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );

    case "torch-light":
      return (
        <svg {...svgProps}>
          <path d="M11 33l14-14 6 6-14 14a3 3 0 0 1-4.2 0l-1.8-1.8a3 3 0 0 1 0-4.2z" />
          <path d="M24 18l3-5 8 8-5 3" />
          <circle cx="21" cy="27" r="1.4" />
          <line x1="31" y1="10" x2="33" y2="7" />
          <line x1="36" y1="13" x2="39.5" y2="11" />
          <line x1="38" y1="18" x2="41.5" y2="18.5" />
        </svg>
      );
  }
}

export function FeaturedCategories({
  heading = "Featured Category",
  subtitle = "Get Your Desired Product from Featured Category!",
  items = FEATURED_CATEGORY_TILES,
}: FeaturedCategoriesProps) {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl sm:text-[22px] font-bold text-brand-textMain tracking-tight">
          {heading}
        </h2>
        <p className="text-[13px] text-brand-textMuted mt-1">{subtitle}</p>
      </div>

      <ul role="list" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-3.5 items-stretch">
        {items.map((item) => (
          <li key={item.id} className="flex">
            <Link
              href={item.href}
              className="w-full h-full min-h-[124px] sm:min-h-[132px] rounded-xl bg-white shadow-card hover:shadow-cardHover border border-brand-border/60 hover:border-brand-orange/35 px-2.5 py-4 flex flex-col items-center justify-center gap-3 text-center transition-all group"
            >
              <CategoryOutlineIcon id={item.id} />
              <span className="text-[13px] font-medium text-brand-textMain group-hover:text-brand-orange transition-colors leading-snug">
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
