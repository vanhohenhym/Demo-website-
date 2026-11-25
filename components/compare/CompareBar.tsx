"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, GitCompareArrows, Trash2, X } from "lucide-react";
import { useCompare } from "@/components/compare/CompareProvider";

function isRenderableImageUrl(url?: string): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:image/")
  );
}

export function CompareBar() {
  const {
    items,
    count,
    maxItems,
    categoryName,
    pendingConflict,
    removeItem,
    clearAll,
    confirmReplaceWithPending,
    cancelPendingConflict,
  } = useCompare();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevCountRef.current !== null && prevCountRef.current !== count) {
      setLiveAnnouncement(
        count === 0
          ? "Compare list cleared."
          : `${count} of ${maxItems} products in compare.`
      );
    }
    prevCountRef.current = count;
  }, [count, maxItems]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (pendingConflict && !dialog.open) {
      dialog.showModal();
    } else if (!pendingConflict && dialog.open) {
      dialog.close();
    }
  }, [pendingConflict]);

  const handleDialogClose = () => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.returnValue = "";
    }
    if (pendingConflict) {
      cancelPendingConflict();
    }
  };

  const handleDialogCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    cancelPendingConflict();
  };

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {count > 0 ? (
        <section
          aria-label="Product comparison bar"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-border bg-white/95 shadow-dock backdrop-blur-sm no-print"
        >
          <div className="mx-auto flex max-w-site flex-col gap-2.5 px-4 py-2.5 pr-20 sm:flex-row sm:items-center sm:justify-between sm:pr-24">
            {/* Left: Header + Selected Items */}
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex shrink-0 items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-textMain tabular-nums">
                  <GitCompareArrows
                    className="h-4 w-4 text-brand-orange"
                    aria-hidden="true"
                  />
                  <span>
                    Compare ({count}/{maxItems})
                  </span>
                </span>
                {categoryName ? (
                  <span className="rounded-control bg-brand-grayBg px-2 py-0.5 text-[11px] font-medium text-brand-textMuted">
                    {categoryName}
                  </span>
                ) : null}
              </div>

              <ul className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex shrink-0 items-center gap-2 rounded-control border border-brand-border bg-brand-grayBg/50 px-2 py-1 max-w-[190px] sm:max-w-[210px]"
                  >
                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-white border border-brand-border/60">
                      {isRenderableImageUrl(item.imageUrl) ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.imageAlt || item.name}
                          fill
                          sizes="32px"
                          className="object-contain p-0.5"
                        />
                      ) : (
                        <span className="text-[9px] font-bold uppercase text-brand-textMuted">
                          {item.brand.slice(0, 3)}
                        </span>
                      )}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-brand-textMain">
                      {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.name} from compare`}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-brand-textMuted transition-colors hover:bg-white hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Actions */}
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 rounded-control border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-textMuted transition-colors hover:border-red-300 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear All</span>
              </button>

              <Link
                href="/compare"
                className="inline-flex items-center gap-1.5 rounded-control bg-brand-orange px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-orangeHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1"
              >
                <span>Compare Now</span>
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                  {count}
                </span>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Native <dialog> for Category Mismatch Confirmation */}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClose={handleDialogClose}
        onCancel={handleDialogCancel}
        className="m-auto w-[min(92vw,26rem)] rounded-lg border border-brand-border bg-white p-0 text-brand-textMain shadow-xl overscroll-contain backdrop:bg-brand-navy/60 backdrop:overflow-hidden backdrop:overscroll-contain"
      >
        {pendingConflict ? (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2
                  id={titleId}
                  className="text-base font-bold text-brand-textMain"
                >
                  Replace current compare list?
                </h2>
                <p id={descId} className="text-xs leading-relaxed text-brand-textMuted">
                  You are currently comparing{" "}
                  <strong className="text-brand-textMain">
                    {pendingConflict.existingCategoryName}
                  </strong>{" "}
                  products. Adding{" "}
                  <strong className="text-brand-textMain">
                    {pendingConflict.item.name}
                  </strong>{" "}
                  ({pendingConflict.item.categoryName}) will clear your current
                  compare list.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                autoFocus
                onClick={cancelPendingConflict}
                className="rounded-control border border-brand-border bg-white px-3.5 py-2 text-xs font-semibold text-brand-textMain transition-colors hover:bg-brand-grayBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                Keep Current
              </button>
              <button
                type="button"
                onClick={confirmReplaceWithPending}
                className="rounded-control bg-brand-orange px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-orangeHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1"
              >
                Replace List
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
