"use client";

import React, { useState } from "react";
import { Pause, Play } from "lucide-react";

export interface AnnouncementBarProps {
  /** Notice message scrolled across the ticker pill. */
  message?: string;
}

const DEFAULT_ANNOUNCEMENT =
  "Friday, 20 November — All our branches are open. Additionally, our online activities are open and operational. Explore 11.11 special deals and custom PC builds today.";

export function AnnouncementBar({
  message = DEFAULT_ANNOUNCEMENT,
}: AnnouncementBarProps) {
  const [isPaused, setIsPaused] = useState<boolean>(false);

  return (
    <div
      role="region"
      aria-label="Store announcement"
      className="w-full rounded-full bg-white shadow-card border border-brand-border/70 px-4 sm:px-5 py-2.5 flex items-center gap-3"
    >
      <div className="announcement-marquee-viewport flex-1 min-w-0 overflow-hidden">
        <div
          data-paused={isPaused ? "true" : "false"}
          className="announcement-marquee-track text-xs sm:text-[13px] font-medium text-brand-textMain"
        >
          <span className="whitespace-nowrap pr-16">{message}</span>
          <span
            aria-hidden="true"
            className="announcement-marquee-duplicate whitespace-nowrap pr-16"
          >
            {message}
          </span>
        </div>
      </div>

      {/* Visible keyboard-operable Pause / Play control (WCAG 2.2.2; dynamic label without aria-pressed) */}
      <button
        type="button"
        onClick={() => setIsPaused((prev) => !prev)}
        aria-label={isPaused ? "Play announcement" : "Pause announcement"}
        className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full text-brand-textMuted hover:text-brand-orange hover:bg-brand-grayBg transition-colors"
      >
        {isPaused ? (
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
        ) : (
          <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
