import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  catalogDataHealthReport,
  evaluateCategoryHealth,
} from "../../lib/logic/data-health.ts";
import type {
  CatalogDataHealthReportResult,
  CatalogProduct,
} from "../../lib/logic/types.ts";

interface SpecTestCase {
  id: string;
  label: string;
  input: { products: CatalogProduct[] };
  expectedOutput: Partial<CatalogDataHealthReportResult>;
}

interface SpecTestSuite {
  testCases: SpecTestCase[];
}

const suitePath = resolve(process.cwd(), "docs/LOGIC/tests/catalog-data-health.test.json");
const specSuite: SpecTestSuite = JSON.parse(readFileSync(suitePath, "utf-8")) as SpecTestSuite;

describe("catalogDataHealthReport — spec JSON suite (3 cases)", () => {
  it("loads all 3 spec test cases", () => {
    assert.equal(specSuite.testCases.length, 3);
  });

  for (const tc of specSuite.testCases) {
    it(tc.label, () => {
      const actual = catalogDataHealthReport(tc.input.products);
      assert.equal(actual.overallStatus, tc.expectedOutput.overallStatus);
      assert.equal(actual.otherBrandCount, tc.expectedOutput.otherBrandCount);
      assert.equal(actual.parsedProductCount, tc.expectedOutput.parsedProductCount);
    });
  }
});

describe("dataHealth — DEVIATION D6 (unrounded threshold boundaries)", () => {
  const makePsuProducts = (total: number, filled: number): CatalogProduct[] =>
    Array.from({ length: total }, (_, idx) => ({
      id: `psu-${idx}`,
      sku: `PSU-${idx}`,
      name: `PSU ${idx}`,
      brand: "Corsair",
      brandSlug: "corsair",
      categorySlug: "psu",
      availability: "in_stock",
      wattage:
        idx < filled
          ? { value: 750, source: "explicit", confidence: "high" }
          : undefined,
    }));

  it("59.9% rounds to 60% coveragePercent but status is red (unrounded < 60)", () => {
    const res = evaluateCategoryHealth("psu", makePsuProducts(1000, 599));
    assert.equal(res.health.coveragePercent, 60);
    assert.equal(res.health.status, "red");
  });

  it("60.0% gives 60% coveragePercent and status amber", () => {
    const res = evaluateCategoryHealth("psu", makePsuProducts(1000, 600));
    assert.equal(res.health.coveragePercent, 60);
    assert.equal(res.health.status, "amber");
  });

  it("89.6% rounds to 90% coveragePercent but status is amber (unrounded < 90)", () => {
    const res = evaluateCategoryHealth("psu", makePsuProducts(250, 224));
    assert.equal(res.health.coveragePercent, 90);
    assert.equal(res.health.status, "amber");
  });

  it("89.9% rounds to 90% coveragePercent but status is amber (unrounded < 90)", () => {
    const res = evaluateCategoryHealth("psu", makePsuProducts(1000, 899));
    assert.equal(res.health.coveragePercent, 90);
    assert.equal(res.health.status, "amber");
  });

  it("90.0% gives 90% coveragePercent and status green", () => {
    const res = evaluateCategoryHealth("psu", makePsuProducts(1000, 900));
    assert.equal(res.health.coveragePercent, 90);
    assert.equal(res.health.status, "green");
  });
});

describe("dataHealth — DEVIATION D7 (all-empty catalog -> no-data)", () => {
  it("returns overallStatus no-data when catalog is empty", () => {
    const report = catalogDataHealthReport([]);
    assert.equal(report.overallStatus, "no-data");
    assert.equal(report.otherBrandCount, 0);
    assert.equal(report.parsedProductCount, 0);
    assert.equal(report.categoryHealths.length, 7);
    assert.deepEqual(
      report.categoryHealths.map((c) => c.categorySlug),
      ["motherboard", "cpu", "gpu", "psu", "case", "cooler", "storage"],
    );
    for (const cat of report.categoryHealths) {
      assert.equal(cat.status, "no-data");
      assert.equal(cat.coveragePercent, 0);
      assert.equal(cat.productCount, 0);
    }
  });

  it("returns overallStatus no-data when catalog has only unaudited categories (e.g. monitor)", () => {
    const report = catalogDataHealthReport([
      {
        id: "mon1",
        sku: "MON-1",
        name: "Dell 27in",
        brand: "Dell",
        brandSlug: "dell",
        categorySlug: "monitor",
        availability: "in_stock",
      },
    ]);
    assert.equal(report.overallStatus, "no-data");
  });
});

describe("evaluateCategoryHealth — componentType mapping and zero-slot categories", () => {
  it("returns 100% green for categories with no required attributes (ram, monitor, keyboard, mouse, other)", () => {
    const slugs: Array<[string, string]> = [
      ["ram", "RAM"],
      ["monitor", "Monitor"],
      ["keyboard", "Keyboard"],
      ["mouse", "Mouse"],
      ["accessories", "Other"],
    ];
    for (const [slug, expectedType] of slugs) {
      const res = evaluateCategoryHealth(slug, [
        {
          id: "x1",
          sku: "X1",
          name: "Item",
          brand: "Brand",
          brandSlug: "brand",
          categorySlug: slug,
          availability: "in_stock",
        },
      ]);
      assert.equal(res.health.componentType, expectedType);
      assert.equal(res.health.coveragePercent, 100);
      assert.equal(res.health.status, "green");
      assert.deepEqual(res.health.attributeCoverages, []);
    }
  });

  it("counts parsedProductCount once per product even if multiple attributes are parsed", () => {
    const res = evaluateCategoryHealth("cpu", [
      {
        id: "c1",
        sku: "C1",
        name: "Ryzen 5",
        brand: "AMD",
        brandSlug: "amd",
        categorySlug: "cpu",
        availability: "in_stock",
        socket: { value: "AM5", source: "parsed", confidence: "medium" },
        tdp: { value: 65, source: "parsed", confidence: "medium" },
      },
    ]);
    assert.equal(res.parsedProductCount, 1);
    assert.equal(res.health.coveragePercent, 100);
    assert.equal(res.health.status, "green");
  });
});
