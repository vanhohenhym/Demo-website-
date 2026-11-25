"use client";

import React from "react";
import { COOKIE_CONSENT_OPEN_EVENT } from "@/lib/analytics/consent";

export interface CookieSettingsButtonProps {
  className?: string;
  label?: string;
}

export function CookieSettingsButton({
  className,
  label = "Cookie Settings",
}: CookieSettingsButtonProps) {
  const handleClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_OPEN_EVENT));
    }
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {label}
    </button>
  );
}
