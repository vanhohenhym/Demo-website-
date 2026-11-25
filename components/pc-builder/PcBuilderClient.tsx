"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Printer,
  RotateCcw,
  Share2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/lib/cms/types";
import {
  BUILDER_SLOTS,
  PC_BUILDER_STORAGE_KEY,
  createEmptyBuilderState,
  encodeShareState,
  evaluateBuilderState,
  getBuilderSlot,
  getChooseHref,
  parseBuilderStorage,
  removeBuilderItem,
  setBuilderItem,
  setBuilderQuantity,
  setIgnoreCompatibility,
  toggleVerifiedRule,
  type BuilderSlotId,
  type PcBuilderState,
} from "@/lib/pc-builder/builder";
import { BuilderSlotRow } from "@/components/pc-builder/BuilderSlotRow";
import { CompatibilitySummary } from "@/components/pc-builder/CompatibilitySummary";

export interface PcBuilderClientProps {
  slotCoverages: Partial<Record<BuilderSlotId, number>>;
  pendingAdd?: {
    slotId: BuilderSlotId;
    product: Product;
  };
  sharedBuild?: PcBuilderState;
}

function formatPrice(amount: number): string {
  return `${amount.toLocaleString("en-US")}৳`;
}

export function PcBuilderClient({
  slotCoverages,
  pendingAdd,
  sharedBuild,
}: PcBuilderClientProps) {
  const router = useRouter();
  const [state, setState] = useState<PcBuilderState>(() =>
    sharedBuild ?? createEmptyBuilderState()
  );
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [printDate, setPrintDate] = useState<string>("");
  const lastAppliedQueryKeyRef = useRef<string | null>(null);

  const persistState = useCallback((next: PcBuilderState) => {
    setState(next);
    try {
      window.localStorage.setItem(PC_BUILDER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota or privacy-mode errors
    }
  }, []);

  useEffect(() => {
    setPrintDate(
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );
  }, []);

  const queryKey = `${pendingAdd?.slotId ?? ""}:${pendingAdd?.product.slug ?? ""}:${sharedBuild ? encodeShareState(sharedBuild) : ""}`;

  useEffect(() => {
    if (lastAppliedQueryKeyRef.current === queryKey) {
      return;
    }
    if (lastAppliedQueryKeyRef.current !== null && !pendingAdd && !sharedBuild) {
      lastAppliedQueryKeyRef.current = queryKey;
      return;
    }
    lastAppliedQueryKeyRef.current = queryKey;

    let nextState = sharedBuild
      ? sharedBuild
      : parseBuilderStorage(window.localStorage.getItem(PC_BUILDER_STORAGE_KEY));

    if (pendingAdd) {
      nextState = setBuilderItem(
        nextState,
        pendingAdd.slotId,
        pendingAdd.product
      );
      const slotLabel =
        getBuilderSlot(pendingAdd.slotId)?.label ?? pendingAdd.slotId;
      setStatusMessage(`Added ${pendingAdd.product.name} to ${slotLabel}.`);
    } else if (sharedBuild) {
      setStatusMessage("Shared build loaded.");
    }

    setState(nextState);
    try {
      window.localStorage.setItem(
        PC_BUILDER_STORAGE_KEY,
        JSON.stringify(nextState)
      );
    } catch {
      // Ignore storage errors
    }

    if (pendingAdd || sharedBuild) {
      router.replace("/pc-builder", { scroll: false });
    }
  }, [queryKey, pendingAdd, sharedBuild, router]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PC_BUILDER_STORAGE_KEY) {
        setState(parseBuilderStorage(event.newValue));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const evaluation = useMemo(() => evaluateBuilderState(state), [state]);
  const filledSlotsCount = useMemo(
    () =>
      BUILDER_SLOTS.reduce(
        (count, slot) => (state.items[slot.id] ? count + 1 : count),
        0
      ),
    [state.items]
  );

  const handleRemove = useCallback(
    (slotId: BuilderSlotId) => {
      const slotLabel = getBuilderSlot(slotId)?.label ?? slotId;
      persistState(removeBuilderItem(state, slotId));
      setStatusMessage(`Removed component from ${slotLabel}.`);
    },
    [state, persistState]
  );

  const handleQuantityChange = useCallback(
    (slotId: BuilderSlotId, quantity: number) => {
      persistState(setBuilderQuantity(state, slotId, quantity));
    },
    [state, persistState]
  );

  const handleToggleIgnoreCompatibility = useCallback(
    (ignore: boolean) => {
      persistState(setIgnoreCompatibility(state, ignore));
      setStatusMessage(
        ignore
          ? "Compatibility checks ignored."
          : "Compatibility checks enabled."
      );
    },
    [state, persistState]
  );

  const handleToggleVerifiedRule = useCallback(
    (ruleId: string) => {
      persistState(toggleVerifiedRule(state, ruleId));
    },
    [state, persistState]
  );

  const handleClearBuild = useCallback(() => {
    persistState(createEmptyBuilderState());
    setStatusMessage("Build cleared.");
  }, [persistState]);

  const handleShareBuild = useCallback(async () => {
    const encoded = encodeShareState(state);
    const shareUrl = `${window.location.origin}/pc-builder?share=${encoded}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setStatusMessage("Link copied!");
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setStatusMessage(`Share URL ready: ${shareUrl}`);
    }
  }, [state]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const compatibilityLabel = state.ignoreCompatibility
    ? "Ignored"
    : evaluation.errorCount > 0
      ? `${evaluation.errorCount} ${evaluation.errorCount === 1 ? "Error" : "Errors"}`
      : evaluation.warningCount > 0
        ? `${evaluation.warningCount} ${evaluation.warningCount === 1 ? "Warning" : "Warnings"}`
        : "Ready to Build";

  const compatibilityColor = state.ignoreCompatibility
    ? "text-amber-700"
    : evaluation.errorCount > 0
      ? "text-rose-700"
      : evaluation.warningCount > 0
        ? "text-amber-700"
        : "text-emerald-600";

  return (
    <div className="space-y-6">
      {/* Print-only Header */}
      <div className="hidden print:block border-b border-gray-300 pb-3">
        <h2 className="text-lg font-bold text-black">
          Custom PC Build Summary
        </h2>
        {printDate ? (
          <p className="text-xs text-gray-600">Generated on {printDate}</p>
        ) : null}
      </div>

      {/* Header bar */}
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-brand-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          {/* Exactly ONE h1 */}
          <h1 className="text-xl sm:text-2xl font-bold text-brand-textMain flex items-center gap-2">
            <Wrench className="h-6 w-6 text-brand-blue" aria-hidden="true" />
            <span>PC Builder - Assemble Your Dream Rig</span>
          </h1>
          <p className="text-xs text-brand-textMuted mt-1">
            Select compatible components, monitor estimated wattage, and evaluate
            build compatibility.
          </p>
        </div>

        {/* Builder Actions */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Print Summary</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleShareBuild}
          >
            {copiedLink ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            ) : (
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{copiedLink ? "Link copied!" : "Share Build"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-rose-700 hover:bg-rose-50"
            onClick={handleClearBuild}
            disabled={filledSlotsCount === 0}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear Build</span>
          </Button>
        </div>
      </div>

      {/* Polite live region for status announcements */}
      <div
        role="status"
        aria-live="polite"
        className={
          statusMessage
            ? "rounded-control border border-brand-blue/20 bg-brand-flashBg px-4 py-2 text-xs font-medium text-brand-textMain no-print"
            : "sr-only"
        }
      >
        {statusMessage}
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-brand-border shadow-card">
          <div className="text-[11px] text-brand-textMuted uppercase font-semibold">
            Total Price
          </div>
          <div className="text-xl font-black text-brand-orange mt-0.5 tabular-nums">
            {formatPrice(evaluation.totalPrice)}
          </div>
          {evaluation.excludedItemIds.length > 0 ? (
            <div className="text-[11px] text-amber-700 mt-0.5 tabular-nums">
              {evaluation.excludedItemIds.length} excluded (out of stock / call for price)
            </div>
          ) : null}
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-brand-border shadow-card">
          <div className="text-[11px] text-brand-textMuted uppercase font-semibold">
            Estimated Power
          </div>
          <div className="text-xl font-bold text-brand-textMain mt-0.5 tabular-nums">
            {evaluation.estimatedWattage !== undefined
              ? `${evaluation.estimatedWattage} W`
              : "— W"}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-brand-border shadow-card">
          <div className="text-[11px] text-brand-textMuted uppercase font-semibold">
            Selected Items
          </div>
          <div className="text-xl font-bold text-brand-textMain mt-0.5 tabular-nums">
            {filledSlotsCount} / {BUILDER_SLOTS.length}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-brand-border shadow-card">
          <div className="text-[11px] text-brand-textMuted uppercase font-semibold">
            Compatibility
          </div>
          <div
            className={`text-sm font-bold mt-1 flex items-center gap-1 ${compatibilityColor}`}
          >
            {evaluation.errorCount === 0 && !state.ignoreCompatibility ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{compatibilityLabel}</span>
          </div>
          <div className="text-[11px] text-brand-textMuted mt-0.5 tabular-nums">
            Unverified checks: {evaluation.unverifiedCount}
          </div>
        </div>
      </div>

      {/* 12 Component Slots List */}
      <div className="bg-white rounded-lg border border-brand-border shadow-card divide-y divide-gray-100">
        <div className="p-4 bg-gray-50 flex items-center justify-between text-xs font-bold text-gray-700">
          <span>Component Slot</span>
          <span className="no-print">Action</span>
        </div>

        {BUILDER_SLOTS.map((slotDef) => {
          const coveragePercent = slotCoverages[slotDef.id] ?? 100;
          const chooseHref = getChooseHref(slotDef, state, coveragePercent);
          return (
            <BuilderSlotRow
              key={slotDef.id}
              slotDef={slotDef}
              evaluation={evaluation.slots[slotDef.id]}
              chooseHref={chooseHref}
              onRemove={handleRemove}
              onQuantityChange={handleQuantityChange}
            />
          );
        })}
      </div>

      {/* Compatibility Evaluation */}
      <CompatibilitySummary
        checks={evaluation.checks}
        errorCount={evaluation.errorCount}
        warningCount={evaluation.warningCount}
        unverifiedCount={evaluation.unverifiedCount}
        ignoreCompatibility={state.ignoreCompatibility}
        onToggleIgnoreCompatibility={handleToggleIgnoreCompatibility}
        onToggleVerifiedRule={handleToggleVerifiedRule}
      />
    </div>
  );
}
