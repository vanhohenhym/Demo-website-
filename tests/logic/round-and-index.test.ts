import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AUDITED_HEALTH_CATEGORY_SLUGS,
  ATTRIBUTE_NAME_ALIASES,
  BRAND_PLACEHOLDERS,
  FORM_FACTOR_SIZE_RANK,
  FORM_FACTOR_VOCABULARY,
  RAM_TYPE_PATTERNS,
  SOCKET_VOCABULARY,
  STORAGE_KEYWORD_FALLBACKS,
  STORAGE_VOCABULARY,
  brandVisibility,
  catalogDataHealthReport,
  checkBuildCompatibility,
  evaluateCategoryHealth,
  evaluatePcBuild,
  extractAttributes,
  normalizeAttribute,
  resolveBrand,
  roundHalfAwayFromZero,
} from "../../lib/logic/index.ts";

describe("roundHalfAwayFromZero (Global Rule 3)", () => {
  it("rounds positive halves up (away from zero)", () => {
    assert.equal(roundHalfAwayFromZero(0.5), 1);
    assert.equal(roundHalfAwayFromZero(2.5), 3);
    assert.equal(roundHalfAwayFromZero(89.5), 90);
    assert.equal(roundHalfAwayFromZero(59.4), 59);
  });

  it("rounds negative halves down (away from zero, unlike Math.round)", () => {
    assert.equal(roundHalfAwayFromZero(-0.5), -1);
    assert.equal(roundHalfAwayFromZero(-2.5), -3);
    assert.equal(roundHalfAwayFromZero(-0.4), 0);
  });

  it("handles zero without producing -0", () => {
    assert.ok(Object.is(roundHalfAwayFromZero(0), 0));
    assert.ok(Object.is(roundHalfAwayFromZero(-0), 0));
  });
});

describe("lib/logic/index.ts barrel exports", () => {
  it("exports all required functions and vocab tables", () => {
    assert.equal(typeof normalizeAttribute, "function");
    assert.equal(typeof extractAttributes, "function");
    assert.equal(typeof resolveBrand, "function");
    assert.equal(typeof brandVisibility, "function");
    assert.equal(typeof checkBuildCompatibility, "function");
    assert.equal(typeof evaluatePcBuild, "function");
    assert.equal(typeof evaluateCategoryHealth, "function");
    assert.equal(typeof catalogDataHealthReport, "function");
    assert.equal(typeof roundHalfAwayFromZero, "function");

    assert.ok(Object.keys(ATTRIBUTE_NAME_ALIASES).length > 0);
    assert.ok(Object.keys(SOCKET_VOCABULARY).length > 0);
    assert.ok(Object.keys(STORAGE_VOCABULARY).length > 0);
    assert.ok(STORAGE_KEYWORD_FALLBACKS.length > 0);
    assert.ok(Object.keys(FORM_FACTOR_VOCABULARY).length > 0);
    assert.ok(Object.keys(FORM_FACTOR_SIZE_RANK).length > 0);
    assert.ok(RAM_TYPE_PATTERNS.length > 0);
    assert.ok(BRAND_PLACEHOLDERS.length > 0);
    assert.deepEqual(AUDITED_HEALTH_CATEGORY_SLUGS, [
      "motherboard",
      "cpu",
      "gpu",
      "psu",
      "case",
      "cooler",
      "storage",
    ]);
  });
});
