import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkBuildCompatibility } from "../../lib/logic/check-build-compatibility.ts";
import { evaluatePcBuild } from "../../lib/logic/evaluate-pc-build.ts";
import type {
  CatalogProduct,
  EvaluatePcBuildInput,
  EvaluatePcBuildResult,
  FormFactor,
} from "../../lib/logic/types.ts";

interface SpecTestCase {
  id: string;
  label: string;
  input: EvaluatePcBuildInput;
  expectedOutput: Partial<EvaluatePcBuildResult>;
}

interface SpecTestSuite {
  testCases: SpecTestCase[];
}

const suitePath = resolve(
  process.cwd(),
  "docs/LOGIC/tests/pc-builder-compatibility-and-pricing.test.json",
);
const specSuite: SpecTestSuite = JSON.parse(readFileSync(suitePath, "utf-8")) as SpecTestSuite;

describe("evaluatePcBuild — spec JSON suite (17 cases)", () => {
  it("loads all 17 spec test cases", () => {
    assert.equal(specSuite.testCases.length, 17);
  });

  for (const tc of specSuite.testCases) {
    it(tc.label, () => {
      const actual = evaluatePcBuild(tc.input);
      const expected = tc.expectedOutput;

      if ("checks" in expected) assert.deepEqual(actual.checks, expected.checks);
      if ("errorCount" in expected) assert.equal(actual.errorCount, expected.errorCount);
      if ("warningCount" in expected) assert.equal(actual.warningCount, expected.warningCount);
      if ("unverifiedCount" in expected) {
        assert.equal(actual.unverifiedCount, expected.unverifiedCount);
      }
      if ("itemCount" in expected) assert.equal(actual.itemCount, expected.itemCount);
      if ("totalPrice" in expected) assert.equal(actual.totalPrice, expected.totalPrice);
      if ("excludedItemIds" in expected) {
        assert.deepEqual(actual.excludedItemIds, expected.excludedItemIds);
      }
    });
  }
});

describe("checkBuildCompatibility — full rule & boundary coverage", () => {
  const baseProd = (overrides: Partial<CatalogProduct>): CatalogProduct => ({
    id: "p1",
    sku: "SKU-1",
    name: "Test Part",
    brand: "Brand",
    brandSlug: "brand",
    categorySlug: "other",
    availability: "in_stock",
    ...overrides,
  });

  it("tests all 16 form factor fit combinations (EATX, ATX, mATX, Mini-ITX)", () => {
    const allFF: FormFactor[] = ["EATX", "ATX", "mATX", "Mini-ITX"];
    const expectedFits: Record<FormFactor, FormFactor[]> = {
      EATX: ["EATX", "ATX", "mATX", "Mini-ITX"],
      ATX: ["ATX", "mATX", "Mini-ITX"],
      mATX: ["mATX", "Mini-ITX"],
      "Mini-ITX": ["Mini-ITX"],
    };

    for (const caseFF of allFF) {
      for (const moboFF of allFF) {
        const res = checkBuildCompatibility({
          pcCase: baseProd({
            id: "cs",
            categorySlug: "case",
            formFactor: { value: caseFF, source: "explicit", confidence: "high" },
          }),
          motherboard: baseProd({
            id: "mb",
            categorySlug: "motherboard",
            formFactor: { value: moboFF, source: "explicit", confidence: "high" },
          }),
        });
        const shouldFit = expectedFits[caseFF].includes(moboFF);
        assert.equal(res.checks.length, 1);
        assert.equal(res.checks[0].status, shouldFit ? "ok" : "error", `${moboFF} in ${caseFF}`);
      }
    }
  });

  it("handles GPU clearance boundaries (-1 error, 0 warning, 10 warning, 11 ok)", () => {
    const testClearance = (gpuLen: number, caseMax: number) =>
      checkBuildCompatibility({
        gpu: baseProd({
          id: "g",
          categorySlug: "gpu",
          lengthMm: { value: gpuLen, source: "explicit", confidence: "high" },
        }),
        pcCase: baseProd({
          id: "c",
          categorySlug: "case",
          maxGpuLengthMm: { value: caseMax, source: "explicit", confidence: "high" },
        }),
      });

    const err = testClearance(321, 320);
    assert.equal(err.checks[0].status, "error");
    assert.equal(err.checks[0].message, "GPU length (321mm) exceeds case limit (320mm)");

    const warn0 = testClearance(320, 320);
    assert.equal(warn0.checks[0].status, "warning");
    assert.equal(warn0.checks[0].message, "Tight GPU clearance: 0mm remaining");

    const warn10 = testClearance(310, 320);
    assert.equal(warn10.checks[0].status, "warning");
    assert.equal(warn10.checks[0].message, "Tight GPU clearance: 10mm remaining");

    const ok11 = testClearance(309, 320);
    assert.equal(ok11.checks[0].status, "ok");
    assert.equal(ok11.checks[0].message, "GPU fits with 11mm clearance");
  });

  it("handles PSU wattage below estimated draw as error", () => {
    const res = checkBuildCompatibility({
      cpu: baseProd({
        id: "c",
        categorySlug: "cpu",
        tdp: { value: 100, source: "explicit", confidence: "high" },
      }),
      gpu: baseProd({
        id: "g",
        categorySlug: "gpu",
        tdp: { value: 200, source: "explicit", confidence: "high" },
      }),
      psu: baseProd({
        id: "p",
        categorySlug: "psu",
        wattage: { value: 374, source: "explicit", confidence: "high" },
      }),
    });
    // estimated = 100 + 200 + 75 + 0 = 375
    assert.equal(res.checks[0].status, "error");
    assert.equal(res.checks[0].message, "374W PSU is below estimated 375W draw");
    assert.equal(res.errorCount, 1);
  });

  it("handles cooler ok and parsed suffix", () => {
    const res = checkBuildCompatibility({
      cpu: baseProd({
        id: "c",
        categorySlug: "cpu",
        socket: { value: "AM5", source: "explicit", confidence: "high" },
      }),
      cooler: baseProd({
        id: "cl",
        categorySlug: "cooler",
        coolerSockets: { value: ["AM4", "AM5"], source: "parsed", confidence: "medium" },
      }),
    });
    assert.equal(res.checks[0].status, "ok");
    assert.equal(res.checks[0].confidence, "medium");
    assert.equal(res.checks[0].message, "Cooler supports AM5 socket (based on detected data)");
  });

  it("handles storage ok and unknown cases", () => {
    const mobo = baseProd({
      id: "m",
      categorySlug: "motherboard",
      storageInterfaces: { value: ["M.2 NVMe", "SATA III"], source: "explicit", confidence: "high" },
    });
    const okRes = checkBuildCompatibility({
      motherboard: mobo,
      storageItems: [
        {
          product: baseProd({
            id: "s1",
            categorySlug: "storage",
            storageInterface: { value: "M.2 NVMe", source: "explicit", confidence: "high" },
          }),
          quantity: 1,
        },
      ],
    });
    assert.equal(okRes.checks[0].status, "ok");
    assert.equal(okRes.checks[0].message, "All storage interfaces are supported by the motherboard");

    const unknownRes = checkBuildCompatibility({
      motherboard: mobo,
      storageItems: [
        {
          product: baseProd({
            id: "s2",
            categorySlug: "storage",
          }),
          quantity: 1,
        },
      ],
    });
    assert.equal(unknownRes.checks[0].status, "unknown");
    assert.equal(unknownRes.checks[0].confidence, "low");
    assert.equal(unknownRes.checks[0].message, "Missing motherboard or storage drive interface data");
    assert.equal(unknownRes.unverifiedCount, 1);
  });

  it("handles missing attributes for cpu_mobo_socket, ram_mobo_type, mobo_case_formfactor, gpu_case_length, psu_wattage", () => {
    const res = checkBuildCompatibility({
      cpu: baseProd({ id: "c", categorySlug: "cpu" }),
      motherboard: baseProd({ id: "m", categorySlug: "motherboard" }),
      ram: baseProd({ id: "r", categorySlug: "ram" }),
      gpu: baseProd({ id: "g", categorySlug: "gpu" }),
      psu: baseProd({ id: "p", categorySlug: "psu" }),
      pcCase: baseProd({ id: "cs", categorySlug: "case" }),
      cooler: baseProd({ id: "cl", categorySlug: "cooler" }),
      storageItems: [{ product: baseProd({ id: "s", categorySlug: "storage" }), quantity: 1 }],
    });
    assert.equal(res.checks.length, 7);
    assert.equal(res.unverifiedCount, 7);
    assert.deepEqual(
      res.checks.map((c) => c.ruleId),
      [
        "cpu_mobo_socket",
        "ram_mobo_type",
        "mobo_case_formfactor",
        "gpu_case_length",
        "psu_wattage",
        "cooler_cpu_socket",
        "storage_interface",
      ],
    );
  });
});

describe("evaluatePcBuild — pricing edge cases", () => {
  const baseProd = (overrides: Partial<CatalogProduct>): CatalogProduct => ({
    id: "p1",
    sku: "SKU-1",
    name: "Test Part",
    brand: "Brand",
    brandSlug: "brand",
    categorySlug: "other",
    availability: "in_stock",
    ...overrides,
  });

  it("excludes out_of_stock and absent price items from totalPrice while keeping them in itemCount", () => {
    const res = evaluatePcBuild({
      cpu: baseProd({ id: "cpu-oos", price: 300, availability: "out_of_stock" }),
      gpu: baseProd({ id: "gpu-call", availability: "in_stock" }),
      psu: baseProd({ id: "psu-pre", price: 120, availability: "preorder" }),
      pcCase: baseProd({ id: "case-up", price: 100, salePrice: 90, availability: "upcoming" }),
      ram: baseProd({ id: "ram-4", price: 50, salePrice: 60, availability: "in_stock" }),
      ramQuantity: 4,
    });
    assert.deepEqual(res.excludedItemIds, ["cpu-oos", "gpu-call"]);
    // itemCount: 1 + 1 + 1 + 1 + 4 = 8
    assert.equal(res.itemCount, 8);
    // totalPrice: 120 (preorder) + 90 (upcoming sale) + 50*4 (salePrice > price ignored) = 410
    assert.equal(res.totalPrice, 410);
  });
});
