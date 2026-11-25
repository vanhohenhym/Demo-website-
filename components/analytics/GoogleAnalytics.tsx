"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  hasAnalyticsConsent,
  isValidGaMeasurementId,
  parseConsentRecord,
  readStoredConsent,
  type ConsentRecord,
} from "@/lib/analytics/consent";

export interface GoogleAnalyticsProps {
  measurementId?: string;
}

type GtagFn = (...args: unknown[]) => void;

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const cleanId = typeof measurementId === "string" ? measurementId.trim() : "";
  const isValidId = isValidGaMeasurementId(cleanId);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    if (!isValidId) {
      return;
    }

    const syncFromStorage = () => {
      setAnalyticsAllowed(hasAnalyticsConsent(readStoredConsent()));
    };

    syncFromStorage();

    const handleConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<ConsentRecord | undefined>;
      if (customEvent.detail && typeof customEvent.detail === "object") {
        const parsed = parseConsentRecord(JSON.stringify(customEvent.detail));
        if (parsed) {
          setAnalyticsAllowed(hasAnalyticsConsent(parsed));
          return;
        }
      }
      syncFromStorage();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === COOKIE_CONSENT_STORAGE_KEY || event.key === null) {
        const nextRecord =
          event.key === null
            ? readStoredConsent()
            : parseConsentRecord(event.newValue);
        setAnalyticsAllowed(hasAnalyticsConsent(nextRecord));
      }
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [isValidId]);

  useEffect(() => {
    if (!isValidId) {
      return;
    }

    const win = window as unknown as Record<string, unknown>;
    const gtag = win.gtag;

    if (analyticsAllowed) {
      win[`ga-disable-${cleanId}`] = false;
      if (typeof gtag === "function") {
        (gtag as GtagFn)("consent", "update", {
          analytics_storage: "granted",
        });
      }
      return;
    }

    win[`ga-disable-${cleanId}`] = true;
    if (typeof gtag === "function") {
      (gtag as GtagFn)("consent", "update", {
        analytics_storage: "denied",
      });
    }
  }, [analyticsAllowed, cleanId, isValidId]);

  if (!isValidId || !analyticsAllowed) {
    return null;
  }

  const initScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('consent', 'default', {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});
gtag('js', new Date());
gtag('config', ${JSON.stringify(cleanId)}, {
  anonymize_ip: true,
  allow_google_signals: false
});
`.trim();

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cleanId)}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: initScript }}
      />
    </>
  );
}
