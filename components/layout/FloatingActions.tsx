"use client";

import React from "react";
import Link from "next/link";
import { CopyPlus, Cpu } from "lucide-react";
import { useCompare } from "@/components/compare/CompareProvider";

export function FloatingActions() {
  const { count: compareCount } = useCompare();

  return (
    <aside
      aria-label="Quick actions"
      className="fixed right-3 sm:right-4 bottom-4 sm:bottom-5 z-40 flex flex-col gap-2.5 no-print"
    >
      {/* Compare Floating Button */}
      <Link
        href="/compare"
        aria-label={`Compare (${compareCount} items)`}
        className="relative flex flex-col items-center justify-center w-[58px] h-[58px] rounded-control bg-brand-navy hover:bg-brand-blue text-white shadow-dock border border-white/10 transition-colors group"
      >
        <span
          aria-hidden="true"
          className="absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1 rounded-full bg-brand-orange text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-sm"
        >
          {compareCount}
        </span>
        <CopyPlus
          className="h-[19px] w-[19px] mb-1 transition-transform group-hover:scale-105"
          strokeWidth={1.9}
          aria-hidden="true"
        />
        <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
          Compare
        </span>
      </Link>

      {/* PC Builder Floating Button */}
      <Link
        href="/pc-builder"
        aria-label="PC Builder"
        className="relative flex flex-col items-center justify-center w-[58px] h-[58px] rounded-control bg-brand-navy hover:bg-brand-blue text-white shadow-dock border border-white/10 transition-colors group"
      >
        <Cpu
          className="h-[19px] w-[19px] mb-1 transition-transform group-hover:scale-105"
          strokeWidth={1.9}
          aria-hidden="true"
        />
        <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
          Builder
        </span>
      </Link>
    </aside>
  );
}
