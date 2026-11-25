import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { queryProducts } from "../../lib/cms/query-engine.ts";
import type { Product } from "../../lib/cms/types.ts";
import {
  BUILDER_SLOTS,
  PC_BUILDER_STORAGE_KEY,
  PREFILTER_MIN_COVERAGE_PERCENT,
  createEmptyBuilderState,
  decodeShareState,
  encodeShareState,
  evaluateBuilderState,
  getChooseHref,
  getSlotQuantity,
  parseBuilderStorage,
  removeBuilderItem,
  setBuilderItem,
  setBuilderQuantity,
  setIgnoreCompatibility,
  toggleVerifiedRule,
  type BuilderSlotId,
  type PcBuilderState,
} from "../../lib/pc-builder/builder.ts";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    sku: "SKU-1",
    name: "Sample Component",
    slug: "sample-component",
    categorySlug: "processor",
    categoryName: "Processor",
    componentType: "cpu",
    brand: "AMD",
    brandSlug: "amd",
    price: 25000,
    availability: "in_stock",
    images: [{ url: "https://example.com/img.jpg", alt: "Sample" }],
    attributes: {},
    ...overrides,
  };
}

describe("Phase 6: PC Builder Pure Logic (lib/pc-builder/builder.ts)", () => {
  it("exports expected constants and all 12 BUILDER_SLOTS", () => {
    assert.strictEqual(PC_BUILDER_STORAGE_KEY, "pc_builder_state");
    assert.strictEqual(PREFILTER_MIN_COVERAGE_PERCENT, 60);
    assert.strictEqual(BUILDER_SLOTS.length, 12);

    const expectedMapping: Record<BuilderSlotId, string> = {
      cpu: "processor",
      cooler: "cpu-cooler",
      motherboard: "motherboard",
      ram: "ram",
      storage: "storage",
      gpu: "graphics-card",
      psu: "power-supply",
      case: "casing",
      monitor: "monitor",
      keyboard: "keyboard",
      mouse: "mouse",
      others: "accessories",
    };

    for (const [slotId, categorySlug] of Object.entries(expectedMapping)) {
      const def = BUILDER_SLOTS.find((s) => s.id === slotId);
      assert.ok(def, `Missing slot definition for ${slotId}`);
      assert.strictEqual(def.categorySlug, categorySlug);
      assert.ok(def.label.length > 0);
    }

    const ramSlot = BUILDER_SLOTS.find((s) => s.id === "ram");
    assert.strictEqual(ramSlot?.supportsQuantity, true);
    assert.strictEqual(ramSlot?.maxQuantity, 8);

    for (const qtySlotId of ["storage", "monitor", "others"] as const) {
      const slot = BUILDER_SLOTS.find((s) => s.id === qtySlotId);
      assert.strictEqual(slot?.supportsQuantity, true);
      assert.strictEqual(slot?.maxQuantity, 4);
    }

    const cpuSlot = BUILDER_SLOTS.find((s) => s.id === "cpu");
    assert.strictEqual(cpuSlot?.supportsQuantity, false);
    assert.strictEqual(cpuSlot?.required, true);
  });

  it("manages builder state immutably with quantity clamping", () => {
    let state = createEmptyBuilderState();
    assert.deepStrictEqual(state, {
      items: {},
      quantities: {},
      verifiedRules: [],
      ignoreCompatibility: false,
    });

    const ram = makeProduct({
      id: "ram-1",
      slug: "corsair-16gb-ddr5",
      componentType: "ram",
      categorySlug: "ram",
      price: 6000,
    });

    state = setBuilderItem(state, "ram", ram, 2);
    assert.strictEqual(getSlotQuantity(state, "ram"), 2);

    // Clamp above max (8)
    state = setBuilderQuantity(state, "ram", 20);
    assert.strictEqual(getSlotQuantity(state, "ram"), 8);

    // Clamp below min (1)
    state = setBuilderQuantity(state, "ram", 0);
    assert.strictEqual(getSlotQuantity(state, "ram"), 1);

    // Toggle verified rule
    state = toggleVerifiedRule(state, "cpu_mobo_socket");
    assert.deepStrictEqual(state.verifiedRules, ["cpu_mobo_socket"]);
    state = toggleVerifiedRule(state, "cpu_mobo_socket");
    assert.deepStrictEqual(state.verifiedRules, []);

    // Toggle ignoreCompatibility
    state = setIgnoreCompatibility(state, true);
    assert.strictEqual(state.ignoreCompatibility, true);

    // Remove item
    state = removeBuilderItem(state, "ram");
    assert.strictEqual(state.items.ram, undefined);
    assert.strictEqual(state.quantities.ram, undefined);
  });

  it("evaluates build pricing, wattage, exclusions, and compatibility", () => {
    const cpu = makeProduct({
      id: "cpu-1",
      slug: "ryzen-5-7600",
      componentType: "cpu",
      categorySlug: "processor",
      price: 22000,
      salePrice: 20500,
      attributes: {
        socket: { value: "AM5", source: "explicit", confidence: "high" },
        tdp: { value: 65, source: "explicit", confidence: "high" },
      },
    });
    const mobo = makeProduct({
      id: "mobo-1",
      slug: "b650m-pro",
      componentType: "motherboard",
      categorySlug: "motherboard",
      price: 18000,
      attributes: {
        socket: { value: "AM5", source: "explicit", confidence: "high" },
        ramType: { value: "DDR5", source: "explicit", confidence: "high" },
        formFactor: { value: "mATX", source: "explicit", confidence: "high" },
      },
    });
    const ram = makeProduct({
      id: "ram-1",
      slug: "ddr5-16gb",
      componentType: "ram",
      categorySlug: "ram",
      price: 6000,
      attributes: {
        ramType: { value: "DDR5", source: "explicit", confidence: "high" },
      },
    });
    const gpu = makeProduct({
      id: "gpu-1",
      slug: "rtx-4070",
      componentType: "gpu",
      categorySlug: "graphics-card",
      price: undefined, // Call for price -> excluded
      availability: "in_stock",
      attributes: {
        tdp: { value: 200, source: "explicit", confidence: "high" },
        lengthMm: { value: 267, source: "explicit", confidence: "high" },
      },
    });
    const storage = makeProduct({
      id: "ssd-1",
      slug: "nvme-1tb",
      componentType: "storage",
      categorySlug: "storage",
      price: 8000,
      availability: "out_of_stock", // Out of stock -> excluded
      attributes: {
        storageInterface: { value: "M.2 NVMe", source: "explicit", confidence: "high" },
      },
    });

    let state = createEmptyBuilderState();
    state = setBuilderItem(state, "cpu", cpu);
    state = setBuilderItem(state, "motherboard", mobo);
    state = setBuilderItem(state, "ram", ram, 2);
    state = setBuilderItem(state, "gpu", gpu);
    state = setBuilderItem(state, "storage", storage, 1);

    const result = evaluateBuilderState(state);

    // cpu (20500) + mobo (18000) + ram (6000 * 2 = 12000) = 50500
    assert.strictEqual(result.totalPrice, 50500);
    // itemCount includes excluded items: 1 + 1 + 2 + 1 + 1 = 6
    assert.strictEqual(result.itemCount, 6);
    assert.deepStrictEqual(result.excludedItemIds, ["gpu-1", "ssd-1"]);
    assert.strictEqual(result.errorCount, 0);

    // estimatedWattage = 65 + 200 + 75 + (2 + 1) * 5 = 355
    assert.strictEqual(result.estimatedWattage, 355);

    // Per-slot breakdown
    assert.strictEqual(result.slots.cpu?.unitPrice, 20500);
    assert.strictEqual(result.slots.cpu?.subtotal, 20500);
    assert.strictEqual(result.slots.cpu?.isExcluded, false);

    assert.strictEqual(result.slots.ram?.unitPrice, 6000);
    assert.strictEqual(result.slots.ram?.subtotal, 12000);
    assert.strictEqual(result.slots.ram?.isExcluded, false);

    assert.strictEqual(result.slots.gpu?.isExcluded, true);
    assert.strictEqual(result.slots.gpu?.unitPrice, undefined);
    assert.strictEqual(result.slots.gpu?.subtotal, undefined);

    assert.strictEqual(result.slots.storage?.isExcluded, true);
  });

  it("builds getChooseHref with pre-filter params only when coverage >= 60% and not ignored", () => {
    const moboSlot = BUILDER_SLOTS.find((s) => s.id === "motherboard")!;
    const ramSlot = BUILDER_SLOTS.find((s) => s.id === "ram")!;

    let state = createEmptyBuilderState();
    state = setBuilderItem(
      state,
      "cpu",
      makeProduct({
        id: "cpu-1",
        componentType: "cpu",
        attributes: {
          socket: { value: "AM5", source: "explicit", confidence: "high" },
        },
      })
    );
    state = setBuilderItem(
      state,
      "motherboard",
      makeProduct({
        id: "mobo-1",
        componentType: "motherboard",
        attributes: {
          socket: { value: "AM5", source: "explicit", confidence: "high" },
          ramType: { value: "DDR5", source: "explicit", confidence: "high" },
        },
      })
    );

    // Coverage >= 60 and ignoreCompatibility = false
    const moboHref = getChooseHref(moboSlot, state, 75);
    assert.strictEqual(
      moboHref,
      "/category/motherboard?builder=1&slot=motherboard&socket=AM5&prefilter=1"
    );

    const ramHref = getChooseHref(ramSlot, state, 60);
    assert.strictEqual(
      ramHref,
      "/category/ram?builder=1&slot=ram&ramType=DDR5&prefilter=1"
    );

    // Coverage < 60 -> no pre-filter params
    const lowCovHref = getChooseHref(moboSlot, state, 59);
    assert.strictEqual(
      lowCovHref,
      "/category/motherboard?builder=1&slot=motherboard"
    );

    // ignoreCompatibility = true -> no pre-filter params
    const ignoredState = setIgnoreCompatibility(state, true);
    const ignoredHref = getChooseHref(moboSlot, ignoredState, 90);
    assert.strictEqual(
      ignoredHref,
      "/category/motherboard?builder=1&slot=motherboard"
    );
  });

  it("encodes and decodes share state via URL-safe base64 JSON", () => {
    let state = createEmptyBuilderState();
    state = setBuilderItem(
      state,
      "cpu",
      makeProduct({ id: "cpu-1", slug: "ryzen-7-7800x3d", componentType: "cpu" })
    );
    state = setBuilderItem(
      state,
      "ram",
      makeProduct({ id: "ram-1", slug: "gskill-32gb-ddr5", componentType: "ram" }),
      2
    );
    state = toggleVerifiedRule(state, "gpu_case_length");
    state = setIgnoreCompatibility(state, true);

    const encoded = encodeShareState(state);
    assert.ok(encoded.length > 0);
    assert.ok(!encoded.includes("+") && !encoded.includes("/") && !encoded.includes("="));

    const decoded = decodeShareState(encoded);
    assert.ok(decoded !== null);
    assert.deepStrictEqual(decoded.slots, {
      cpu: { slug: "ryzen-7-7800x3d", quantity: 1 },
      ram: { slug: "gskill-32gb-ddr5", quantity: 2 },
    });
    assert.deepStrictEqual(decoded.verifiedRules, ["gpu_case_length"]);
    assert.strictEqual(decoded.ignoreCompatibility, true);

    assert.strictEqual(decodeShareState("!!!not-valid-base64!!!"), null);
    assert.strictEqual(decodeShareState(""), null);
  });

  it("recovers safely from corrupt JSON in parseBuilderStorage", () => {
    const empty = createEmptyBuilderState();
    assert.deepStrictEqual(parseBuilderStorage(null), empty);
    assert.deepStrictEqual(parseBuilderStorage(undefined), empty);
    assert.deepStrictEqual(parseBuilderStorage(""), empty);
    assert.deepStrictEqual(parseBuilderStorage("{corrupt json"), empty);
    assert.deepStrictEqual(parseBuilderStorage("[]"), empty);

    const validProduct = makeProduct({
      id: "cpu-1",
      slug: "intel-i5-14600k",
      name: "Intel Core i5-14600K",
    });
    const raw = JSON.stringify({
      items: {
        cpu: validProduct,
        unknownSlot: validProduct,
        ram: { bad: true },
      },
      quantities: {
        ram: 12, // clamped to 8
        cpu: 5, // cpu doesn't support quantity -> 1
      },
      verifiedRules: ["cpu_mobo_socket", 123],
      ignoreCompatibility: true,
    });

    const parsed: PcBuilderState = parseBuilderStorage(raw);
    assert.strictEqual(parsed.items.cpu?.id, "cpu-1");
    assert.strictEqual(parsed.items.ram, undefined);
    assert.strictEqual(parsed.quantities.ram, 8);
    assert.strictEqual(parsed.quantities.cpu, undefined);
    assert.deepStrictEqual(parsed.verifiedRules, ["cpu_mobo_socket"]);
    assert.strictEqual(parsed.ignoreCompatibility, true);
  });
});

describe("Phase 6: Query Engine Builder Slot Support (lib/cms/query-engine.ts)", () => {
  const catalog: Product[] = [
    makeProduct({
      id: "cpu-1",
      name: "AMD Ryzen 5 7600",
      categorySlug: "processor",
      componentType: "cpu",
    }),
    makeProduct({
      id: "psu-1",
      name: "Corsair RM750e",
      categorySlug: "power-supply",
      componentType: "psu",
    }),
    makeProduct({
      id: "other-1",
      name: "Thermal Grizzly Kryonaut",
      categorySlug: "accessories",
      componentType: "other",
    }),
    makeProduct({
      id: "kb-1",
      name: "Keychron K2",
      categorySlug: "keyboard",
      componentType: "keyboard",
    }),
  ];

  it("matches CPU via both /category/component?builder=1&slot=cpu and /category/processor?builder=1&slot=cpu", () => {
    const viaParent = queryProducts(catalog, {
      category: "component",
      builder: "1",
      slot: "cpu",
    });
    assert.strictEqual(viaParent.total, 1);
    assert.strictEqual(viaParent.products[0]?.id, "cpu-1");

    const viaDirect = queryProducts(catalog, {
      category: "processor",
      builder: "1",
      slot: "cpu",
    });
    assert.strictEqual(viaDirect.total, 1);
    assert.strictEqual(viaDirect.products[0]?.id, "cpu-1");
  });

  it("matches PSU via /category/power?builder=1&slot=psu", () => {
    const viaPower = queryProducts(catalog, {
      category: "power",
      builder: "1",
      slot: "psu",
    });
    assert.strictEqual(viaPower.total, 1);
    assert.strictEqual(viaPower.products[0]?.id, "psu-1");
  });

  it("maps slot === 'others' to componentType === 'other' under accessories", () => {
    const viaOthers = queryProducts(catalog, {
      category: "accessories",
      builder: "1",
      slot: "others",
    });
    assert.strictEqual(viaOthers.total, 1);
    assert.strictEqual(viaOthers.products[0]?.id, "other-1");
  });

  it("ignores stray slot parameter when builder !== '1'", () => {
    const withStraySlot = queryProducts(catalog, {
      category: "accessories",
      slot: "cpu",
    });
    assert.strictEqual(withStraySlot.total, 2);
  });
});
