"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";
import {
  COOKIE_CONSENT_OPEN_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  parseConsentRecord,
  readStoredConsent,
  writeStoredConsent,
  type ConsentRecord,
} from "@/lib/analytics/consent";

export function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [storedConsent, setStoredConsent] = useState<ConsentRecord | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const bannerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);

    const existing = readStoredConsent();
    setStoredConsent(existing);
    if (existing === null) {
      setIsOpen(true);
    }

    const handleOpen = () => {
      setStoredConsent(readStoredConsent());
      setIsOpen(true);
      requestAnimationFrame(() => {
        bannerRef.current?.focus();
      });
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === COOKIE_CONSENT_STORAGE_KEY || event.key === null) {
        const nextRecord =
          event.key === null
            ? readStoredConsent()
            : parseConsentRecord(event.newValue);
        setStoredConsent(nextRecord);
        setIsOpen(nextRecord === null);
      }
    };

    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, handleOpen);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, handleOpen);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleSave = (analytics: boolean) => {
    const saved = writeStoredConsent(analytics);
    setStoredConsent(saved);
    setIsOpen(false);
    setLiveMessage(
      analytics
        ? "Cookie preferences saved: Essential storage and analytics cookies enabled."
        : "Cookie preferences saved: Essential storage only."
    );
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      {isOpen ? (
        <section
          ref={bannerRef}
          tabIndex={-1}
          role="region"
          aria-labelledby="cookie-consent-title"
          className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 rounded-card border border-brand-border bg-white p-4 shadow-dock no-print"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck
                className="h-4 w-4 flex-shrink-0 text-brand-blue"
                aria-hidden="true"
              />
              <h2
                id="cookie-consent-title"
                className="text-sm font-bold text-brand-textMain"
              >
                Cookie &amp; Privacy Preferences
              </h2>
            </div>

            {storedConsent !== null ? (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close cookie preferences"
                className="inline-flex h-7 w-7 items-center justify-center rounded-control text-brand-textMuted transition-colors hover:bg-gray-100 hover:text-brand-textMain"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {storedConsent !== null ? (
            <div className="mt-2">
              <span
                className={`inline-flex items-center rounded-control px-2 py-0.5 text-[11px] font-semibold ${
                  storedConsent.analytics
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-slate-100 text-slate-800 border border-slate-200"
                }`}
              >
                Current preference:{" "}
                {storedConsent.analytics ? "Analytics Enabled" : "Essential Only"}
              </span>
            </div>
          ) : null}

          <p className="mt-2 text-xs leading-relaxed text-brand-textMuted">
            We use essential browser storage to keep your PC Builder configuration
            and product comparison list working. Optional Google Analytics 4
            measurement is disabled by default and only loads if you opt in.{" "}
            <Link
              href="/privacy-policy#cookies"
              className="font-medium text-brand-blue underline underline-offset-2 hover:text-brand-orange"
            >
              Read our Cookie Policy
            </Link>
            .
          </p>

          <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex-1 min-h-[40px] rounded-control border border-brand-navy bg-white px-3 py-2 text-xs font-semibold text-brand-navy transition-colors hover:bg-gray-100"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="flex-1 min-h-[40px] rounded-control border border-brand-blue bg-brand-blue px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blueDark"
            >
              Accept Analytics
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
