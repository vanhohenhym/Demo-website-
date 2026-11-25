"use client";

import React, { useId } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { CompatibilityCheck } from "@/lib/logic/types";

export interface CompatibilitySummaryProps {
  checks: CompatibilityCheck[];
  errorCount: number;
  warningCount: number;
  unverifiedCount: number;
  ignoreCompatibility: boolean;
  onToggleIgnoreCompatibility: (ignore: boolean) => void;
  onToggleVerifiedRule: (ruleId: string) => void;
}

function getStatusBadge(status: CompatibilityCheck["status"]) {
  if (status === "ok") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        <span>Compatible</span>
      </Badge>
    );
  }
  if (status === "warning") {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        <span>Warning</span>
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="error" className="gap-1">
        <AlertCircle className="h-3 w-3" aria-hidden="true" />
        <span>Incompatible</span>
      </Badge>
    );
  }
  return (
    <Badge
      variant="neutral"
      className="gap-1 bg-amber-50 text-amber-900 border-amber-300"
    >
      <HelpCircle className="h-3 w-3 text-amber-700" aria-hidden="true" />
      <span>Could not verify</span>
    </Badge>
  );
}

export function CompatibilitySummary({
  checks,
  errorCount,
  warningCount,
  unverifiedCount,
  ignoreCompatibility,
  onToggleIgnoreCompatibility,
  onToggleVerifiedRule,
}: CompatibilitySummaryProps) {
  const ignoreToggleId = useId();
  const baseId = useId();

  return (
    <section
      aria-labelledby={`${baseId}-heading`}
      className="bg-white rounded-lg border border-brand-border shadow-card overflow-hidden"
    >
      <div className="p-4 bg-gray-50 border-b border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            id={`${baseId}-heading`}
            className="text-sm font-bold text-brand-textMain flex items-center gap-2"
          >
            <ShieldAlert className="h-4 w-4 text-brand-blue" aria-hidden="true" />
            <span>Compatibility Evaluation</span>
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-brand-textMuted tabular-nums">
            <span className={errorCount > 0 ? "text-rose-700 font-semibold" : ""}>
              Errors: {errorCount}
            </span>
            <span aria-hidden="true">·</span>
            <span className={warningCount > 0 ? "text-amber-700 font-semibold" : ""}>
              Warnings: {warningCount}
            </span>
            <span aria-hidden="true">·</span>
            <span className={unverifiedCount > 0 ? "text-amber-800 font-semibold" : ""}>
              Unverified checks: {unverifiedCount}
            </span>
          </div>
        </div>

        <label
          htmlFor={ignoreToggleId}
          className="inline-flex items-center gap-2 text-xs font-semibold text-brand-textMain cursor-pointer select-none no-print"
        >
          <input
            id={ignoreToggleId}
            type="checkbox"
            checked={ignoreCompatibility}
            onChange={(e) => onToggleIgnoreCompatibility(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-brand-blue cursor-pointer"
            {...({ switch: "" } as Record<string, string>)}
          />
          <span>Ignore compatibility</span>
        </label>
      </div>

      {ignoreCompatibility ? (
        <div className="p-4 text-xs text-amber-900 bg-amber-50 border-b border-amber-200">
          Compatibility filtering and blocking are currently ignored. All selected
          components are still listed below for your reference.
        </div>
      ) : null}

      {checks.length === 0 ? (
        <div className="p-4 text-xs text-brand-textMuted">
          Select at least two core components (such as CPU, Motherboard, RAM, GPU,
          PSU, Case, Cooler, or Storage) to run compatibility checks.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {checks.map((check) => {
            const verifyId = `${baseId}-verify-${check.ruleId}`;
            const hasDetectedText = check.message
              .toLowerCase()
              .includes("based on detected data");

            return (
              <li
                key={check.ruleId}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(check.status)}
                    <span className="text-xs font-semibold text-brand-textMain">
                      {check.ruleId}
                    </span>
                    {check.confidence === "medium" && !hasDetectedText ? (
                      <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        based on detected data
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-brand-textMain leading-relaxed">
                    {check.message}
                  </p>
                </div>

                {check.status === "unknown" ? (
                  <label
                    htmlFor={verifyId}
                    className="inline-flex items-center gap-2 text-xs font-medium text-brand-textMain bg-gray-50 border border-gray-200 rounded-control px-3 py-1.5 cursor-pointer select-none flex-shrink-0 no-print hover:bg-gray-100 transition-colors"
                  >
                    <input
                      id={verifyId}
                      type="checkbox"
                      checked={check.verified}
                      onChange={() => onToggleVerifiedRule(check.ruleId)}
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-brand-blue cursor-pointer"
                    />
                    <span>I verified this manually</span>
                  </label>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
