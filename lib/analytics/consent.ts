export const COOKIE_CONSENT_STORAGE_KEY = "pc_cookie_consent";
export const COOKIE_CONSENT_EVENT = "pc-cookie-consent-change";
export const COOKIE_CONSENT_OPEN_EVENT = "pc-cookie-consent-open";

export interface ConsentRecord {
  version: 1;
  essential: true;
  analytics: boolean;
  updatedAt: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/i;

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function parseConsentRecord(raw: string | null): ConsentRecord | null {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    if (
      candidate.version !== 1 ||
      candidate.essential !== true ||
      typeof candidate.analytics !== "boolean" ||
      typeof candidate.updatedAt !== "string" ||
      candidate.updatedAt.trim().length === 0
    ) {
      return null;
    }

    return {
      version: 1,
      essential: true,
      analytics: candidate.analytics,
      updatedAt: candidate.updatedAt,
    };
  } catch {
    return null;
  }
}

export function createConsentRecord(
  analytics: boolean,
  nowIso?: string
): ConsentRecord {
  return {
    version: 1,
    essential: true,
    analytics: Boolean(analytics),
    updatedAt:
      typeof nowIso === "string" && nowIso.trim().length > 0
        ? nowIso
        : new Date().toISOString(),
  };
}

export function readStoredConsent(
  storage?: StorageLike | null
): ConsentRecord | null {
  const target = storage === undefined ? getBrowserStorage() : storage;
  if (!target) {
    return null;
  }

  try {
    return parseConsentRecord(target.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredConsent(
  analytics: boolean,
  storage?: StorageLike | null,
  nowIso?: string
): ConsentRecord {
  const record = createConsentRecord(analytics, nowIso);
  const target = storage === undefined ? getBrowserStorage() : storage;

  if (target) {
    try {
      target.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Ignore storage quota or private browsing write errors
    }
  }

  if (
    storage === undefined &&
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function" &&
    typeof CustomEvent === "function"
  ) {
    window.dispatchEvent(
      new CustomEvent<ConsentRecord>(COOKIE_CONSENT_EVENT, { detail: record })
    );
  }

  return record;
}

export function hasAnalyticsConsent(record: ConsentRecord | null): boolean {
  return Boolean(record && record.analytics);
}

export function isValidGaMeasurementId(id?: string): boolean {
  return typeof id === "string" && GA_MEASUREMENT_ID_PATTERN.test(id.trim());
}
