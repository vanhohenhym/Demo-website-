import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  MockCmsAdapter,
  WooCommerceCmsAdapter,
  GenericRestCmsAdapter,
  WpPostsCmsAdapter,
  clearUnmappedAttributeLog,
  createCmsAdapter,
  deriveComponentType,
  getCmsAdapter,
  getLoggedUnmappedAttributes,
  mapGenericRestProductToRaw,
  mapWooProductToRaw,
  mapWpPostToRaw,
  normalizeProductAttributes,
  normalizeSingleAttribute,
  resetCmsAdapterCache,
  resolveCmsProviderName,
  toCatalogProduct,
} from "../../lib/cms/index.ts";
import { catalogDataHealthReport } from "../../lib/logic/index.ts";

describe("CMS Data Layer", () => {
  afterEach(() => {
    delete process.env.CMS_PROVIDER;
    resetCmsAdapterCache();
    clearUnmappedAttributeLog();
  });

  describe("MockCmsAdapter normalization & messy values", () => {
    it("covers all 7 audited PC component types plus extra categories and an empty category", async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });
      const products = await adapter.getAllProducts();
      const categories = await adapter.getCategories();

      assert.ok(products.length >= 25, "Expected rich mock catalog");

      const auditedTypes = [
        "motherboard",
        "cpu",
        "gpu",
        "psu",
        "case",
        "cooler",
        "storage",
      ];
      for (const compType of auditedTypes) {
        const count = products.filter((p) => p.componentType === compType).length;
        assert.ok(count >= 3, `Expected >= 3 products for componentType=${compType}, got ${count}`);
      }

      const networking = categories.find((c) => c.slug === "networking");
      assert.ok(networking, "Expected empty networking category for sitemap exclusion tests");
      assert.strictEqual(networking.productCount, 0);
    });

    it("normalizes messy CMS attribute names and values into canonical attributes", async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });
      const byId = new Map((await adapter.getAllProducts()).map((p) => [p.id, p]));

      // Socket AM5 + DDR5-6000 via pa_socket / pa_memory-type
      const mobo1 = byId.get("mobo-1");
      assert.ok(mobo1);
      assert.strictEqual(mobo1.attributes.socket?.value, "AM5");
      assert.strictEqual(mobo1.attributes.socket?.source, "explicit");
      assert.strictEqual(mobo1.attributes.ramType?.value, "DDR5");
      assert.strictEqual(mobo1.attributes.formFactor?.value, "ATX");
      assert.deepStrictEqual(mobo1.attributes.storageInterfaces?.value, [
        "M.2 NVMe",
        "SATA III",
      ]);

      // Micro ATX + NVMe PCIe Gen4 x4 via CPU Socket / Supported Interfaces
      const mobo2 = byId.get("mobo-2");
      assert.ok(mobo2);
      assert.strictEqual(mobo2.attributes.socket?.value, "AM5");
      assert.strictEqual(mobo2.attributes.formFactor?.value, "mATX");
      assert.deepStrictEqual(mobo2.attributes.storageInterfaces?.value, [
        "M.2 NVMe",
        "SATA III",
      ]);

      // LGA 1700 via Processor Socket
      const mobo3 = byId.get("mobo-3");
      assert.ok(mobo3);
      assert.strictEqual(mobo3.attributes.socket?.value, "LGA1700");

      // GPU 33.6 cm -> 336 mm and Power Consumption -> tdp 320
      const gpu1 = byId.get("gpu-1");
      assert.ok(gpu1);
      assert.strictEqual(gpu1.attributes.lengthMm?.value, 336);
      assert.strictEqual(gpu1.attributes.tdp?.value, 320);

      // PSU 750W & 1.0 kW & 850W-Gold title parse (D1)
      assert.strictEqual(byId.get("psu-1")?.attributes.wattage?.value, 750);
      assert.strictEqual(byId.get("psu-2")?.attributes.wattage?.value, 850);
      assert.strictEqual(byId.get("psu-2")?.attributes.wattage?.source, "parsed");
      assert.strictEqual(byId.get("psu-3")?.attributes.wattage?.value, 1000);

      // Case D2 largest form factor (EATX) & component-aware pa_length -> maxGpuLengthMm
      const case2 = byId.get("case-2");
      assert.ok(case2);
      assert.strictEqual(case2.attributes.formFactor?.value, "EATX");
      assert.strictEqual(case2.attributes.formFactor?.source, "parsed");
      assert.strictEqual(case2.attributes.maxGpuLengthMm?.value, 392);

      // Cooler D5: cooler title with AM5 must NOT set scalar socket
      const cooler2 = byId.get("cooler-2");
      assert.ok(cooler2);
      assert.strictEqual(cooler2.attributes.socket, undefined);
      assert.deepStrictEqual(cooler2.attributes.coolerSockets?.value, [
        "AM5",
        "AM4",
        "LGA1700",
      ]);

      // Storage D8 ("NVMe PCIe Gen4 x4" -> "M.2 NVMe") & HTML description spec table parsing
      assert.strictEqual(byId.get("ssd-1")?.attributes.storageInterface?.value, "M.2 NVMe");
      assert.strictEqual(byId.get("ssd-2")?.attributes.storageInterface?.value, "M.2 NVMe");
      assert.strictEqual(byId.get("ssd-2")?.attributes.storageInterface?.source, "parsed");
      assert.strictEqual(byId.get("ssd-3")?.attributes.storageInterface?.value, "SATA III");

      // RAM DDR5-6000 & D1 title extraction DDR5-6400
      assert.strictEqual(byId.get("ram-1")?.attributes.ramType?.value, "DDR5");
      assert.strictEqual(byId.get("ram-2")?.attributes.ramType?.value, "DDR5");
      assert.strictEqual(byId.get("ram-2")?.attributes.ramType?.source, "parsed");
    });

    it("preserves absent prices as undefined for Call for price handling", async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });
      const cpu4 = await adapter.getProductBySlug("intel-core-i7-14700k-processor");
      const gpu4 = await adapter.getProductBySlug("dual-fan-silent-display-adapter-2gb");

      assert.ok(cpu4);
      assert.strictEqual(cpu4.price, undefined);
      assert.ok(gpu4);
      assert.strictEqual(gpu4.price, undefined);
    });
  });

  describe("Brand alias merging, SKU prefix resolution, and Other fallback", () => {
    it("merges ASUS / Asus / ASUSTeK into one indexable ASUS brand in motherboard category", async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });
      const brands = await adapter.getBrandsByCategory("motherboard");

      const asus = brands.find((b) => b.slug === "asus");
      assert.ok(asus, "Expected merged ASUS brand");
      assert.strictEqual(asus.name, "ASUS");
      assert.strictEqual(asus.productCount, 3);
      assert.strictEqual(asus.isIndexable, true);
      assert.strictEqual(asus.logo, "/images/brands/asus.png");

      const msi = brands.find((b) => b.slug === "msi");
      assert.ok(msi);
      assert.strictEqual(msi.name, "MSI");
      assert.strictEqual(msi.productCount, 1);
      assert.strictEqual(msi.isIndexable, false);

      const gigabyte = brands.find((b) => b.slug === "gigabyte");
      assert.ok(gigabyte);
      assert.strictEqual(gigabyte.name, "Gigabyte");
      assert.strictEqual(gigabyte.productCount, 1);
      assert.strictEqual(gigabyte.isIndexable, false);
    });

    it("resolves brand via title prefix and SKU prefix", async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });
      const cpu3 = await adapter.getProductBySlug("amd-ryzen-5-5600x-am4-processor");
      const psu1 = await adapter.getProductBySlug("corsair-rm750e-750w-psu");

      assert.ok(cpu3);
      assert.strictEqual(cpu3.brand, "AMD");
      assert.strictEqual(cpu3.brandSlug, "amd");

      assert.ok(psu1);
      assert.strictEqual(psu1.brand, "Corsair");
      assert.strictEqual(psu1.brandSlug, "corsair");
    });

    it('resolves unbranded/placeholder products to "Other", places "Other" last, and marks it non-indexable', async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });

      const gpu4 = await adapter.getProductBySlug("dual-fan-silent-display-adapter-2gb");
      assert.ok(gpu4);
      assert.strictEqual(gpu4.brand, "Other");
      assert.strictEqual(gpu4.brandSlug, "other");

      const gpuBrands = await adapter.getBrandsByCategory("graphics-card");
      assert.ok(gpuBrands.length >= 2);
      const lastBrand = gpuBrands[gpuBrands.length - 1];
      assert.strictEqual(lastBrand.name, "Other");
      assert.strictEqual(lastBrand.slug, "other");
      assert.strictEqual(lastBrand.productCount, 1);
      assert.strictEqual(lastBrand.isIndexable, false);

      // Empty category returns no brands
      const emptyBrands = await adapter.getBrandsByCategory("networking");
      assert.deepStrictEqual(emptyBrands, []);
    });
  });

  describe("Per-SKU overrides (data/overrides.json)", () => {
    it("applies overrides with source=override and confidence=high for messy mock SKUs", async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });

      const gpu3 = await adapter.getProductBySlug("gigabyte-rtx-4070-super-eagle-oc");
      assert.ok(gpu3);
      assert.strictEqual(gpu3.attributes.lengthMm?.value, 261);
      assert.strictEqual(gpu3.attributes.lengthMm?.source, "override");
      assert.strictEqual(gpu3.attributes.lengthMm?.confidence, "high");
      assert.strictEqual(gpu3.attributes.tdp?.value, 220);
      assert.strictEqual(gpu3.attributes.tdp?.source, "override");
      assert.strictEqual(gpu3.audit?.hasOverrideAttributes, true);

      const mobo4 = await adapter.getProductBySlug("msi-pro-b650m-p-am5-motherboard");
      assert.ok(mobo4);
      assert.deepStrictEqual(mobo4.attributes.storageInterfaces?.value, [
        "M.2 NVMe",
        "SATA III",
      ]);
      assert.strictEqual(mobo4.attributes.storageInterfaces?.source, "override");
    });
  });

  describe("Unmapped CMS attribute tracking & logging", () => {
    it("records and logs unmapped CMS attribute names while keeping metadata keys clean", async () => {
      const logged: string[] = [];
      const adapter = new MockCmsAdapter({
        logUnmapped: true,
        logger: (msg) => logged.push(msg),
      });

      const unmapped = await adapter.getUnmappedAttributes();
      const names = unmapped.map((u) => u.attributeName);

      assert.ok(names.includes("RGB Header"), "Expected RGB Header in unmapped list");
      assert.ok(names.includes("Cooling Fans"), "Expected Cooling Fans in unmapped list");
      assert.ok(names.includes("Efficiency Rating"), "Expected Efficiency Rating in unmapped list");
      assert.ok(!names.includes("Brand"), "Brand metadata key must not be flagged as unmapped");

      assert.ok(logged.length > 0, "Expected logger to receive unmapped attribute warnings");
      assert.ok(logged.some((line) => line.includes("RGB Header")));

      const processLogged = getLoggedUnmappedAttributes();
      assert.ok(processLogged.includes("RGB Header"));
    });

    it("supports normalizeSingleAttribute and direct normalizeProductAttributes calls", () => {
      const single = normalizeSingleAttribute("pa_socket", "Socket AM5", "cpu");
      assert.strictEqual(single.matched, true);
      assert.strictEqual(single.textResult?.value, "AM5");

      const logs: string[] = [];
      const res = normalizeProductAttributes(
        {
          id: "test-1",
          sku: "TEST-1",
          title: "Test Board",
          categorySlug: "motherboard",
          categoryName: "Motherboard",
          availability: "in_stock",
          images: [],
          explicitAttributes: [
            { key: "Mystery Field", value: "XYZ" },
            { key: "Socket", value: "AM5" },
          ],
          customFields: [],
        },
        "motherboard",
        { logUnmapped: true, logger: (m) => logs.push(m), overridesMap: {} }
      );

      assert.strictEqual(res.attributes.socket?.value, "AM5");
      assert.deepStrictEqual(res.unmappedAttributeNames, ["Mystery Field"]);
      assert.strictEqual(res.unmappedAttributes["Mystery Field"], "XYZ");
      assert.strictEqual(logs.length, 1);
    });
  });

  describe("componentType derivation (field-map.ts)", () => {
    it("derives componentType from explicit field, attributes, sub-categories, and categorySlug", () => {
      assert.strictEqual(
        deriveComponentType({ explicitComponentType: "gpu", categorySlug: "other" }),
        "gpu"
      );
      assert.strictEqual(
        deriveComponentType({
          categorySlug: "component",
          attributes: [{ key: "component_type", value: "psu" }],
        }),
        "psu"
      );
      assert.strictEqual(
        deriveComponentType({
          categorySlug: "component",
          subCategorySlugs: ["component", "amd-processor"],
        }),
        "cpu"
      );
      assert.strictEqual(
        deriveComponentType({ categorySlug: "power-supply" }),
        "psu"
      );
      assert.strictEqual(
        deriveComponentType({ categorySlug: "casing" }),
        "case"
      );
      assert.strictEqual(
        deriveComponentType({ categorySlug: "cpu-cooler" }),
        "cooler"
      );
      assert.strictEqual(
        deriveComponentType({ categorySlug: "nvme-ssd" }),
        "storage"
      );
      assert.strictEqual(
        deriveComponentType({ categorySlug: "networking" }),
        "other"
      );
    });
  });

  describe("CMS_PROVIDER switching & external adapter mappers", () => {
    it("selects mock by default and switches cleanly via CMS_PROVIDER", () => {
      delete process.env.CMS_PROVIDER;
      assert.strictEqual(resolveCmsProviderName(), "mock");
      assert.strictEqual(getCmsAdapter().providerName, "mock");

      process.env.CMS_PROVIDER = "woocommerce";
      assert.strictEqual(getCmsAdapter().providerName, "woocommerce");

      process.env.CMS_PROVIDER = "generic-rest";
      assert.strictEqual(getCmsAdapter().providerName, "generic-rest");

      process.env.CMS_PROVIDER = "wp-posts";
      assert.strictEqual(getCmsAdapter().providerName, "wp-posts");

      process.env.CMS_PROVIDER = "wordpress";
      assert.strictEqual(resolveCmsProviderName(), "wp-posts");

      process.env.CMS_PROVIDER = "unknown-provider";
      assert.strictEqual(getCmsAdapter().providerName, "mock");

      assert.strictEqual(createCmsAdapter("woocommerce").providerName, "woocommerce");
      assert.strictEqual(createCmsAdapter("generic-rest").providerName, "generic-rest");
      assert.strictEqual(createCmsAdapter("wp-posts").providerName, "wp-posts");
    });

    it("normalizes WooCommerce REST v3 payloads using a mocked fetchFn", async () => {
      const wooPayload = [
        {
          id: 501,
          name: "Asus TUF B650-PLUS Motherboard",
          slug: "asus-tuf-b650-plus",
          sku: "ASU-WC-501",
          regular_price: "27000",
          sale_price: "25500",
          stock_status: "instock",
          stock_quantity: 5,
          categories: [{ id: 10, name: "Motherboard", slug: "motherboard" }],
          brands: [{ name: "ASUSTeK", slug: "asustek" }],
          attributes: [
            { name: "CPU Socket", slug: "pa_socket", options: ["Socket AM5"] },
            { name: "Memory", slug: "pa_memory-type", options: ["DDR5-6000"] },
          ],
          meta_data: [
            { key: "storage_interfaces", value: "M.2 NVMe, SATA III" },
            { key: "_internal_wp_key", value: "ignored" },
          ],
          images: [{ src: "https://cms.example.com/b650.jpg", alt: "B650" }],
          featured: true,
        },
      ];

      const rawMapped = mapWooProductToRaw(wooPayload[0]);
      assert.strictEqual(rawMapped.brandTaxonomy, "ASUSTeK");
      assert.strictEqual(rawMapped.salePrice, 25500);

      const mockFetch = (async () =>
        new Response(JSON.stringify(wooPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })) as unknown as typeof fetch;

      const wooAdapter = new WooCommerceCmsAdapter({
        endpoint: "https://store.example.com/wp-json/wc/v3",
        consumerKey: "ck_test",
        consumerSecret: "cs_test",
        fetchFn: mockFetch,
        logUnmapped: false,
      });

      const products = await wooAdapter.getAllProducts();
      assert.strictEqual(products.length, 1);
      assert.strictEqual(products[0].brand, "ASUS");
      assert.strictEqual(products[0].brandSlug, "asus");
      assert.strictEqual(products[0].componentType, "motherboard");
      assert.strictEqual(products[0].attributes.socket?.value, "AM5");
      assert.strictEqual(products[0].attributes.ramType?.value, "DDR5");
    });

    it("normalizes Generic REST payloads using a mocked fetchFn", async () => {
      const restPayload = {
        data: [
          {
            id: "rest-1",
            sku: "COR-REST-850",
            title: "RM850x Power Supply",
            categorySlug: "power-supply",
            categoryName: "Power Supply",
            price: 15500,
            availability: "in_stock",
            attributes: {
              Wattage: "850W",
              "Custom Tag": "Modular",
            },
          },
        ],
      };

      const rawMapped = mapGenericRestProductToRaw(restPayload.data[0]);
      assert.strictEqual(rawMapped.sku, "COR-REST-850");

      const mockFetch = (async () =>
        new Response(JSON.stringify(restPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })) as unknown as typeof fetch;

      const restAdapter = new GenericRestCmsAdapter({
        endpoint: "https://api.example.com/v1",
        apiKey: "secret-token",
        fetchFn: mockFetch,
        logUnmapped: false,
      });

      const products = await restAdapter.getAllProducts();
      assert.strictEqual(products.length, 1);
      assert.strictEqual(products[0].brand, "Corsair");
      assert.strictEqual(products[0].componentType, "psu");
      assert.strictEqual(products[0].attributes.wattage?.value, 850);
      assert.strictEqual(products[0].unmappedAttributes?.["Custom Tag"], "Modular");
    });

    it("selects WooCommerce leaf category from parent-first categories while preserving subCategorySlugs", async () => {
      const wooPayload = [
        {
          id: 777,
          name: "MSI MAG B650 TOMAHAWK WIFI",
          slug: "msi-mag-b650-tomahawk-wifi",
          sku: "MSI-WC-777",
          regular_price: "29500",
          stock_status: "instock",
          categories: [
            { id: 1, name: "Component", slug: "component" },
            { id: 10, name: "Motherboard", slug: "motherboard" },
          ],
          brands: [{ name: "MSI", slug: "msi" }],
          attributes: [{ name: "Socket", slug: "pa_socket", options: ["AM5"] }],
        },
      ];

      const rawMapped = mapWooProductToRaw(wooPayload[0]);
      assert.strictEqual(rawMapped.categorySlug, "motherboard");
      assert.strictEqual(rawMapped.categoryName, "Motherboard");
      assert.deepStrictEqual(rawMapped.subCategorySlugs, ["component", "motherboard"]);

      const mockFetch = (async () =>
        new Response(JSON.stringify(wooPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })) as unknown as typeof fetch;

      const wooAdapter = new WooCommerceCmsAdapter({
        endpoint: "https://store.example.com/wp-json/wc/v3",
        fetchFn: mockFetch,
        logUnmapped: false,
      });

      const [product] = await wooAdapter.getAllProducts();
      assert.strictEqual(product.categorySlug, "motherboard");
      assert.strictEqual(product.categoryName, "Motherboard");
      assert.strictEqual(product.componentType, "motherboard");
      assert.deepStrictEqual(product.subCategorySlugs, ["component", "motherboard"]);
    });

    it("caches getAllProducts() with TTL and deduplicates concurrent in-flight fetches on WooCommerce and Generic REST adapters", async () => {
      let wooFetchCount = 0;
      let wooSawSignal = false;
      const wooPayload = [
        {
          id: 901,
          name: "AMD Ryzen 5 7600 Processor",
          slug: "amd-ryzen-5-7600",
          sku: "AMD-WC-7600",
          regular_price: "23000",
          stock_status: "instock",
          categories: [{ id: 2, name: "Processor", slug: "processor" }],
        },
      ];

      const wooFetch = (async (_input: string | URL | Request, init?: RequestInit) => {
        wooFetchCount += 1;
        wooSawSignal = init?.signal instanceof AbortSignal;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return new Response(JSON.stringify(wooPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;

      const wooAdapter = new WooCommerceCmsAdapter({
        endpoint: "https://store.example.com/wp-json/wc/v3",
        fetchFn: wooFetch,
        cacheTtlMs: 60_000,
        timeoutMs: 5_000,
        logUnmapped: false,
      });

      const [wooConcurrentA, wooConcurrentB] = await Promise.all([
        wooAdapter.getAllProducts(),
        wooAdapter.getAllProducts(),
      ]);
      const wooSequential = await wooAdapter.getAllProducts();

      assert.strictEqual(wooFetchCount, 1);
      assert.strictEqual(wooSawSignal, true);
      assert.strictEqual(wooConcurrentA.length, 1);
      assert.strictEqual(wooConcurrentB.length, 1);
      assert.strictEqual(wooSequential.length, 1);

      wooAdapter.clearCache();
      await wooAdapter.getAllProducts();
      assert.strictEqual(wooFetchCount, 2);

      let restFetchCount = 0;
      let restSawSignal = false;
      const restPayload = {
        data: [
          {
            id: "rest-cache-1",
            sku: "COR-CACHE-1",
            title: "Corsair RM850e PSU",
            categorySlug: "power-supply",
            categoryName: "Power Supply",
            price: 15000,
            availability: "in_stock",
          },
        ],
      };

      const restFetch = (async (_input: string | URL | Request, init?: RequestInit) => {
        restFetchCount += 1;
        restSawSignal = init?.signal instanceof AbortSignal;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return new Response(JSON.stringify(restPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;

      const restAdapter = new GenericRestCmsAdapter({
        endpoint: "https://api.example.com/v1",
        fetchFn: restFetch,
        cacheTtlMs: 60_000,
        timeoutMs: 5_000,
        logUnmapped: false,
      });

      const [restConcurrentA, restConcurrentB] = await Promise.all([
        restAdapter.getAllProducts(),
        restAdapter.getAllProducts(),
      ]);
      const restSequential = await restAdapter.getAllProducts();

      assert.strictEqual(restFetchCount, 1);
      assert.strictEqual(restSawSignal, true);
      assert.strictEqual(restConcurrentA.length, 1);
      assert.strictEqual(restConcurrentB.length, 1);
      assert.strictEqual(restSequential.length, 1);

      restAdapter.clearCache();
      await restAdapter.getAllProducts();
      assert.strictEqual(restFetchCount, 2);
    });

    it("resolves synthesized slugs via getProductBySlug() using cached getAllProducts() before hitting the slug query endpoint", async () => {
      let fetchCount = 0;
      const wooPayload = [
        {
          id: 955,
          name: "AMD Ryzen 7 7800X3D",
          slug: "",
          sku: "AMD-7800X3D-WC",
          regular_price: "43500",
          stock_status: "instock",
          categories: [{ id: 2, name: "Processor", slug: "processor" }],
        },
      ];

      const wooAdapter = new WooCommerceCmsAdapter({
        endpoint: "https://store.example.com/wp-json/wc/v3",
        fetchFn: (async () => {
          fetchCount += 1;
          return new Response(JSON.stringify(wooPayload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }) as typeof fetch,
        cacheTtlMs: 60_000,
        logUnmapped: false,
      });

      const first = await wooAdapter.getProductBySlug(
        "amd-ryzen-7-7800x3d-amd-7800x3d-wc"
      );
      const second = await wooAdapter.getProductBySlug(
        "amd-ryzen-7-7800x3d-amd-7800x3d-wc"
      );

      assert.ok(first);
      assert.strictEqual(first.id, "955");
      assert.strictEqual(second?.id, "955");
      assert.strictEqual(fetchCount, 1);
    });

    it("normalizes WordPress REST v2 Posts, Categories, Tags, and Featured Media with TTL caching", async () => {
      const wpCategories = [
        { id: 1, name: "Uncategorized", slug: "uncategorized", parent: 0, count: 1 },
        { id: 10, name: "Component", slug: "component", parent: 0, count: 1 },
        { id: 11, name: "Processor", slug: "cpu", parent: 10, count: 1 },
      ];

      const wpPosts = [
        {
          id: 3,
          slug: "hello-world",
          title: { rendered: "Hello World!" },
          content: { rendered: "<p>Welcome to WordPress!</p>" },
          excerpt: { rendered: "<p>Welcome to WordPress!</p>" },
          categories: [1],
          meta: {
            jetpack_seo_noindex: false,
            jetpack_post_was_ever_published: false,
            footnotes: "",
          },
        },
        {
          id: 42,
          slug: "amd-ryzen-7-7800x3d",
          sticky: true,
          date_gmt: "2026-11-25T10:00:00",
          title: { rendered: "AMD Ryzen 7 7800X3D" },
          excerpt: { rendered: "<p>Gaming CPU with 3D V-Cache</p>" },
          content: {
            rendered: [
              "<p>Price: 43500<br>Sale Price: 41900<br>SKU: AMD-7800X3D<br>Brand: AMD<br>Warranty: 3 Years</p>",
              "<table><tr><th>Socket</th><td>AM5</td></tr><tr><th>TDP</th><td>120W</td></tr></table>",
            ].join(""),
          },
          categories: [10, 11],
          _embedded: {
            "wp:term": [
              [
                { id: 10, name: "Component", slug: "component", taxonomy: "category" },
                { id: 11, name: "Processor", slug: "cpu", taxonomy: "category" },
              ],
              [{ id: 99, name: "flash-deal", slug: "flash-deal", taxonomy: "post_tag" }],
            ],
            "wp:featuredmedia": [
              {
                id: 500,
                source_url: "https://shahriarnadimcom.files.wordpress.com/2026/11/7800x3d.webp",
                alt_text: "AMD Ryzen 7 7800X3D Box",
                media_details: { width: 800, height: 800 },
              },
            ],
          },
        },
      ];

      const rawMapped = mapWpPostToRaw(wpPosts[1]);
      assert.strictEqual(rawMapped.sku, "AMD-7800X3D");
      assert.strictEqual(rawMapped.price, 43500);
      assert.strictEqual(rawMapped.salePrice, 41900);
      assert.strictEqual(rawMapped.categorySlug, "cpu");
      assert.deepStrictEqual(rawMapped.subCategorySlugs, ["component", "cpu"]);
      assert.strictEqual(rawMapped.isFeatured, true);
      assert.strictEqual(rawMapped.isFlashDeal, true);

      let postRequests = 0;
      const wpAdapter = new WpPostsCmsAdapter({
        endpoint: "https://public-api.wordpress.com/wp/v2/sites/shahriarnadimcom.wordpress.com",
        fetchFn: (async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.includes("/categories")) {
            return new Response(JSON.stringify(wpCategories), {
              status: 200,
              headers: { "Content-Type": "application/json", "X-WP-TotalPages": "1" },
            });
          }
          postRequests += 1;
          return new Response(JSON.stringify(wpPosts), {
            status: 200,
            headers: { "Content-Type": "application/json", "X-WP-TotalPages": "1" },
          });
        }) as typeof fetch,
        cacheTtlMs: 60_000,
        logUnmapped: false,
      });

      const products = await wpAdapter.getAllProducts();
      assert.strictEqual(products.length, 1);
      assert.strictEqual(products[0].slug, "amd-ryzen-7-7800x3d");
      assert.strictEqual(products[0].componentType, "cpu");
      assert.strictEqual(products[0].brand, "AMD");
      assert.strictEqual(products[0].attributes.socket?.value, "AM5");
      assert.strictEqual(products[0].attributes.tdp?.value, 120);
      assert.strictEqual(products[0].warranty, "3 Years");
      assert.strictEqual(
        products[0].images[0]?.url,
        "https://shahriarnadimcom.files.wordpress.com/2026/11/7800x3d.webp"
      );

      const categories = await wpAdapter.getCategories();
      assert.ok(categories.some((cat) => cat.slug === "cpu" && cat.productCount === 1));
      assert.ok(categories.some((cat) => cat.slug === "component" && cat.productCount === 1));
      assert.ok(!categories.some((cat) => cat.slug === "uncategorized"));

      const cachedBySlug = await wpAdapter.getProductBySlug("amd-ryzen-7-7800x3d");
      assert.strictEqual(cachedBySlug?.sku, "AMD-7800X3D");
      assert.strictEqual(postRequests, 1);
    });
  });

  describe("Querying, facets, and Data Health integration", () => {
    it("supports filtering, sorting, facets, featured products, and flash deals", async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });

      const queryRes = await adapter.getProducts({
        category: "motherboard",
        brand: "asus",
        sort: "price-asc",
        page: 1,
        limit: 12,
      });

      assert.strictEqual(queryRes.total, 3);
      assert.strictEqual(queryRes.products.length, 3);
      assert.ok(
        (queryRes.products[0].salePrice ?? queryRes.products[0].price ?? 0) <=
          (queryRes.products[1].salePrice ?? queryRes.products[1].price ?? 0)
      );

      const brandFacet = queryRes.facets.find((f) => f.key === "brand");
      assert.ok(brandFacet);
      assert.ok(brandFacet.values.some((v) => v.value === "asus" && v.count === 3));

      const featured = await adapter.getFeaturedProducts(4);
      assert.strictEqual(featured.length, 4);

      const deals = await adapter.getFlashDeals();
      assert.ok(deals.length >= 4);
    });

    it("feeds catalogDataHealthReport cleanly across all 7 audited component types", async () => {
      const adapter = new MockCmsAdapter({ logUnmapped: false });
      const products = await adapter.getAllProducts();
      const logicProducts = products.map((p) => toCatalogProduct(p, true));

      const report = catalogDataHealthReport(logicProducts);
      assert.strictEqual(report.categoryHealths.length, 7);

      const statuses = new Set(report.categoryHealths.map((c) => c.status));
      assert.ok(statuses.has("green"), "Expected at least one green category");
      assert.ok(statuses.has("amber"), "Expected at least one amber category");
      assert.ok(statuses.has("red"), "Expected at least one red category");
      assert.ok(report.otherBrandCount >= 2, "Expected >= 2 Other brand products");
      assert.ok(report.parsedProductCount >= 4, "Expected >= 4 parsed products");
    });
  });
});
