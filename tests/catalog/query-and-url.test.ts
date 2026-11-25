import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MockCmsAdapter,
  buildCategoriesWithCounts,
  getCategoryBrands,
  matchesCategorySlug,
} from "../../lib/cms/index.ts";
import { queryProducts } from "../../lib/cms/query-engine.ts";
import type { Product } from "../../lib/cms/types.ts";
import {
  ALLOWED_LIMITS,
  DEFAULT_LIMIT,
  buildCatalogUrl,
  hasNonCanonicalFilterParams,
  parseCatalogSearchParams,
} from "../../lib/catalog/url-params.ts";

describe("Phase 4: Catalog Query Engine & URL Params", () => {
  describe("url-params.ts", () => {
    it("exposes ALLOWED_LIMITS and DEFAULT_LIMIT", () => {
      assert.deepStrictEqual(ALLOWED_LIMITS, [12, 24, 48, 96]);
      assert.strictEqual(DEFAULT_LIMIT, 24);
    });

    it("parses empty params with clean defaults and baseOverrides", () => {
      const parsed = parseCatalogSearchParams({}, { category: "motherboard" });
      assert.strictEqual(parsed.category, "motherboard");
      assert.strictEqual(parsed.page, 1);
      assert.strictEqual(parsed.limit, 24);
      assert.strictEqual(parsed.q, undefined);
      assert.strictEqual(parsed.brands, undefined);
      assert.strictEqual(parsed.sort, undefined);
    });

    it("parses price=min-max and minPrice/maxPrice, comma-separated and repeated arrays", () => {
      const parsed = parseCatalogSearchParams(
        {
          price: "10000-50000",
          brand: ["asus,msi", "gigabyte"],
          availability: "in-stock",
          socket: "AM5,LGA1700",
          ramType: "DDR5",
          formFactor: "ATX,mATX",
          storageInterface: "M.2 NVMe,SATA III",
          q: "  b650 wifi  ",
          sort: "price-asc",
          page: "3",
          limit: "48",
          builder: "1",
          slot: "motherboard",
        },
        { category: "motherboard" }
      );

      assert.strictEqual(parsed.category, "motherboard");
      assert.strictEqual(parsed.minPrice, 10000);
      assert.strictEqual(parsed.maxPrice, 50000);
      assert.deepStrictEqual(parsed.brands, ["asus", "msi", "gigabyte"]);
      assert.strictEqual(parsed.availability, "in-stock");
      assert.deepStrictEqual(parsed.sockets, ["AM5", "LGA1700"]);
      assert.deepStrictEqual(parsed.ramTypes, ["DDR5"]);
      assert.deepStrictEqual(parsed.formFactors, ["ATX", "mATX"]);
      assert.deepStrictEqual(parsed.storageInterfaces, ["M.2 NVMe", "SATA III"]);
      assert.strictEqual(parsed.q, "b650 wifi");
      assert.strictEqual(parsed.sort, "price-asc");
      assert.strictEqual(parsed.page, 3);
      assert.strictEqual(parsed.limit, 48);
      assert.strictEqual(parsed.builder, "1");
      assert.strictEqual(parsed.slot, "motherboard");
    });

    it("supports open-ended price ranges, swapped inverted bounds, and invalid page/limit clamping", () => {
      const openMin = parseCatalogSearchParams({ price: "15000-" });
      assert.strictEqual(openMin.minPrice, 15000);
      assert.strictEqual(openMin.maxPrice, undefined);

      const inverted = parseCatalogSearchParams({
        minPrice: "50000",
        maxPrice: "10000",
        page: "-4",
        limit: "200",
        sort: "invalid-sort",
        availability: "bogus",
      });
      assert.strictEqual(inverted.minPrice, 10000);
      assert.strictEqual(inverted.maxPrice, 50000);
      assert.strictEqual(inverted.page, 1);
      assert.strictEqual(inverted.limit, 96);
      assert.strictEqual(inverted.sort, undefined);
      assert.strictEqual(inverted.availability, undefined);

      const smallLimit = parseCatalogSearchParams({ limit: "5" });
      assert.strictEqual(smallLimit.limit, 12);
    });

    it("accepts URLSearchParams input as well as Next.js Record input", () => {
      const usp = new URLSearchParams("brand=asus&brand=msi&page=2&limit=12&sort=name-asc");
      const parsed = parseCatalogSearchParams(usp, { category: "gpu" });
      assert.strictEqual(parsed.category, "gpu");
      assert.deepStrictEqual(parsed.brands, ["asus", "msi"]);
      assert.strictEqual(parsed.page, 2);
      assert.strictEqual(parsed.limit, 12);
      assert.strictEqual(parsed.sort, "name-asc");
    });

    it("buildCatalogUrl serializes non-default params deterministically and omits defaults", () => {
      const cleanUrl = buildCatalogUrl("/category/motherboard", {
        category: "motherboard",
        page: 1,
        limit: 24,
        availability: "all",
      });
      assert.strictEqual(cleanUrl, "/category/motherboard");

      const fullUrl = buildCatalogUrl("/category/motherboard", {
        category: "motherboard",
        q: "ryzen",
        minPrice: 10000,
        maxPrice: 50000,
        brands: ["msi", "asus"],
        sockets: ["AM5"],
        ramTypes: ["DDR5"],
        formFactors: ["ATX"],
        storageInterfaces: ["M.2 NVMe"],
        availability: "in-stock",
        sort: "price-asc",
        page: 2,
        limit: 48,
        builder: "1",
        slot: "motherboard",
      });

      const roundTripped = parseCatalogSearchParams(
        new URL(fullUrl, "http://localhost").searchParams,
        { category: "motherboard" }
      );
      assert.strictEqual(roundTripped.q, "ryzen");
      assert.strictEqual(roundTripped.minPrice, 10000);
      assert.strictEqual(roundTripped.maxPrice, 50000);
      assert.deepStrictEqual(roundTripped.brands, ["asus", "msi"]);
      assert.deepStrictEqual(roundTripped.sockets, ["AM5"]);
      assert.deepStrictEqual(roundTripped.ramTypes, ["DDR5"]);
      assert.deepStrictEqual(roundTripped.formFactors, ["ATX"]);
      assert.deepStrictEqual(roundTripped.storageInterfaces, ["M.2 NVMe"]);
      assert.strictEqual(roundTripped.availability, "in-stock");
      assert.strictEqual(roundTripped.sort, "price-asc");
      assert.strictEqual(roundTripped.page, 2);
      assert.strictEqual(roundTripped.limit, 48);
      assert.strictEqual(roundTripped.builder, "1");
      assert.strictEqual(roundTripped.slot, "motherboard");
    });

    it("hasNonCanonicalFilterParams detects filter, sort, page, limit, and q params", () => {
      assert.strictEqual(hasNonCanonicalFilterParams({}), false);
      assert.strictEqual(hasNonCanonicalFilterParams({ q: "   " }), false);
      assert.strictEqual(
        hasNonCanonicalFilterParams({ builder: "1", slot: "cpu", prefilter: "1" }),
        false
      );

      assert.strictEqual(hasNonCanonicalFilterParams({ price: "1000-5000" }), true);
      assert.strictEqual(hasNonCanonicalFilterParams({ brand: "asus" }), true);
      assert.strictEqual(hasNonCanonicalFilterParams({ sort: "price-asc" }), true);
      assert.strictEqual(hasNonCanonicalFilterParams({ page: "2" }), true);
      assert.strictEqual(hasNonCanonicalFilterParams({ limit: "48" }), true);
      assert.strictEqual(hasNonCanonicalFilterParams({ q: "rtx" }), true);
      assert.strictEqual(hasNonCanonicalFilterParams({ socket: "AM5" }), true);
      assert.strictEqual(hasNonCanonicalFilterParams({ availability: "in-stock" }), true);
    });
  });

  describe("query-engine.ts extensions", () => {
    it("filters by q across name, sku, brand, and shortDescription", async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });
      const all = await adapter.getAllProducts();

      const res = queryProducts(all, {
        category: "all",
        q: "ryzen 5",
      });

      assert.ok(res.total >= 1);
      assert.ok(res.products.every((p) => p.name.toLowerCase().includes("ryzen")));
    });

    it("filters by sockets, ramTypes, formFactors, and storageInterfaces", async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });
      const all = await adapter.getAllProducts();

      const am5Mobos = queryProducts(all, {
        category: "motherboard",
        sockets: ["AM5"],
        ramTypes: ["DDR5"],
        formFactors: ["mATX"],
      });

      assert.ok(am5Mobos.total >= 1);
      for (const p of am5Mobos.products) {
        assert.strictEqual(p.attributes.socket?.value, "AM5");
        assert.strictEqual(p.attributes.ramType?.value, "DDR5");
        assert.strictEqual(p.attributes.formFactor?.value, "mATX");
      }

      const nvmeItems = queryProducts(all, {
        category: "all",
        storageInterfaces: ["M.2 NVMe"],
      });
      assert.ok(nvmeItems.total >= 2);
      for (const p of nvmeItems.products) {
        const single = p.attributes.storageInterface?.value;
        const multi = p.attributes.storageInterfaces?.value ?? [];
        assert.ok(single === "M.2 NVMe" || multi.includes("M.2 NVMe"));
      }
    });

    it("suppresses facet options with count === 0 and empty facet groups", () => {
      const outOfStockOnly: Product[] = [
        {
          id: "oos-1",
          sku: "OOS-1",
          name: "Out of Stock CPU",
          slug: "oos-cpu",
          categorySlug: "processor",
          categoryName: "Processor",
          componentType: "cpu",
          brand: "AMD",
          brandSlug: "amd",
          price: 20000,
          availability: "out_of_stock",
          images: [],
          attributes: {},
        },
      ];

      const res = queryProducts(outOfStockOnly, { category: "processor" });
      const availabilityFacet = res.facets.find((f) => f.key === "availability");
      assert.ok(availabilityFacet);
      assert.strictEqual(
        availabilityFacet.values.some((v) => v.count === 0),
        false,
        "Zero-count availability options must be suppressed"
      );

      const emptyRes = queryProducts([], { category: "networking" });
      assert.deepStrictEqual(emptyRes.facets, []);
    });

    it("supports parent-category search and matching without builder mode (component, power, accessories, gaming, server-storage, subCategorySlugs)", async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });
      const all = await adapter.getAllProducts();

      // Parent-category search: component + q="ryzen"
      const ryzenInComponent = queryProducts(all, {
        category: "component",
        q: "ryzen",
      });
      assert.ok(ryzenInComponent.total >= 3, "Expected Ryzen CPUs under component parent category");
      assert.ok(
        ryzenInComponent.products.every(
          (p) => p.componentType === "cpu" && p.name.toLowerCase().includes("ryzen")
        )
      );

      // All parent/group categories active even when builder !== "1"
      const componentRes = queryProducts(all, { category: "component", limit: 96 });
      const componentTypes = new Set(componentRes.products.map((p) => p.componentType));
      for (const expectedType of ["cpu", "motherboard", "ram", "gpu", "storage", "psu", "case", "cooler"]) {
        assert.ok(componentTypes.has(expectedType as Product["componentType"]), `Expected ${expectedType} in component`);
      }
      assert.ok(!componentTypes.has("monitor"));
      assert.ok(!componentTypes.has("keyboard"));
      assert.ok(!componentTypes.has("mouse"));

      const powerRes = queryProducts(all, { category: "power", limit: 96 });
      assert.ok(powerRes.total >= 3);
      assert.ok(powerRes.products.every((p) => p.componentType === "psu"));

      const accessoriesRes = queryProducts(all, { category: "accessories", limit: 96 });
      assert.ok(accessoriesRes.total >= 2);
      assert.ok(
        accessoriesRes.products.every((p) =>
          ["keyboard", "mouse", "other"].includes(p.componentType)
        )
      );

      const gamingRes = queryProducts(all, { category: "gaming", limit: 96 });
      assert.ok(gamingRes.total >= 8);
      assert.ok(
        gamingRes.products.every(
          (p) =>
            Boolean(p.isFlashDeal) ||
            ["gpu", "monitor", "keyboard", "mouse"].includes(p.componentType)
        )
      );

      const serverStorageRes = queryProducts(all, { category: "server-storage", limit: 96 });
      assert.ok(serverStorageRes.total >= 3);
      assert.ok(serverStorageRes.products.every((p) => p.componentType === "storage"));

      // subCategorySlugs preservation & matching
      const amdProcessorRes = queryProducts(all, { category: "amd-processor", limit: 96 });
      assert.ok(amdProcessorRes.total >= 2);
      assert.ok(
        amdProcessorRes.products.every((p) =>
          p.subCategorySlugs?.includes("amd-processor")
        )
      );
      assert.strictEqual(matchesCategorySlug(amdProcessorRes.products[0], "AMD-PROCESSOR"), true);
      assert.strictEqual(matchesCategorySlug(amdProcessorRes.products[0], "all"), true);

      // buildCategoriesWithCounts uses matchesCategorySlug for parent categories too
      const parentCats = buildCategoriesWithCounts(
        [
          { id: "cat-comp", name: "Component", slug: "component" },
          { id: "cat-power", name: "Power", slug: "power" },
          { id: "cat-gaming", name: "Gaming", slug: "gaming" },
        ],
        all
      );
      assert.strictEqual(
        parentCats.find((c) => c.slug === "component")?.productCount,
        componentRes.total
      );
      assert.strictEqual(
        parentCats.find((c) => c.slug === "power")?.productCount,
        powerRes.total
      );
      assert.strictEqual(
        parentCats.find((c) => c.slug === "gaming")?.productCount,
        gamingRes.total
      );
    });

    it("projects brands via matchesCategorySlug for parent and component-type categories", async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });
      const all = await adapter.getAllProducts();

      const componentBrands = getCategoryBrands("component", all);
      assert.ok(componentBrands.length >= 5);
      const asusInComponent = componentBrands.find((b) => b.slug === "asus");
      assert.ok(asusInComponent && asusInComponent.productCount >= 4);
      assert.strictEqual(asusInComponent.isIndexable, true);

      const cpuBrands = getCategoryBrands("cpu", all);
      const amdInCpu = cpuBrands.find((b) => b.slug === "amd");
      const intelInCpu = cpuBrands.find((b) => b.slug === "intel");
      assert.ok(amdInCpu);
      assert.strictEqual(amdInCpu.productCount, 3);
      assert.strictEqual(amdInCpu.isIndexable, true);
      assert.ok(intelInCpu);
      assert.strictEqual(intelInCpu.productCount, 1);
      assert.strictEqual(intelInCpu.isIndexable, false);

      const powerBrands = getCategoryBrands("power", all);
      assert.deepStrictEqual(
        powerBrands.map((b) => b.slug),
        ["corsair", "msi", "seasonic"]
      );
      assert.ok(powerBrands.every((b) => b.productCount === 1));

      // Verify ICMSAdapter.getBrandsByCategory() directly on parent & component slugs
      const adapterComponentBrands = await adapter.getBrandsByCategory("component");
      const adapterCpuBrands = await adapter.getBrandsByCategory("cpu");
      assert.strictEqual(adapterComponentBrands.length, componentBrands.length);
      assert.strictEqual(adapterCpuBrands.length, cpuBrands.length);

      // Verify BrandNavStrip sharedContext URL construction preserves PC Builder compatibility filters
      const brandHref = buildCatalogUrl("/category/motherboard/asus", {
        builder: "1",
        slot: "motherboard",
        sockets: ["AM5"],
        ramTypes: ["DDR5"],
        formFactors: ["ATX", "mATX"],
        storageInterfaces: ["M.2 NVMe"],
      });
      const parsedBrandHref = parseCatalogSearchParams(
        new URL(brandHref, "http://localhost").searchParams,
        { category: "motherboard", brand: "asus" }
      );
      assert.strictEqual(parsedBrandHref.builder, "1");
      assert.strictEqual(parsedBrandHref.slot, "motherboard");
      assert.deepStrictEqual(parsedBrandHref.sockets, ["AM5"]);
      assert.deepStrictEqual(parsedBrandHref.ramTypes, ["DDR5"]);
      assert.deepStrictEqual(parsedBrandHref.formFactors, ["ATX", "mATX"]);
      assert.deepStrictEqual(parsedBrandHref.storageInterfaces, ["M.2 NVMe"]);

      // Global search on /category/all?q=... finds monitors & peripherals across all categories
      const logitechAll = queryProducts(all, { category: "all", q: "Logitech" });
      assert.ok(logitechAll.total >= 2);
      assert.ok(
        logitechAll.products.some(
          (p) => p.componentType === "keyboard" || p.componentType === "mouse"
        )
      );
      const lgAll = queryProducts(all, { category: "all", q: "LG" });
      assert.ok(lgAll.total >= 1);
      assert.ok(lgAll.products.some((p) => p.componentType === "monitor"));

      // Brand route baseOverrides.brand always takes precedence over ?brand= query override
      const lockedBrandQuery = parseCatalogSearchParams(
        new URLSearchParams("brand=msi&q=b650"),
        { category: "motherboard", brand: "asus" }
      );
      assert.strictEqual(lockedBrandQuery.brand, "asus");
      assert.strictEqual(lockedBrandQuery.brands, undefined);
      const lockedRes = queryProducts(all, lockedBrandQuery);
      assert.ok(lockedRes.total >= 1);
      assert.ok(lockedRes.products.every((p) => p.brandSlug === "asus"));

      // prefilter=1 parses & serializes deterministically without marking URL non-canonical
      const withPrefilter = parseCatalogSearchParams(
        new URLSearchParams("builder=1&slot=cooler&socket=AM5&prefilter=1"),
        { category: "cpu-cooler" }
      );
      assert.strictEqual(withPrefilter.prefilter, "1");
      assert.strictEqual(
        buildCatalogUrl("/category/cpu-cooler", {
          builder: "1",
          slot: "cooler",
          sockets: ["AM5"],
          prefilter: "1",
        }),
        "/category/cpu-cooler?socket=AM5&builder=1&slot=cooler&prefilter=1"
      );
    });
  });
});
