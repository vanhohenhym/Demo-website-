"use client";

import React, { useEffect, useState } from "react";

export interface MegaDealCountdownProps {
  targetDateIso?: string;
  label?: string;
}

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const DEFAULT_MEGA_DEAL_TARGET_ISO = "2026-12-15T23:59:59+06:00";

const INITIAL_COUNTDOWN: CountdownParts = {
  days: 5,
  hours: 21,
  minutes: 25,
  seconds: 9,
};

const DEFAULT_TARGET_TIMESTAMP = Date.parse(DEFAULT_MEGA_DEAL_TARGET_ISO);

function splitRemainingMs(ms: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.min(99, Math.floor(totalSeconds / 86400));
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function toTwoDigits(value: number): [string, string] {
  const padded = String(Math.max(0, Math.min(99, value))).padStart(2, "0");
  return [padded[0] ?? "0", padded[1] ?? "0"];
}

export function MegaDealCountdown({
  targetDateIso,
  label = "Ending In:",
}: MegaDealCountdownProps) {
  // Deterministic initial snapshot ensures 100% SSR/client hydration parity.
  const [remaining, setRemaining] = useState<CountdownParts>(INITIAL_COUNTDOWN);

  useEffect(() => {
    const parsedTarget = targetDateIso ? Date.parse(targetDateIso) : Number.NaN;
    const targetTimestamp = Number.isFinite(parsedTarget)
      ? parsedTarget
      : DEFAULT_TARGET_TIMESTAMP;

    const update = () => {
      setRemaining(splitRemainingMs(targetTimestamp - Date.now()));
    };

    update();
    const intervalId = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [targetDateIso]);

  const units: ReadonlyArray<{ key: string; unitLabel: string; value: number }> = [
    { key: "days", unitLabel: "Days", value: remaining.days },
    { key: "hours", unitLabel: "Hours", value: remaining.hours },
    { key: "minutes", unitLabel: "Minutes", value: remaining.minutes },
    { key: "seconds", unitLabel: "Seconds", value: remaining.seconds },
  ];

  const isoDuration = `P${remaining.days}DT${remaining.hours}H${remaining.minutes}M${remaining.seconds}S`;
  const accessibleSummary = `${label} ${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`;

  return (
    <div className="flex flex-col items-start sm:items-end">
      <span className="mb-1 text-xs font-bold tracking-tight text-brand-textMain">
        {label}
      </span>

      <time
        dateTime={isoDuration}
        aria-label={accessibleSummary}
        className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5"
      >
        {units.map(({ key, unitLabel, value }) => {
          const [tens, ones] = toTwoDigits(value);
          return (
            <span
              key={key}
              aria-hidden="true"
              className="inline-flex items-center gap-1"
            >
              <span className="inline-flex items-center gap-0.5 tabular-nums">
                <span className="inline-flex min-w-[20px] items-center justify-center rounded bg-brand-countdownRed px-1.5 py-0.5 text-xs font-bold leading-none text-white shadow-sm sm:min-w-[22px] sm:text-sm">
                  {tens}
                </span>
                <span className="inline-flex min-w-[20px] items-center justify-center rounded bg-brand-countdownRed px-1.5 py-0.5 text-xs font-bold leading-none text-white shadow-sm sm:min-w-[22px] sm:text-sm">
                  {ones}
                </span>
              </span>
              <span className="text-[11px] font-medium text-slate-700">
                {unitLabel}
              </span>
            </span>
          );
        })}
      </time>
    </div>
  );
}
