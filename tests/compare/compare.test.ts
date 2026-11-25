import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Product } from "../../lib/cms/types.ts";
import {
  COMPARE_STORAGE_KEY,
  MAX_COMPARE_ITEMS,
  addToCompareList,
  buildCompareRows,
  parseCompareStorage,
  removeFromCompareList,
  replaceCompareList,
  serializeCompareProduct,
  type CompareItem,
} from "../../lib/compare/compare.ts";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    sku: "GPU-RTX4070",
    name: "ASUS Dual GeForce RTX 4070 OC",
    slug: "asus-dual-rtx-4070-oc",
    categorySlug: "gpu",
    categoryName: "Graphics Card",
    componentType: "gpu",
    brand: "ASUS",
    brandSlug: "asus",
    price: 75000,
    availability: "in_stock",
    images: [{ url: "https://example.com/gpu1.jpg", alt: "RTX 4070" }],
    attributes: {
      lengthMm: { value: 267, source: "explicit", confidence: "high" },
      tdp: { value: 200, source: "explicit", confidence: "high" },
    },
    warranty: "3 Years",
    ...overrides,
  };
}

function makeCompareItem(overrides: Partial<CompareItem> = {}): CompareItem {
  return serializeCompareProduct(
    makeProduct({
      id: overrides.id ?? "prod-1",
      sku: overrides.sku ?? "SKU-1",
      name: overrides.name ?? "Product 1",
      slug: overrides.slug ?? "product-1",
      categorySlug: overrides.categorySlug ?? "gpu",
      categoryName: overrides.categoryName ?? "Graphics Card",
      brand: overrides.brand ?? "ASUS",
      brandSlug: overrides.brandSlug ?? "asus",
      price: overrides.price,
      salePrice: overrides.salePrice,
      availability: overrides.availability ?? "in_stock",
      warranty: overrides.warranty,
      attributes: overrides.attributes ?? {},
    })
  );
}

describe("Phase 5: Compare Pure Logic (lib/compare/compare.ts)", () => {
  it("exports expected constants", () => {
    assert.strictEqual(COMPARE_STORAGE_KEY, "pc_compare_items");
    assert.strictEqual(MAX_COMPARE_ITEMS, 4);
  });

  it("serializes a CMS Product into a compact CompareItem", () => {
    const product = makeProduct({ salePrice: 71500 });
    const item = serializeCompareProduct(product);

    assert.strictEqual(item.id, "prod-1");
    assert.strictEqual(item.sku, "GPU-RTX4070");
    assert.strictEqual(item.name, "ASUS Dual GeForce RTX 4070 OC");
    assert.strictEqual(item.slug, "asus-dual-rtx-4070-oc");
    assert.strictEqual(item.categorySlug, "gpu");
    assert.strictEqual(item.categoryName, "Graphics Card");
    assert.strictEqual(item.brand, "ASUS");
    assert.strictEqual(item.brandSlug, "asus");
    assert.strictEqual(item.price, 75000);
    assert.strictEqual(item.salePrice, 71500);
    assert.strictEqual(item.availability, "in_stock");
    assert.strictEqual(item.imageUrl, "https://example.com/gpu1.jpg");
    assert.strictEqual(item.imageAlt, "RTX 4070");
    assert.strictEqual(item.warranty, "3 Years");
    assert.strictEqual(item.attributes.lengthMm?.value, 267);
    assert.strictEqual(item.attributes.tdp?.value, 200);
  });

  it("handles products with no images when serializing", () => {
    const product = makeProduct({ images: [] });
    const item = serializeCompareProduct(product);
    assert.strictEqual(item.imageUrl, undefined);
    assert.strictEqual(item.imageAlt, product.name);
  });

  describe("addToCompareList", () => {
    it("adds up to 4 products in the same categorySlug without mutating input", () => {
      const initial: CompareItem[] = [];
      const item1 = makeCompareItem({ id: "1" });
      const res1 = addToCompareList(initial, item1);
      assert.strictEqual(res1.status, "added");
      assert.strictEqual(res1.nextList.length, 1);
      assert.strictEqual(initial.length, 0);

      const res2 = addToCompareList(res1.nextList, makeCompareItem({ id: "2" }));
      const res3 = addToCompareList(res2.nextList, makeCompareItem({ id: "3" }));
      const res4 = addToCompareList(res3.nextList, makeCompareItem({ id: "4" }));

      assert.strictEqual(res4.status, "added");
      assert.strictEqual(res4.nextList.length, 4);
    });

    it("prevents duplicate products by id", () => {
      const item1 = makeCompareItem({ id: "1" });
      const list = [item1];
      const res = addToCompareList(list, makeCompareItem({ id: "1" }));

      assert.strictEqual(res.status, "duplicate");
      assert.strictEqual(res.nextList, list);
      assert.strictEqual(res.nextList.length, 1);
    });

    it("enforces max 4 capacity", () => {
      const list = [
        makeCompareItem({ id: "1" }),
        makeCompareItem({ id: "2" }),
        makeCompareItem({ id: "3" }),
        makeCompareItem({ id: "4" }),
      ];
      const res = addToCompareList(list, makeCompareItem({ id: "5" }));

      assert.strictEqual(res.status, "full");
      assert.strictEqual(res.nextList, list);
      assert.strictEqual(res.nextList.length, 4);
    });

    it("enforces category lock and returns conflictCategory", () => {
      const list = [makeCompareItem({ id: "1", categorySlug: "gpu" })];
      const cpuItem = makeCompareItem({
        id: "2",
        categorySlug: "cpu",
        categoryName: "Processor",
      });
      const res = addToCompareList(list, cpuItem);

      assert.strictEqual(res.status, "category_mismatch");
      assert.strictEqual(res.conflictCategory, "gpu");
      assert.strictEqual(res.nextList, list);
    });
  });

  describe("replaceCompareList & removeFromCompareList", () => {
    it("replaceCompareList starts a fresh list with the new item", () => {
      const cpuItem = makeCompareItem({ id: "cpu-1", categorySlug: "cpu" });
      const next = replaceCompareList(cpuItem);
      assert.deepStrictEqual(next, [cpuItem]);
    });

    it("removeFromCompareList removes matching id without mutating input", () => {
      const a = makeCompareItem({ id: "a" });
      const b = makeCompareItem({ id: "b" });
      const list = [a, b];
      const next = removeFromCompareList(list, "a");

      assert.deepStrictEqual(next, [b]);
      assert.strictEqual(list.length, 2);
    });
  });

  describe("parseCompareStorage", () => {
    it("recovers gracefully from null, empty, corrupt JSON, or non-array payloads", () => {
      assert.deepStrictEqual(parseCompareStorage(null), []);
      assert.deepStrictEqual(parseCompareStorage(undefined), []);
      assert.deepStrictEqual(parseCompareStorage(""), []);
      assert.deepStrictEqual(parseCompareStorage("{corrupt json"), []);
      assert.deepStrictEqual(parseCompareStorage('{"id":"1"}'), []);
      assert.deepStrictEqual(parseCompareStorage("123"), []);
    });

    it("filters invalid entries, deduplicates, enforces category lock and max 4", () => {
      const valid1 = makeCompareItem({ id: "1", categorySlug: "gpu" });
      const valid2 = makeCompareItem({ id: "2", categorySlug: "gpu" });
      const mismatch = makeCompareItem({ id: "3", categorySlug: "cpu" });
      const valid4 = makeCompareItem({ id: "4", categorySlug: "gpu" });
      const valid5 = makeCompareItem({ id: "5", categorySlug: "gpu" });
      const valid6 = makeCompareItem({ id: "6", categorySlug: "gpu" });

      const payload = JSON.stringify([
        { bad: true },
        valid1,
        valid1, // duplicate
        mismatch, // wrong category
        valid2,
        valid4,
        valid5,
        valid6, // exceeds 4
      ]);

      const parsed = parseCompareStorage(payload);
      assert.strictEqual(parsed.length, 4);
      assert.deepStrictEqual(
        parsed.map((i) => i.id),
        ["1", "2", "4", "5"]
      );
    });
  });

  describe("buildCompareRows", () => {
    it("returns empty array for empty item list", () => {
      assert.deepStrictEqual(buildCompareRows([]), []);
    });

    it("builds base and normalized attribute rows, computes hasDifference, and omits empty rows", () => {
      const cpu1 = serializeCompareProduct(
        makeProduct({
          id: "cpu-1",
          sku: "CPU-7600",
          name: "AMD Ryzen 5 7600",
          categorySlug: "cpu",
          categoryName: "Processor",
          brand: "AMD",
          brandSlug: "amd",
          price: 24000,
          salePrice: 22500,
          availability: "in_stock",
          warranty: "3 Years",
          attributes: {
            socket: { value: "AM5", source: "explicit", confidence: "high" },
            ramType: { value: "DDR5", source: "explicit", confidence: "high" },
            tdp: { value: 65, source: "explicit", confidence: "high" },
          },
        })
      );

      const cpu2 = serializeCompareProduct(
        makeProduct({
          id: "cpu-2",
          sku: "CPU-7700X",
          name: "AMD Ryzen 7 7700X",
          categorySlug: "cpu",
          categoryName: "Processor",
          brand: "AMD",
          brandSlug: "amd",
          price: 35000,
          availability: "preorder",
          warranty: "3 Years",
          attributes: {
            socket: { value: "AM5", source: "explicit", confidence: "high" },
            ramType: { value: "DDR5", source: "explicit", confidence: "high" },
            tdp: { value: 105, source: "explicit", confidence: "high" },
          },
        })
      );

      const rows = buildCompareRows([cpu1, cpu2]);
      const byKey = new Map(rows.map((r) => [r.key, r]));

      // Price uses effective price (salePrice when lower than price)
      assert.deepStrictEqual(byKey.get("price")?.values, [
        "৳22,500",
        "৳35,000",
      ]);
      assert.strictEqual(byKey.get("price")?.hasDifference, true);

      // Availability
      assert.deepStrictEqual(byKey.get("availability")?.values, [
        "In Stock",
        "Pre-Order",
      ]);
      assert.strictEqual(byKey.get("availability")?.hasDifference, true);

      // Identical Brand & Warranty & Socket & RAM Type -> hasDifference: false
      assert.strictEqual(byKey.get("brand")?.hasDifference, false);
      assert.strictEqual(byKey.get("warranty")?.hasDifference, false);
      assert.strictEqual(byKey.get("socket")?.hasDifference, false);
      assert.strictEqual(byKey.get("ramType")?.hasDifference, false);

      // Different SKU & TDP -> hasDifference: true
      assert.strictEqual(byKey.get("sku")?.hasDifference, true);
      assert.deepStrictEqual(byKey.get("tdp")?.values, ["65 W", "105 W"]);
      assert.strictEqual(byKey.get("tdp")?.hasDifference, true);

      // Unpopulated attributes (formFactor, wattage, lengthMm, maxGpuLengthMm, coolerSockets, storageInterface, storageInterfaces) must be omitted
      assert.strictEqual(byKey.has("formFactor"), false);
      assert.strictEqual(byKey.has("wattage"), false);
      assert.strictEqual(byKey.has("lengthMm"), false);
      assert.strictEqual(byKey.has("maxGpuLengthMm"), false);
      assert.strictEqual(byKey.has("coolerSockets"), false);
      assert.strictEqual(byKey.has("storageInterface"), false);
      assert.strictEqual(byKey.has("storageInterfaces"), false);
    });

    it("formats Call for price, array attributes, and single-item hasDifference=false", () => {
      const cooler = serializeCompareProduct(
        makeProduct({
          id: "cool-1",
          sku: "COOL-AK400",
          name: "DeepCool AK400",
          categorySlug: "cooler",
          categoryName: "CPU Cooler",
          brand: "DeepCool",
          brandSlug: "deepcool",
          price: undefined,
          availability: "upcoming",
          warranty: undefined,
          attributes: {
            coolerSockets: {
              value: ["AM4", "AM5", "LGA1700"],
              source: "explicit",
              confidence: "high",
            },
          },
        })
      );

      const rows = buildCompareRows([cooler]);
      const byKey = new Map(rows.map((r) => [r.key, r]));

      assert.deepStrictEqual(byKey.get("price")?.values, ["Call for price"]);
      assert.strictEqual(byKey.get("price")?.hasDifference, false);
      assert.deepStrictEqual(byKey.get("availability")?.values, ["Upcoming"]);
      assert.deepStrictEqual(byKey.get("coolerSockets")?.values, [
        "AM4, AM5, LGA1700",
      ]);
      // Warranty is undefined -> omitted
      assert.strictEqual(byKey.has("warranty"), false);
    });
  });
});
