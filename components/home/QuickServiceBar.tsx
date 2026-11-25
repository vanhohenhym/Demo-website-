import React from "react";
import Link from "next/link";
import { Laptop, MessageSquareWarning, Home, Settings } from "lucide-react";

export interface QuickServiceItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: "laptop" | "complain" | "ac" | "service";
}

const DEFAULT_ITEMS: readonly QuickServiceItem[] = [
  {
    id: "laptop-finder",
    title: "Laptop Finder",
    subtitle: "Find Your Laptop Easily",
    href: "/category/laptop",
    icon: "laptop",
  },
  {
    id: "raise-complain",
    title: "Raise a Complain",
    subtitle: "Share your experience",
    href: "/contact",
    icon: "complain",
  },
  {
    id: "ac-ton-calculator",
    title: "AC Ton Calculator",
    subtitle: "Find Perfect AC.",
    href: "/category/appliance",
    icon: "ac",
  },
  {
    id: "servicing-center",
    title: "Servicing Center",
    subtitle: "Repair Your Device",
    href: "/contact",
    icon: "service",
  },
] as const;

export interface QuickServiceBarProps {
  items?: readonly QuickServiceItem[];
}

function renderServiceIcon(icon: QuickServiceItem["icon"]) {
  switch (icon) {
    case "laptop":
      return <Laptop className="h-5 w-5" strokeWidth={2} aria-hidden="true" />;
    case "complain":
      return <MessageSquareWarning className="h-5 w-5" strokeWidth={2} aria-hidden="true" />;
    case "ac":
      return <Home className="h-5 w-5" strokeWidth={2} aria-hidden="true" />;
    case "service":
      return <Settings className="h-5 w-5" strokeWidth={2} aria-hidden="true" />;
  }
}

export function QuickServiceBar({ items = DEFAULT_ITEMS }: QuickServiceBarProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="bg-white rounded-card px-5 py-4 shadow-card border border-brand-border/70 hover:shadow-cardHover hover:border-brand-orange/35 transition-all flex items-center gap-4 group"
        >
          <span className="h-11 w-11 rounded-full bg-brand-orange group-hover:bg-brand-orangeHover text-white flex items-center justify-center flex-shrink-0 shadow-sm transition-colors">
            {renderServiceIcon(item.icon)}
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-brand-textMain group-hover:text-brand-orange transition-colors leading-snug truncate">
              {item.title}
            </div>
            <div className="text-xs text-brand-textMuted mt-0.5 leading-snug truncate">
              {item.subtitle}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
