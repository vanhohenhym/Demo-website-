import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "@/lib/seo/metadata";
import { SlidersHorizontal, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { CompareTable } from "@/components/compare/CompareTable";

export const metadata: Metadata = constructMetadata({
  title: "Compare Products",
  description: "Compare specifications, features, and prices of up to 4 computer components side by side.",
  path: "/compare",
  canonicalPath: "/compare",
  noIndex: true,
});

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Compare Products" }]} />

      {/* Exactly ONE h1 */}
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-textMain flex items-center gap-2">
            <SlidersHorizontal className="h-6 w-6 text-brand-orange" aria-hidden="true" />
            <span>Product Comparison</span>
          </h1>
          <p className="text-xs text-brand-textMuted mt-1">
            Compare up to 4 items in the same category side by side. Differing specifications are highlighted.
          </p>
        </div>

        <Link href="/category/component">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Browse Catalog</span>
          </Button>
        </Link>
      </div>

      <CompareTable />
    </div>
  );
}
