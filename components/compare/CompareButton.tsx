"use client";

import React, { useEffect, useState } from "react";
import { Check, GitCompareArrows } from "lucide-react";
import type { Product } from "@/lib/cms/types";
import type { CompareItem } from "@/lib/compare/compare";
import { useCompare } from "@/components/compare/CompareProvider";

export interface CompareButtonProps {
  product: Product | CompareItem;
  variant?: "card" | "detail";
  className?: string;
}

export function CompareButton({
  product,
  variant = "card",
  className = "",
}: CompareButtonProps) {
  const { isInCompare, addProduct, removeItem, maxItems } = useCompare();
  const [feedback, setFeedback] = useState<string | null>(null);

  const active = isInCompare(product.id);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (active) {
      removeItem(product.id);
      setFeedback(null);
      return;
    }

    const result = addProduct(product);
    if (result.status === "full") {
      setFeedback(`Max ${maxItems} items`);
    } else {
      setFeedback(null);
    }
  };

  const label = active ? "In Compare" : "Compare";
  const accessibleName = active
    ? `In Compare — remove ${product.name}`
    : `Compare ${product.name}`;

  if (variant === "detail") {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={handleClick}
          aria-pressed={active}
          aria-label={accessibleName}
          className={`inline-flex items-center gap-2 rounded-control border px-4 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1 ${
            active
              ? "border-brand-blue bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/15"
              : "border-brand-border bg-white text-brand-textMain hover:border-brand-blue hover:text-brand-blue"
          }`}
        >
          {active ? (
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <GitCompareArrows className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{label}</span>
        </button>
        {feedback ? (
          <span
            role="status"
            aria-live="polite"
            className="text-xs font-medium text-brand-orange"
          >
            {feedback}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`relative z-10 flex items-center justify-between gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={accessibleName}
        className={`inline-flex w-full items-center justify-center gap-1.5 rounded-control border px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1 ${
          active
            ? "border-brand-blue bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/15"
            : "border-brand-border bg-brand-grayBg/60 text-brand-textMain hover:border-brand-blue hover:bg-white hover:text-brand-blue"
        }`}
      >
        {active ? (
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <GitCompareArrows className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        <span>{feedback ?? label}</span>
      </button>
    </div>
  );
}
