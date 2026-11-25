import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_OPEN_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  createConsentRecord,
  hasAnalyticsConsent,
  isValidGaMeasurementId,
  parseConsentRecord,
  readStoredConsent,
  writeStoredConsent,
  type StorageLike,
} from "../../lib/analytics/consent.ts";

class MemoryStorage implements StorageLike {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("analytics consent utilities", () => {
  it("exports expected storage key and event constants", () => {
    assert.equal(COOKIE_CONSENT_STORAGE_KEY, "pc_cookie_consent");
    assert.equal(COOKIE_CONSENT_EVENT, "pc-cookie-consent-change");
    assert.equal(COOKIE_CONSENT_OPEN_EVENT, "pc-cookie-consent-open");
  });

  it("parseConsentRecord accepts valid version 1 records and strips unexpected keys", () => {
    const raw = JSON.stringify({
      version: 1,
      essential: true,
      analytics: true,
      updatedAt: "2026-11-23T08:00:00.000Z",
      extra: "ignored",
    });

    assert.deepEqual(parseConsentRecord(raw), {
      version: 1,
      essential: true,
      analytics: true,
      updatedAt: "2026-11-23T08:00:00.000Z",
    });
  });

  it("parseConsentRecord rejects invalid, malformed, or tampered payloads", () => {
    assert.equal(parseConsentRecord(null), null);
    assert.equal(parseConsentRecord(""), null);
    assert.equal(parseConsentRecord("   "), null);
    assert.equal(parseConsentRecord("{not-json"), null);
    assert.equal(parseConsentRecord("[]"), null);
    assert.equal(parseConsentRecord("null"), null);
    assert.equal(
      parseConsentRecord(
        JSON.stringify({
          version: 2,
          essential: true,
          analytics: true,
          updatedAt: "2026-11-23T08:00:00.000Z",
        })
      ),
      null
    );
    assert.equal(
      parseConsentRecord(
        JSON.stringify({
          version: 1,
          essential: false,
          analytics: true,
          updatedAt: "2026-11-23T08:00:00.000Z",
        })
      ),
      null
    );
    assert.equal(
      parseConsentRecord(
        JSON.stringify({
          version: 1,
          essential: true,
          analytics: "yes",
          updatedAt: "2026-11-23T08:00:00.000Z",
        })
      ),
      null
    );
    assert.equal(
      parseConsentRecord(
        JSON.stringify({
          version: 1,
          essential: true,
          analytics: false,
          updatedAt: "",
        })
      ),
      null
    );
  });

  it("writeStoredConsent and readStoredConsent round-trip cleanly", () => {
    const storage = new MemoryStorage();
    assert.equal(readStoredConsent(storage), null);

    const saved = writeStoredConsent(true, storage, "2026-11-23T09:15:00.000Z");
    assert.deepEqual(saved, {
      version: 1,
      essential: true,
      analytics: true,
      updatedAt: "2026-11-23T09:15:00.000Z",
    });
    assert.deepEqual(readStoredConsent(storage), saved);

    const revoked = writeStoredConsent(false, storage, "2026-11-23T09:20:00.000Z");
    assert.equal(revoked.analytics, false);
    assert.deepEqual(readStoredConsent(storage), revoked);
  });

  it("readStoredConsent and writeStoredConsent handle null or throwing storage safely", () => {
    assert.equal(readStoredConsent(null), null);

    const brokenStorage: StorageLike = {
      getItem() {
        throw new Error("SecurityError: storage blocked");
      },
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };

    assert.equal(readStoredConsent(brokenStorage), null);
    const created = writeStoredConsent(true, brokenStorage, "2026-11-23T10:00:00.000Z");
    assert.equal(created.analytics, true);
    assert.equal(created.essential, true);

    const corruptStorage = new MemoryStorage();
    corruptStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "{bad");
    assert.equal(readStoredConsent(corruptStorage), null);
  });

  it("hasAnalyticsConsent returns true only when analytics is explicitly true", () => {
    assert.equal(hasAnalyticsConsent(null), false);
    assert.equal(hasAnalyticsConsent(createConsentRecord(false, "2026-11-23T10:00:00.000Z")), false);
    assert.equal(hasAnalyticsConsent(createConsentRecord(true, "2026-11-23T10:00:00.000Z")), true);
  });

  it("isValidGaMeasurementId accepts valid GA4 IDs and blocks malformed or XSS payloads", () => {
    assert.equal(isValidGaMeasurementId("G-ABCD123456"), true);
    assert.equal(isValidGaMeasurementId("G-1234"), true);
    assert.equal(isValidGaMeasurementId("  G-TEST9999  "), true);
    assert.equal(isValidGaMeasurementId("g-lower1234"), true);

    assert.equal(isValidGaMeasurementId(undefined), false);
    assert.equal(isValidGaMeasurementId(""), false);
    assert.equal(isValidGaMeasurementId("   "), false);
    assert.equal(isValidGaMeasurementId("G-123"), false);
    assert.equal(isValidGaMeasurementId("G-123456789012345678901"), false);
    assert.equal(isValidGaMeasurementId("UA-123456-1"), false);
    assert.equal(isValidGaMeasurementId("G-1234';alert(1)//"), false);
    assert.equal(isValidGaMeasurementId("<script>G-ABCD1234</script>"), false);
    assert.equal(isValidGaMeasurementId("G-ABCD 1234"), false);
  });
});
