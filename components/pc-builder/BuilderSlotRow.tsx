"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  Cpu,
  Minus,
  Plus,
  PlusCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type {
  BuilderSlotDefinition,
  BuilderSlotEvaluation,
  BuilderSlotId,
} from "@/lib/pc-builder/builder";

export interface BuilderSlotRowProps {
  slotDef: BuilderSlotDefinition;
  evaluation?: BuilderSlotEvaluation;
  chooseHref: string;
  onRemove: (slotId: BuilderSlotId) => void;
  onQuantityChange: (slotId: BuilderSlotId, quantity: number) => void;
}

function formatPrice(amount: number): string {
  return `${amount.toLocaleString("en-US")}৳`;
}

function isRenderableImageUrl(url?: string): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:image/")
  );
}

export function BuilderSlotRow({
  slotDef,
  evaluation,
  chooseHref,
  onRemove,
  onQuantityChange,
}: BuilderSlotRowProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const product = evaluation?.product;
  const primaryImage = product?.images[0];
  const hasRenderableImage =
    Boolean(product) &&
    primaryImage !== undefined &&
    isRenderableImageUrl(primaryImage.url) &&
    failedImageUrl !== primaryImage.url;
  const quantity = evaluation?.quantity ?? 1;

  return (
    <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-gray-50/60 transition-colors">
      {/* Left: Slot identity + selected product */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className="relative h-12 w-12 rounded-control border border-brand-border bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {product && primaryImage && hasRenderableImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt || product.name}
              fill
              sizes="48px"
              className="object-contain p-1"
              onError={() => setFailedImageUrl(primaryImage.url)}
            />
          ) : product ? (
            <Cpu className="h-5 w-5 text-brand-blue" aria-hidden="true" />
          ) : (
            <span className="text-[10px] font-bold text-gray-400 uppercase">
              {slotDef.id.slice(0, 4)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-textMuted">
              {slotDef.label}
            </span>
            {slotDef.required ? (
              <Badge variant="sale">Required</Badge>
            ) : (
              <Badge variant="neutral">Optional</Badge>
            )}
            {product && evaluation?.isExcluded ? (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                <span>
                  {product.availability === "out_of_stock"
                    ? "Out of stock — excluded from total"
                    : "Call for price — excluded from total"}
                </span>
              </Badge>
            ) : null}
          </div>

          {product ? (
            <div className="mt-1 space-y-0.5">
              <Link
                href={`/product/${product.slug}`}
                className="text-sm font-semibold text-brand-textMain hover:text-brand-blue transition-colors line-clamp-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded-sm"
              >
                {product.name}
              </Link>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-brand-textMuted">
                <span>{product.categoryName || slotDef.label}</span>
                <span>SKU: {product.sku}</span>
                <span className="tabular-nums font-medium text-brand-textMain">
                  Unit:{" "}
                  {evaluation?.unitPrice !== undefined
                    ? formatPrice(evaluation.unitPrice)
                    : product.price !== undefined
                      ? formatPrice(product.price)
                      : "Call for price"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-brand-textMuted mt-0.5">{slotDef.notes}</p>
          )}
        </div>
      </div>

      {/* Right: Quantity, Subtotal, Actions */}
      {product && evaluation ? (
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {/* Quantity Controls */}
          {slotDef.supportsQuantity ? (
            <div
              className="inline-flex items-center rounded-control border border-brand-border bg-white no-print"
              role="group"
              aria-label={`${slotDef.label} quantity`}
            >
              <button
                type="button"
                onClick={() => onQuantityChange(slotDef.id, quantity - 1)}
                disabled={quantity <= slotDef.minQuantity}
                aria-label={`Decrease ${slotDef.label} quantity`}
                className="p-1.5 text-brand-textMain hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span className="px-2.5 text-xs font-semibold tabular-nums min-w-[2rem] text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(slotDef.id, quantity + 1)}
                disabled={quantity >= slotDef.maxQuantity}
                aria-label={`Increase ${slotDef.label} quantity`}
                className="p-1.5 text-brand-textMain hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-brand-textMuted tabular-nums">
              Qty: 1
            </span>
          )}

          {/* Subtotal */}
          <div className="text-right min-w-[5.5rem]">
            <div className="text-[10px] uppercase text-brand-textMuted font-medium">
              Subtotal
            </div>
            <div className="text-sm font-bold text-brand-orange tabular-nums">
              {evaluation.subtotal !== undefined
                ? formatPrice(evaluation.subtotal)
                : "Excluded"}
            </div>
          </div>

          {/* Change & Remove */}
          <div className="flex items-center gap-2 no-print">
            <Link
              href={chooseHref}
              aria-label={`Change ${slotDef.label}`}
              className="inline-flex items-center gap-1 rounded-control border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-textMain hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              <span>Change</span>
            </Link>
            <button
              type="button"
              onClick={() => onRemove(slotDef.id)}
              aria-label={`Remove ${product.name} from ${slotDef.label}`}
              className="inline-flex items-center gap-1 rounded-control border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end no-print">
          <Link
            href={chooseHref}
            aria-label={`Choose ${slotDef.label}`}
            className="inline-flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blueDark text-white text-xs font-semibold px-4 py-2 rounded-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Choose</span>
          </Link>
        </div>
      )}
    </div>
  );
}
