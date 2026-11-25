import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractAttributes } from "../../lib/logic/extract-attributes.ts";
import type { ExtractAttributesResult, RawCmsProduct } from "../../lib/logic/types.ts";

interface SpecTestCase {
  id: string;
  label: string;
  input: { product: RawCmsProduct };
  expectedOutput: Partial<ExtractAttributesResult>;
}

interface SpecTestSuite {
  testCases: SpecTestCase[];
}

const suitePath = resolve(process.cwd(), "docs/LOGIC/tests/extract-attributes.test.json");
const specSuite: SpecTestSuite = JSON.parse(readFileSync(suitePath, "utf-8")) as SpecTestSuite;

describe("extractAttributes — spec JSON suite (14 cases)", () => {
  it("loads all 14 spec test cases", () => {
    assert.equal(specSuite.testCases.length, 14);
  });

  for (const tc of specSuite.testCases) {
    it(tc.label, () => {
      const actual = extractAttributes(tc.input.product);
      const expected = tc.expectedOutput;

      if ("socket" in expected) assert.deepEqual(actual.socket, expected.socket);
      if ("ramType" in expected) assert.deepEqual(actual.ramType, expected.ramType);
      if ("formFactor" in expected) assert.deepEqual(actual.formFactor, expected.formFactor);
      if ("storageInterface" in expected) {
        assert.deepEqual(actual.storageInterface, expected.storageInterface);
      }
      if ("wattage" in expected) assert.deepEqual(actual.wattage, expected.wattage);
      if ("tdp" in expected) assert.deepEqual(actual.tdp, expected.tdp);
      if ("lengthMm" in expected) assert.deepEqual(actual.lengthMm, expected.lengthMm);
      if ("maxGpuLengthMm" in expected) {
        assert.deepEqual(actual.maxGpuLengthMm, expected.maxGpuLengthMm);
      }
      if ("coolerSockets" in expected) {
        assert.deepEqual(actual.coolerSockets, expected.coolerSockets);
      }
      if ("storageInterfaces" in expected) {
        assert.deepEqual(actual.storageInterfaces, expected.storageInterfaces);
      }
      if ("unmappedAttributes" in expected) {
        assert.deepEqual(actual.unmappedAttributes, expected.unmappedAttributes);
      }
      if ("unrecognizedValues" in expected) {
        assert.deepEqual(actual.unrecognizedValues, expected.unrecognizedValues);
      }

      // For p14 specifically, ensure no attributes leaked from GPU title
      if (tc.input.product.id === "p14") {
        assert.equal(actual.socket, undefined);
        assert.equal(actual.ramType, undefined);
        assert.equal(actual.formFactor, undefined);
        assert.equal(actual.wattage, undefined);
        assert.equal(actual.storageInterface, undefined);
      }
    });
  }
});

describe("extractAttributes — DEVIATION D1 (hyphen & dot word boundaries)", () => {
  it("extracts DDR5 from DDR5-6000 in RAM title", () => {
    const res = extractAttributes({
      id: "d1-ram",
      sku: "R1",
      title: "Corsair Vengeance DDR5-6000 32GB Kit",
      categorySlug: "ram",
      componentType: "ram",
    });
    assert.deepEqual(res.ramType, {
      value: "DDR5",
      source: "parsed",
      confidence: "medium",
    });
  });

  it("extracts 850W from 850W-Gold in PSU title", () => {
    const res = extractAttributes({
      id: "d1-psu",
      sku: "P1",
      title: "Seasonic Focus 850W-Gold Modular",
      categorySlug: "psu",
      componentType: "psu",
    });
    assert.deepEqual(res.wattage, {
      value: 850,
      source: "parsed",
      confidence: "medium",
    });
  });

  it("extracts AM5 from AM5. in CPU title", () => {
    const res = extractAttributes({
      id: "d1-cpu",
      sku: "C1",
      title: "AMD Ryzen 9 7950X AM5.",
      categorySlug: "cpu",
      componentType: "cpu",
    });
    assert.deepEqual(res.socket, {
      value: "AM5",
      source: "parsed",
      confidence: "medium",
    });
  });

  it("preserves M.2 and decimal numbers inside storage title", () => {
    const res = extractAttributes({
      id: "d1-ssd",
      sku: "S1",
      title: "WD Black SN850X PCIe 4.0 M.2 PCIe SSD",
      categorySlug: "storage",
      componentType: "storage",
    });
    assert.deepEqual(res.storageInterface, {
      value: "M.2 NVMe",
      source: "parsed",
      confidence: "medium",
    });
  });

  it("preserves e-atx, micro-atx, mini-itx, mini-dtx with adjacent hyphens or dots", () => {
    const eatx = extractAttributes({
      id: "d1-eatx",
      sku: "M1",
      title: "ASUS ROG E-ATX. Motherboard",
      categorySlug: "motherboard",
    });
    assert.equal(eatx.formFactor?.value, "EATX");

    const minidtx = extractAttributes({
      id: "d1-dtx",
      sku: "M2",
      title: "ASUS ROG Crosshair Mini-DTX-Board",
      categorySlug: "motherboard",
    });
    assert.equal(minidtx.formFactor?.value, "Mini-ITX");
  });
});

describe("extractAttributes — DEVIATION D2 (case largest vs motherboard first form factor)", () => {
  it("picks LARGEST form factor for case title (ATX Mid Tower Case supports mATX/ITX -> ATX)", () => {
    const res = extractAttributes({
      id: "d2-case-1",
      sku: "CS1",
      title: "ATX Mid Tower Case supports mATX/ITX",
      categorySlug: "case",
      componentType: "case",
    });
    assert.deepEqual(res.formFactor, {
      value: "ATX",
      source: "parsed",
      confidence: "medium",
    });
  });

  it("picks EATX over ATX/mATX even when EATX is mentioned last in a case title", () => {
    const res = extractAttributes({
      id: "d2-case-2",
      sku: "CS2",
      title: "Full Tower Case supports Mini-ITX / mATX / ATX / E-ATX",
      categorySlug: "case",
      componentType: "case",
    });
    assert.equal(res.formFactor?.value, "EATX");
  });

  it("does not misread Micro ATX as ATX in a case title", () => {
    const res = extractAttributes({
      id: "d2-case-3",
      sku: "CS3",
      title: "Compact Micro ATX Case with Mesh Front",
      categorySlug: "case",
      componentType: "case",
    });
    assert.equal(res.formFactor?.value, "mATX");
  });

  it("picks FIRST mentioned form factor for motherboard title", () => {
    const res = extractAttributes({
      id: "d2-mb-1",
      sku: "MB1",
      title: "MSI B650M Micro-ATX Motherboard with ATX 24-pin Header",
      categorySlug: "motherboard",
      componentType: "motherboard",
    });
    assert.equal(res.formFactor?.value, "mATX");
  });
});

describe("extractAttributes — DEVIATION D5 (no scalar socket from cooler title)", () => {
  it("does not set scalar socket from cooler title mentioning AM5 and LGA1700", () => {
    const res = extractAttributes({
      id: "d5-cooler",
      sku: "CL1",
      title: "Noctua NH-D15 AM5 LGA1700 Dual Tower CPU Cooler",
      categorySlug: "cooler",
      componentType: "cooler",
    });
    assert.equal(res.socket, undefined);
    assert.equal(res.coolerSockets, undefined);
  });
});

describe("extractAttributes — 10+ messy extraction & regex cases", () => {
  it("extracts LGA1851 from CPU title", () => {
    const res = extractAttributes({
      id: "m1",
      sku: "M1",
      title: "Intel Core Ultra 7 265K LGA 1851 Processor",
      categorySlug: "cpu",
    });
    assert.equal(res.socket?.value, "LGA1851");
  });

  it("extracts LGA1200 from CPU title", () => {
    const res = extractAttributes({
      id: "m2",
      sku: "M2",
      title: "Intel Core i5-11400F LGA1200 CPU",
      categorySlug: "cpu",
    });
    assert.equal(res.socket?.value, "LGA1200");
  });

  it("extracts M.2 SATA from storage title", () => {
    const res = extractAttributes({
      id: "m3",
      sku: "M3",
      title: "WD Blue 1TB M.2 SATA 2280 SSD",
      categorySlug: "storage",
    });
    assert.equal(res.storageInterface?.value, "M.2 SATA");
  });

  it("extracts SATA III from storage title with SATA 3", () => {
    const res = extractAttributes({
      id: "m4",
      sku: "M4",
      title: "Crucial MX500 1TB 2.5-inch SATA 3 SSD",
      categorySlug: "storage",
    });
    assert.equal(res.storageInterface?.value, "SATA III");
  });

  it("extracts m-ATX from motherboard title without matching ATX", () => {
    const res = extractAttributes({
      id: "m5",
      sku: "M5",
      title: "Gigabyte B760M m-ATX DDR4 Board",
      categorySlug: "motherboard",
    });
    assert.equal(res.formFactor?.value, "mATX");
    assert.equal(res.ramType?.value, "DDR4");
  });

  it("ignores PSU title wattage with fewer than 3 digits (e.g. 75W)", () => {
    const res = extractAttributes({
      id: "m6",
      sku: "M6",
      title: "Mini Adapter 75W Power Brick",
      categorySlug: "psu",
    });
    assert.equal(res.wattage, undefined);
  });

  it("extracts 4-digit PSU wattage (1200W) from title", () => {
    const res = extractAttributes({
      id: "m7",
      sku: "M7",
      title: "ASUS ROG Thor 1200W Platinum II PSU",
      categorySlug: "psu",
    });
    assert.equal(res.wattage?.value, 1200);
  });

  it("suppresses ramType extraction if motherboard title contains gddr", () => {
    const res = extractAttributes({
      id: "m8",
      sku: "M8",
      title: "Board DDR5 GDDR6 Combo",
      categorySlug: "motherboard",
    });
    assert.equal(res.ramType, undefined);
  });

  it("extracts DDR3 from legacy RAM title", () => {
    const res = extractAttributes({
      id: "m9",
      sku: "M9",
      title: "Kingston ValueRAM 8GB DDR3-1600",
      categorySlug: "ram",
    });
    assert.equal(res.ramType?.value, "DDR3");
  });

  it("never produces tdp, lengthMm, maxGpuLengthMm, coolerSockets, or storageInterfaces from title alone", () => {
    const res = extractAttributes({
      id: "m10",
      sku: "M10",
      title: "RTX 4090 450W 336mm AM5 NVMe SATA",
      categorySlug: "gpu",
    });
    assert.equal(res.tdp, undefined);
    assert.equal(res.lengthMm, undefined);
    assert.equal(res.maxGpuLengthMm, undefined);
    assert.equal(res.coolerSockets, undefined);
    assert.equal(res.storageInterfaces, undefined);
  });

  it("records unrecognized values from descriptionSpecs while still allowing title fallback", () => {
    const res = extractAttributes({
      id: "m11",
      sku: "M11",
      title: "Ryzen 7 7700X AM5",
      categorySlug: "cpu",
      descriptionSpecs: [{ key: "CPU Socket", value: "FutureSocket" }],
    });
    assert.deepEqual(res.unrecognizedValues, [
      {
        attributeName: "CPU Socket",
        rawValue: "FutureSocket",
        reason: "Unrecognized socket value",
      },
    ]);
    assert.deepEqual(res.socket, {
      value: "AM5",
      source: "parsed",
      confidence: "medium",
    });
  });
});
