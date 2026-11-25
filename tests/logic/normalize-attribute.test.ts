import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeAttribute } from "../../lib/logic/normalize-attribute.ts";
import type { NormalizeAttributeInput, NormalizeAttributeResult } from "../../lib/logic/types.ts";

interface SpecTestCase {
  id: string;
  label: string;
  input: NormalizeAttributeInput;
  expectedOutput: Partial<NormalizeAttributeResult>;
}

interface SpecTestSuite {
  testCases: SpecTestCase[];
}

const suitePath = resolve(process.cwd(), "docs/LOGIC/tests/normalize-attribute.test.json");
const specSuite: SpecTestSuite = JSON.parse(readFileSync(suitePath, "utf-8")) as SpecTestSuite;

describe("normalizeAttribute — spec JSON suite (23 cases)", () => {
  it("loads all 23 spec test cases", () => {
    assert.equal(specSuite.testCases.length, 23);
  });

  for (const tc of specSuite.testCases) {
    it(tc.label, () => {
      const actual = normalizeAttribute(tc.input);
      assert.equal(actual.matched, tc.expectedOutput.matched);
      assert.equal(actual.canonicalKey, tc.expectedOutput.canonicalKey);
      assert.deepEqual(actual.textResult, tc.expectedOutput.textResult);
      assert.deepEqual(actual.numberResult, tc.expectedOutput.numberResult);
      assert.deepEqual(actual.listResult, tc.expectedOutput.listResult);
    });
  }
});

describe("normalizeAttribute — DEVIATION D3 (list rejection & no scalar fallback)", () => {
  it("leaves rejectionReason empty when list has recognized items and unrecognized items are dropped", () => {
    const res = normalizeAttribute({
      rawName: "Supported Sockets",
      rawValue: "AM5, UnknownSocket, LGA 1700, AM5",
      componentType: "cooler",
    });
    assert.equal(res.matched, true);
    assert.equal(res.canonicalKey, "coolerSockets");
    assert.equal(res.rejectionReason, "");
    assert.equal(res.textResult, undefined);
    assert.deepEqual(res.listResult, {
      value: ["AM5", "LGA1700"],
      source: "explicit",
      confidence: "high",
    });
  });

  it("sets rejectionReason only when NO item in coolerSockets is recognized", () => {
    const res = normalizeAttribute({
      rawName: "Supported Sockets",
      rawValue: "Universal / All / Custom",
      componentType: "cooler",
    });
    assert.equal(res.matched, true);
    assert.equal(res.canonicalKey, "coolerSockets");
    assert.equal(res.listResult, undefined);
    assert.equal(res.textResult, undefined);
    assert.equal(res.rejectionReason, "No recognized values in list");
  });

  it("sets rejectionReason only when NO item in storageInterfaces is recognized", () => {
    const res = normalizeAttribute({
      rawName: "Storage Interfaces",
      rawValue: "IDE; SCSI | FireWire",
      componentType: "motherboard",
    });
    assert.equal(res.matched, true);
    assert.equal(res.canonicalKey, "storageInterfaces");
    assert.equal(res.listResult, undefined);
    assert.equal(res.textResult, undefined);
    assert.equal(res.rejectionReason, "No recognized values in list");
  });
});

describe("normalizeAttribute — DEVIATION D4 (spelled-out units & thousands separator)", () => {
  it("accepts millimeters", () => {
    const res = normalizeAttribute({
      rawName: "GPU Length",
      rawValue: "336 millimeters",
      componentType: "gpu",
    });
    assert.equal(res.numberResult?.value, 336);
  });

  it("accepts millimetres (UK spelling)", () => {
    const res = normalizeAttribute({
      rawName: "GPU Length",
      rawValue: "285 millimetres",
      componentType: "gpu",
    });
    assert.equal(res.numberResult?.value, 285);
  });

  it("accepts centimeters", () => {
    const res = normalizeAttribute({
      rawName: "GPU Length",
      rawValue: "31.5 centimeters",
      componentType: "gpu",
    });
    assert.equal(res.numberResult?.value, 315);
  });

  it("accepts centimetres (UK spelling)", () => {
    const res = normalizeAttribute({
      rawName: "Max GPU Length",
      rawValue: "40.2 centimetres",
      componentType: "case",
    });
    assert.equal(res.numberResult?.value, 402);
  });

  it("treats comma as thousands separator when 1,200W", () => {
    const res = normalizeAttribute({
      rawName: "Wattage",
      rawValue: "1,200W",
      componentType: "psu",
    });
    assert.equal(res.numberResult?.value, 1200);
  });

  it("does not merge 650,750W into 650750W (returns 650)", () => {
    const res = normalizeAttribute({
      rawName: "Wattage",
      rawValue: "650,750W",
      componentType: "psu",
    });
    assert.equal(res.numberResult?.value, 650);
  });

  it("does not treat comma with 2 trailing digits as thousands separator (1,20W -> 1)", () => {
    const res = normalizeAttribute({
      rawName: "Wattage",
      rawValue: "1,20W",
      componentType: "psu",
    });
    assert.equal(res.numberResult?.value, 1);
  });

  it("does not treat comma with 4 trailing digits as thousands separator (1,2000W -> 1)", () => {
    const res = normalizeAttribute({
      rawName: "Wattage",
      rawValue: "1,2000W",
      componentType: "psu",
    });
    assert.equal(res.numberResult?.value, 1);
  });
});

describe("normalizeAttribute — DEVIATION D8 (storage keyword fallback)", () => {
  it("normalizes NVMe PCIe Gen4 x4 via keyword fallback to M.2 NVMe", () => {
    const res = normalizeAttribute({
      rawName: "Storage Interface",
      rawValue: "NVMe PCIe Gen4 x4",
      componentType: "storage",
    });
    assert.equal(res.textResult?.value, "M.2 NVMe");
  });

  it("normalizes M.2 SATA 2280 via keyword fallback to M.2 SATA", () => {
    const res = normalizeAttribute({
      rawName: "Storage Interface",
      rawValue: "M.2 SATA 2280",
      componentType: "storage",
    });
    assert.equal(res.textResult?.value, "M.2 SATA");
  });

  it("normalizes SATA 6Gb/s 2.5 inch via keyword fallback to SATA III", () => {
    const res = normalizeAttribute({
      rawName: "Storage Interface",
      rawValue: "SATA 6Gb/s 2.5 inch",
      componentType: "storage",
    });
    assert.equal(res.textResult?.value, "SATA III");
  });

  it("normalizes SATA3 2.5\" via keyword fallback to SATA III", () => {
    const res = normalizeAttribute({
      rawName: "Storage Interface",
      rawValue: "SATA3 2.5\"",
      componentType: "storage",
    });
    assert.equal(res.textResult?.value, "SATA III");
  });

  it("normalizes SATA III 6Gbps via keyword fallback to SATA III", () => {
    const res = normalizeAttribute({
      rawName: "Storage Interface",
      rawValue: "SATA III 6Gbps",
      componentType: "storage",
    });
    assert.equal(res.textResult?.value, "SATA III");
  });

  it("applies D8 fallback inside storageInterfaces list items", () => {
    const res = normalizeAttribute({
      rawName: "Supported Interfaces",
      rawValue: "NVMe PCIe Gen5 x4 / M.2 SATA 2280; SATA 6Gb/s 2.5\" and U.2",
      componentType: "motherboard",
    });
    assert.deepEqual(res.listResult?.value, ["M.2 NVMe", "M.2 SATA", "SATA III"]);
    assert.equal(res.rejectionReason, "");
  });
});

describe("normalizeAttribute — messy cases (10+ per normalizer)", () => {
  it("handles 10 messy socket values", () => {
    const cases: Array<[string, string | undefined, string]> = [
      ["Socket AM4", "AM4", ""],
      ["socket-am3+", "AM3+", ""],
      ["LGA 1851", "LGA1851", ""],
      ["lga-1200", "LGA1200", ""],
      ["LGA 1151", "LGA1151", ""],
      ["LGA 2011-3", "LGA2011-3", ""],
      ["Socket sTR5", "sTR5", ""],
      ["sTRX4", "sTRX4", ""],
      ["STRX5", "sTRX5", ""],
      ["FM2+", "FM2+", ""],
      ["Universal Socket", undefined, "Unrecognized socket value"],
    ];
    for (const [rawValue, expectedVal, expectedReason] of cases) {
      const res = normalizeAttribute({ rawName: "Socket", rawValue });
      assert.equal(res.textResult?.value, expectedVal, `socket: ${rawValue}`);
      assert.equal(res.rejectionReason, expectedReason, `socket reason: ${rawValue}`);
    }
  });

  it("handles 10 messy ramType values", () => {
    const cases: Array<[string, string | undefined, string]> = [
      ["DDR5-6400 CL32", "DDR5", ""],
      ["DDR4 3200MHz", "DDR4", ""],
      ["DDR3L-1600", "DDR3", ""],
      ["LPDDR5X-7500", "LPDDR5X", ""],
      ["lpddr5 onboard", "LPDDR5", ""],
      ["LPDDR4X", "LPDDR4X", ""],
      ["lpddr4", "LPDDR4", ""],
      ["DDR4/DDR5", "DDR5", ""],
      ["24GB GDDR6X", undefined, "GDDR graphics memory is not system RAM"],
      ["GDDR7 16GB", undefined, "GDDR graphics memory is not system RAM"],
      ["HBM3", undefined, "Unrecognized RAM generation"],
    ];
    for (const [rawValue, expectedVal, expectedReason] of cases) {
      const res = normalizeAttribute({ rawName: "RAM Type", rawValue });
      assert.equal(res.textResult?.value, expectedVal, `ramType: ${rawValue}`);
      assert.equal(res.rejectionReason, expectedReason, `ramType reason: ${rawValue}`);
    }
  });

  it("handles 10 messy formFactor values", () => {
    const cases: Array<[string, string | undefined, string]> = [
      ["Extended ATX (305 x 330 mm)", "EATX", ""],
      ["e-atx", "EATX", ""],
      ["Standard ATX", "ATX", ""],
      ["ATX (12 x 9.6 in)", "ATX", ""],
      ["Micro-ATX", "mATX", ""],
      ["mATX (244 x 244 mm)", "mATX", ""],
      ["Mini-ITX", "Mini-ITX", ""],
      ["mITX", "Mini-ITX", ""],
      ["ITX", "Mini-ITX", ""],
      ["Mini DTX (203 x 170 mm)", "Mini-ITX", ""],
      ["SSI-CEB", undefined, "Unrecognized form factor"],
    ];
    for (const [rawValue, expectedVal, expectedReason] of cases) {
      const res = normalizeAttribute({ rawName: "Form Factor", rawValue });
      assert.equal(res.textResult?.value, expectedVal, `formFactor: ${rawValue}`);
      assert.equal(res.rejectionReason, expectedReason, `formFactor reason: ${rawValue}`);
    }
  });

  it("handles 10 messy wattage/tdp values and component-aware overrides", () => {
    const cases: Array<[NormalizeAttributeInput, string, number | undefined, string]> = [
      [{ rawName: "Wattage", rawValue: "850W", componentType: "psu" }, "wattage", 850, ""],
      [{ rawName: "Power", rawValue: "1000 Watts", componentType: "psu" }, "wattage", 1000, ""],
      [{ rawName: "Power Consumption", rawValue: "750W", componentType: "psu" }, "wattage", 750, ""],
      [{ rawName: "Power", rawValue: "125W", componentType: "cpu" }, "tdp", 125, ""],
      [{ rawName: "Power Consumption", rawValue: "285W", componentType: "gpu" }, "tdp", 285, ""],
      [{ rawName: "TDP", rawValue: "65.5W", componentType: "cpu" }, "tdp", 66, ""],
      [{ rawName: "Max Wattage", rawValue: "1.6 kW", componentType: "psu" }, "wattage", 1600, ""],
      [{ rawName: "Wattage", rawValue: "1,000W 80+ Gold", componentType: "psu" }, "wattage", 1000, ""],
      [{ rawName: "TDP", rawValue: "0W", componentType: "cpu" }, "tdp", undefined, "Power must be greater than 0"],
      [{ rawName: "TDP", rawValue: "N/A", componentType: "cpu" }, "tdp", undefined, "No numeric value found"],
      [{ rawName: "Wattage", rawValue: "  550  ", componentType: "psu" }, "wattage", 550, ""],
    ];
    for (const [input, expectedKey, expectedVal, expectedReason] of cases) {
      const res = normalizeAttribute(input);
      assert.equal(res.canonicalKey, expectedKey, `key: ${input.rawName}/${input.rawValue}`);
      assert.equal(res.numberResult?.value, expectedVal, `val: ${input.rawValue}`);
      assert.equal(res.rejectionReason, expectedReason, `reason: ${input.rawValue}`);
    }
  });

  it("handles 10 messy lengthMm/maxGpuLengthMm values", () => {
    const cases: Array<[NormalizeAttributeInput, string, number | undefined, string]> = [
      [{ rawName: "GPU Length", rawValue: "50 mm", componentType: "gpu" }, "lengthMm", 50, ""],
      [{ rawName: "GPU Length", rawValue: "600 mm", componentType: "gpu" }, "lengthMm", 600, ""],
      [{ rawName: "GPU Length", rawValue: "49 mm", componentType: "gpu" }, "lengthMm", undefined, "Dimension outside 50-600 mm range or missing unit"],
      [{ rawName: "GPU Length", rawValue: "601 mm", componentType: "gpu" }, "lengthMm", undefined, "Dimension outside 50-600 mm range or missing unit"],
      [{ rawName: "Card Length", rawValue: '12.6"', componentType: "gpu" }, "lengthMm", 320, ""],
      [{ rawName: "Card Length", rawValue: "11.8 inches", componentType: "gpu" }, "lengthMm", 300, ""],
      [{ rawName: "Card Length", rawValue: "10 inch", componentType: "gpu" }, "lengthMm", 254, ""],
      [{ rawName: "Length", rawValue: "355", componentType: "gpu" }, "lengthMm", 355, ""],
      [{ rawName: "Length", rawValue: "33.6", componentType: "gpu" }, "lengthMm", undefined, "Dimension outside 50-600 mm range or missing unit"],
      [{ rawName: "Max VGA Clearance", rawValue: "41.5 cm (16.3 in)", componentType: "case" }, "maxGpuLengthMm", 415, ""],
      [{ rawName: "GPU Length", rawValue: "TBD", componentType: "gpu" }, "lengthMm", undefined, "No numeric value found"],
    ];
    for (const [input, expectedKey, expectedVal, expectedReason] of cases) {
      const res = normalizeAttribute(input);
      assert.equal(res.canonicalKey, expectedKey, `key: ${input.rawName}/${input.rawValue}`);
      assert.equal(res.numberResult?.value, expectedVal, `val: ${input.rawValue}`);
      assert.equal(res.rejectionReason, expectedReason, `reason: ${input.rawValue}`);
    }
  });

  it("handles 10 messy storageInterface and list delimiter cases", () => {
    const cases: Array<[string, string | undefined, string]> = [
      ["M.2 NVMe", "M.2 NVMe", ""],
      ["M.2 PCIe", "M.2 NVMe", ""],
      ["PCIe 3.0 M.2 NVMe", "M.2 NVMe", ""],
      ["PCIe 5.0 M.2 NVMe", "M.2 NVMe", ""],
      ["NVMe", "M.2 NVMe", ""],
      ["M.2 SATA", "M.2 SATA", ""],
      ["SATA III", "SATA III", ""],
      ["SATA 3", "SATA III", ""],
      ["SATA 6Gb/s", "SATA III", ""],
      ["SATA", "SATA III", ""],
      ["Thunderbolt 4", undefined, "Unrecognized storage value"],
    ];
    for (const [rawValue, expectedVal, expectedReason] of cases) {
      const res = normalizeAttribute({ rawName: "Storage Interface", rawValue });
      assert.equal(res.textResult?.value, expectedVal, `storage: ${rawValue}`);
      assert.equal(res.rejectionReason, expectedReason, `storage reason: ${rawValue}`);
    }
  });
});
