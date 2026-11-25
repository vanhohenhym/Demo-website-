import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveBrand } from "../../lib/logic/resolve-brand.ts";
import type { BrandConfig, RawCmsProduct, ResolveBrandResult } from "../../lib/logic/types.ts";

interface SpecTestCase {
  id: string;
  label: string;
  input: {
    product: RawCmsProduct;
    brandList: BrandConfig[];
  };
  expectedOutput: ResolveBrandResult;
}

interface SpecTestSuite {
  testCases: SpecTestCase[];
}

const suitePath = resolve(process.cwd(), "docs/LOGIC/tests/resolve-brand.test.json");
const specSuite: SpecTestSuite = JSON.parse(readFileSync(suitePath, "utf-8")) as SpecTestSuite;

describe("resolveBrand — spec JSON suite (12 cases)", () => {
  it("loads all 12 spec test cases", () => {
    assert.equal(specSuite.testCases.length, 12);
  });

  for (const tc of specSuite.testCases) {
    it(tc.label, () => {
      const actual = resolveBrand(tc.input.product, tc.input.brandList);
      assert.deepEqual(actual, tc.expectedOutput);
    });
  }
});

describe("resolveBrand — 10+ messy edge cases", () => {
  const brands: BrandConfig[] = [
    { name: "ASUS", slug: "asus", aliases: ["Asus", "ASUSTeK", "ROG"], skuPrefixes: ["ASU-"] },
    { name: "MSI", slug: "msi", aliases: ["Micro-Star"], skuPrefixes: ["MSI-"] },
    { name: "G.Skill", slug: "gskill", aliases: ["GSkill"], skuPrefixes: ["GSK-"] },
    { name: "LG", slug: "lg", aliases: [], skuPrefixes: ["LG-"] },
  ];

  it("matches title prefix when title is exact brand name length", () => {
    const res = resolveBrand(
      { id: "e1", sku: "X1", title: "MSI", categorySlug: "motherboard" },
      brands,
    );
    assert.deepEqual(res, { brand: "MSI", brandSlug: "msi" });
  });

  it("matches title prefix with slash boundary (ASUS/ROG)", () => {
    const res = resolveBrand(
      { id: "e2", sku: "X2", title: "ASUS/ROG Strix B650E", categorySlug: "motherboard" },
      brands,
    );
    assert.deepEqual(res, { brand: "ASUS", brandSlug: "asus" });
  });

  it("does not match LG prefix in LGA1700 title", () => {
    const res = resolveBrand(
      { id: "e3", sku: "X3", title: "LGA1700 Motherboard", categorySlug: "motherboard" },
      brands,
    );
    assert.deepEqual(res, { brand: "Other", brandSlug: "other" });
  });

  it("slugifies unknown brand dropping punctuation and converting spaces to hyphens", () => {
    const res = resolveBrand(
      {
        id: "e4",
        sku: "X4",
        title: "Trident Z5",
        categorySlug: "ram",
        brandTaxonomy: "  Be Quiet!  ",
      },
      [],
    );
    assert.deepEqual(res, { brand: "Be Quiet!", brandSlug: "be-quiet" });
  });

  it("slugifies unknown brand keeping hyphens and digits", () => {
    const res = resolveBrand(
      {
        id: "e5",
        sku: "X5",
        title: "Case",
        categorySlug: "case",
        brandTaxonomy: "Lian-Li 2026",
      },
      [],
    );
    assert.deepEqual(res, { brand: "Lian-Li 2026", brandSlug: "lian-li-2026" });
  });

  it("ignores placeholder 'na' (case-insensitive with spaces) and falls through to SKU prefix", () => {
    const res = resolveBrand(
      {
        id: "e6",
        sku: "  msi-b650  ",
        title: "B650 Board",
        categorySlug: "motherboard",
        brandTaxonomy: "  NA  ",
      },
      brands,
    );
    assert.deepEqual(res, { brand: "MSI", brandSlug: "msi" });
  });

  it("uses last matching config if multiple configs match raw brand", () => {
    const dupBrands: BrandConfig[] = [
      { name: "First", slug: "first", aliases: ["Shared"], skuPrefixes: [] },
      { name: "Second", slug: "second", aliases: ["Shared"], skuPrefixes: [] },
    ];
    const res = resolveBrand(
      {
        id: "e7",
        sku: "X7",
        title: "Item",
        categorySlug: "other",
        brandTaxonomy: "shared",
      },
      dupBrands,
    );
    assert.deepEqual(res, { brand: "Second", brandSlug: "second" });
  });

  it("uses first config in list on title prefix length tie", () => {
    const tieBrands: BrandConfig[] = [
      { name: "Alpha", slug: "alpha", aliases: ["Pro"], skuPrefixes: [] },
      { name: "Beta", slug: "beta", aliases: ["Pro"], skuPrefixes: [] },
    ];
    const res = resolveBrand(
      { id: "e8", sku: "X8", title: "Pro Gaming Mouse", categorySlug: "mouse" },
      tieBrands,
    );
    assert.deepEqual(res, { brand: "Alpha", brandSlug: "alpha" });
  });

  it("matches explicitAttributes key '  BRAND  ' with mixed casing and whitespace", () => {
    const res = resolveBrand(
      {
        id: "e9",
        sku: "X9",
        title: "Trident Z5",
        categorySlug: "ram",
        explicitAttributes: [{ key: "  BRAND  ", value: "gskill" }],
      },
      brands,
    );
    assert.deepEqual(res, { brand: "G.Skill", brandSlug: "gskill" });
  });

  it("falls back to Other when brandList is omitted", () => {
    const res = resolveBrand({
      id: "e10",
      sku: "X10",
      title: "Generic Cable",
      categorySlug: "accessories",
    });
    assert.deepEqual(res, { brand: "Other", brandSlug: "other" });
  });

  it("stops after raw brand even if unknown (does not fall through to title/SKU)", () => {
    const res = resolveBrand(
      {
        id: "e11",
        sku: "ASU-999",
        title: "ASUS Board",
        categorySlug: "motherboard",
        brandTaxonomy: "Biostar",
      },
      brands,
    );
    assert.deepEqual(res, { brand: "Biostar", brandSlug: "biostar" });
  });
});
