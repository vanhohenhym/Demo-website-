import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { JsonLd } from "./JsonLd";
import { getBreadcrumbSchema } from "@/lib/seo/schema";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const allItems = [{ label: "Home", href: "/" }, ...items];

  const schemaItems = allItems.map((item) => ({
    name: item.label,
    url: item.href || "/",
  }));

  return (
    <nav aria-label="Breadcrumb" className="my-3 text-xs text-brand-textMuted">
      <JsonLd schema={getBreadcrumbSchema(schemaItems)} />
      <ol className="flex flex-wrap items-center gap-1.5">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
              {index === 0 ? (
                <Link
                  href="/"
                  className="flex items-center gap-1 hover:text-brand-orange transition-colors"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span className="sr-only">Home</span>
                </Link>
              ) : isLast || !item.href ? (
                <span className="font-medium text-brand-textMain" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-brand-orange transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
