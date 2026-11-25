import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { brandVisibility } from "../../lib/logic/brand-visibility.ts";
import type {
  BrandVisibilityInput,
  BrandVisibilityResult,
  CatalogProduct,
} from "../../lib/logic/types.ts";

interface SpecTestCase {
  id: string;
  label: string;
  input: BrandVisibilityInput;
  expectedOutput: BrandVisibilityResult;
}

interface SpecTestSuite {
  testCases: SpecTestCase[];
}

const suitePath = resolve(process.cwd(), "docs/LOGIC/tests/brand-visibility.test.json");
const specSuite: SpecTestSuite = JSON.parse(readFileSync(suitePath, "utf-8")) as SpecTestSuite;

describe("brandVisibility — spec JSON suite (10 cases)", () => {
  it("loads all 10 spec test cases", () => {
    assert.equal(specSuite.testCases.length, 10);
  });

  for (const tc of specSuite.testCases) {
    it(tc.label, () => {
      const actual = brandVisibility(tc.input);
      assert.deepEqual(actual, tc.expectedOutput);
    });
  }
});

describe("brandVisibility — defaults and edge cases", () => {
  const makeProduct = (id: string, brand: string, brandSlug: string): CatalogProduct => ({
    id,
    sku: `SKU-${id}`,
    name: `Prod ${id}`,
    brand,
    brandSlug,
    categorySlug: "gpu",
    availability: "in_stock",
  });

  it("applies default minBrandProducts=1 and indexMinProducts=3", () => {
    const res = brandVisibility({
      categorySlug: "gpu",
      products: [
        makeProduct("1", "ASUS", "asus"),
        makeProduct("2", "ASUS", "asus"),
        makeProduct("3", "ASUS", "asus"),
        makeProduct("4", "MSI", "msi"),
      ],
    });
    assert.equal(res.totalCategoryProducts, 4);
    assert.equal(res.categoryIndexable, true);
    assert.deepEqual(res.brands, [
      { brand: "ASUS", brandSlug: "asus", count: 3, indexable: true },
      { brand: "MSI", brandSlug: "msi", count: 1, indexable: false },
    ]);
  });

  it("uses the display name of the last matching product for a brandSlug", () => {
    const res = brandVisibility({
      categorySlug: "gpu",
      products: [
        makeProduct("1", "Asus", "asus"),
        makeProduct("2", "ASUS", "asus"),
      ],
    });
    assert.equal(res.brands[0]?.brand, "ASUS");
  });

  it("keeps Other non-indexable even when count >= indexMinProducts", () => {
    const res = brandVisibility({
      categorySlug: "gpu",
      products: [
        makeProduct("1", "Other", "other"),
        makeProduct("2", "Other", "other"),
        makeProduct("3", "Other", "other"),
        makeProduct("4", "Other", "other"),
        makeProduct("5", "Zotac", "zotac"),
      ],
      indexMinProducts: 3,
      minBrandProducts: 1,
    });
    assert.deepEqual(res.brands, [
      { brand: "Zotac", brandSlug: "zotac", count: 1, indexable: false },
      { brand: "Other", brandSlug: "other", count: 4, indexable: false },
    ]);
  });
});
