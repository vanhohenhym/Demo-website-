import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  CustomCmsAdapter,
  MockCmsAdapter,
  RAW_MOCK_CATEGORIES,
  RAW_MOCK_PRODUCTS,
  clearUnmappedAttributeLog,
  createCmsAdapter,
  createKvStorageDriver,
  createMemoryStorageDriver,
  createNodeFsStorageDriver,
  deleteCustomCategory,
  deleteCustomMedia,
  deleteCustomProduct,
  duplicateCustomProduct,
  exportCustomStoreSnapshot,
  getCmsAdapter,
  getCustomMedia,
  getCustomProductById,
  getCustomProductBySlug,
  importCustomStoreSnapshot,
  listCustomCategories,
  listCustomMedia,
  listCustomProducts,
  patchCustomProduct,
  resetCmsAdapterCache,
  resetCustomStoreDriver,
  resetCustomStoreToSeed,
  resolveCmsProviderName,
  saveCustomMedia,
  setCustomStoreDriver,
  upsertCustomCategory,
  upsertCustomProduct,
  type KvNamespaceLike,
} from "../../lib/cms/index.ts";

describe("Custom CMS Storage & Adapter", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    delete process.env.CMS_PROVIDER;
    delete process.env.CUSTOM_CMS_DATA_FILE;
    resetCustomStoreDriver();
    resetCmsAdapterCache();
    clearUnmappedAttributeLog();
    for (const dir of tempDirs.splice(0)) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  async function createTempDataFile(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "custom-cms-test-"));
    tempDirs.push(dir);
    return path.join(dir, "custom-cms.json");
  }

  describe("Provider registration & seed parity", () => {
    it("registers 'custom' in resolveCmsProviderName, createCmsAdapter, and getCmsAdapter", () => {
      assert.strictEqual(resolveCmsProviderName("custom"), "custom");
      assert.strictEqual(resolveCmsProviderName("CUSTOM-CMS"), "custom");

      process.env.CMS_PROVIDER = "custom";
      assert.strictEqual(resolveCmsProviderName(), "custom");

      const created = createCmsAdapter("custom");
      assert.ok(created instanceof CustomCmsAdapter);
      assert.strictEqual(created.providerName, "custom");

      const cached = getCmsAdapter();
      assert.strictEqual(cached.providerName, "custom");
      assert.strictEqual(getCmsAdapter("custom"), cached);
    });

    it("exports RAW_MOCK_CATEGORIES and RAW_MOCK_PRODUCTS and auto-seeds matching MockCmsAdapter", async () => {
      assert.ok(RAW_MOCK_CATEGORIES.length >= 10);
      assert.ok(RAW_MOCK_PRODUCTS.length >= 25);

      setCustomStoreDriver(createMemoryStorageDriver());

      const mockAdapter = new MockCmsAdapter({ logUnmapped: false });
      const customAdapter = new CustomCmsAdapter({ logUnmapped: false });

      const [mockProducts, customProducts, mockCats, customCats] =
        await Promise.all([
          mockAdapter.getAllProducts(),
          customAdapter.getAllProducts(),
          mockAdapter.getCategories(),
          customAdapter.getCategories(),
        ]);

      assert.strictEqual(customProducts.length, mockProducts.length);
      assert.strictEqual(customCats.length, mockCats.length);

      const storedAll = await listCustomProducts({ includeDrafts: true });
      assert.strictEqual(storedAll.length, RAW_MOCK_PRODUCTS.length);
      assert.ok(storedAll.every((p) => p.status === "publish"));

      const mockMobo1 = mockProducts.find((p) => p.id === "mobo-1");
      const customMobo1 = customProducts.find((p) => p.id === "mobo-1");
      assert.ok(mockMobo1 && customMobo1);
      assert.strictEqual(customMobo1.brand, mockMobo1.brand);
      assert.deepStrictEqual(
        customMobo1.attributes.storageInterfaces,
        mockMobo1.attributes.storageInterfaces
      );
    });
  });

  describe("Node.js disk persistence & Cloudflare KV driver", () => {
    it("persists seeded catalog and edits to disk JSON file and survives driver reload", async () => {
      const filePath = await createTempDataFile();
      setCustomStoreDriver(createNodeFsStorageDriver(filePath));

      const initial = await listCustomProducts();
      assert.strictEqual(initial.length, RAW_MOCK_PRODUCTS.length);

      const fileStat = await fs.stat(filePath);
      assert.ok(fileStat.isFile());

      const created = await upsertCustomProduct({
        title: "Persisted RTX 5090 Custom Card",
        sku: "PER-GPU-5090",
        categorySlug: "graphics-card",
        brandTaxonomy: "ASUS",
        status: "publish",
        price: 250000,
        explicitAttributes: [
          { key: "GPU Length", value: "340 mm" },
          { key: "TDP", value: "450W" },
        ],
      });

      // Simulate cold start with a fresh Node FS driver pointing to the same file
      setCustomStoreDriver(createNodeFsStorageDriver(filePath));
      const reloaded = await getCustomProductById(created.id);
      assert.ok(reloaded);
      assert.strictEqual(reloaded.title, "Persisted RTX 5090 Custom Card");
      assert.strictEqual(reloaded.price, 250000);
    });

    it("does not re-seed once initialized even if all products are deleted", async () => {
      const filePath = await createTempDataFile();
      setCustomStoreDriver(createNodeFsStorageDriver(filePath));

      const all = await listCustomProducts({ includeDrafts: true });
      for (const prod of all) {
        await deleteCustomProduct(prod.id);
      }

      setCustomStoreDriver(createNodeFsStorageDriver(filePath));
      const afterReload = await listCustomProducts({ includeDrafts: true });
      assert.strictEqual(afterReload.length, 0);
    });

    it("works cleanly with Cloudflare KV-compatible driver and isolates media blobs", async () => {
      const kvMap = new Map<string, string>();
      const mockKv: KvNamespaceLike = {
        async get(key: string): Promise<string | null> {
          return kvMap.get(key) ?? null;
        },
        async put(key: string, value: string): Promise<void> {
          kvMap.set(key, value);
        },
        async delete(key: string): Promise<void> {
          kvMap.delete(key);
        },
      };

      setCustomStoreDriver(createKvStorageDriver(mockKv));

      const products = await listCustomProducts();
      assert.strictEqual(products.length, RAW_MOCK_PRODUCTS.length);
      assert.ok(kvMap.has("custom-cms:catalog"));

      const meta = await saveCustomMedia({
        id: "kv-img-1",
        filename: "gpu.png",
        mimeType: "image/png",
        bytesBase64: "data:image/png;base64,iVBORw0KGgo=",
      });
      assert.strictEqual(meta.url, "/api/cms/media/kv-img-1");
      assert.ok(kvMap.has("custom-cms:media:kv-img-1"));
      assert.ok(kvMap.has("custom-cms:media-index"));

      const list = await listCustomMedia();
      assert.strictEqual(list.length, 1);
      assert.strictEqual("bytesBase64" in list[0], false);
    });
  });

  describe("Products CRUD, draft isolation, preview, and adapter cache invalidation", () => {
    it("isolates drafts from storefront adapter methods while allowing authenticated preview", async () => {
      setCustomStoreDriver(createMemoryStorageDriver());
      const adapter = new CustomCmsAdapter({ logUnmapped: false });

      // Warm adapter cache
      const beforeCount = (await adapter.getAllProducts()).length;
      assert.strictEqual(beforeCount, RAW_MOCK_PRODUCTS.length);

      const draft = await upsertCustomProduct({
        title: "Unreleased Ryzen 9 9950X3D",
        sku: "AMD-9950X3D-DRAFT",
        slug: "amd-ryzen-9-9950x3d-draft",
        categorySlug: "processor",
        brandTaxonomy: "AMD",
        status: "draft",
        price: 78000,
        salePrice: 74500,
        availability: "preorder",
        stockQuantity: 0,
        isFeatured: true,
        isFlashDeal: true,
        explicitAttributes: [
          { key: "Socket", value: "AM5" },
          { key: "TDP", value: "170W" },
        ],
      });

      // Store lookup defaults to published only
      assert.strictEqual(
        await getCustomProductBySlug("amd-ryzen-9-9950x3d-draft"),
        null
      );
      assert.ok(
        await getCustomProductBySlug("amd-ryzen-9-9950x3d-draft", true)
      );

      // Storefront adapter methods must NOT expose draft
      assert.strictEqual((await adapter.getAllProducts()).length, beforeCount);
      assert.strictEqual(
        await adapter.getProductBySlug("amd-ryzen-9-9950x3d-draft"),
        null
      );
      const featured = await adapter.getFeaturedProducts(50);
      assert.ok(!featured.some((p) => p.id === draft.id));
      const flash = await adapter.getFlashDeals();
      assert.ok(!flash.some((p) => p.id === draft.id));

      // Preview & admin methods DO see the draft with normalized attributes
      const preview = await adapter.getProductBySlugIncludingDrafts(
        "amd-ryzen-9-9950x3d-draft"
      );
      assert.ok(preview);
      assert.strictEqual(preview.componentType, "cpu");
      assert.strictEqual(preview.brand, "AMD");
      assert.strictEqual(preview.attributes.socket?.value, "AM5");
      assert.strictEqual(preview.attributes.tdp?.value, 170);

      const previewWithStatus = await adapter.getProductPreviewBySlug(
        "amd-ryzen-9-9950x3d-draft"
      );
      assert.strictEqual(previewWithStatus?.status, "draft");

      const adminList = await adapter.getAllProductsAdmin();
      assert.strictEqual(adminList.length, beforeCount + 1);

      // Publishing immediately invalidates cached CustomCmsAdapter products
      await patchCustomProduct(draft.id, { status: "publish" });
      assert.strictEqual(
        (await adapter.getAllProducts()).length,
        beforeCount + 1
      );
      const liveProduct = await adapter.getProductBySlug(
        "amd-ryzen-9-9950x3d-draft"
      );
      assert.ok(liveProduct);
      assert.strictEqual(liveProduct.salePrice, 74500);

      // Clearing price with null sets Call for price (undefined)
      await patchCustomProduct(draft.id, { price: null, salePrice: null });
      const callForPrice = await adapter.getProductBySlug(
        "amd-ryzen-9-9950x3d-draft"
      );
      assert.ok(callForPrice);
      assert.strictEqual(callForPrice.price, undefined);
      assert.strictEqual(callForPrice.salePrice, undefined);
    });

    it("duplicates products as draft with unique slug/sku and deletes cleanly", async () => {
      setCustomStoreDriver(createMemoryStorageDriver());
      const adapter = new CustomCmsAdapter({ logUnmapped: false });

      const copy = await duplicateCustomProduct("mobo-1");
      assert.ok(copy);
      assert.notStrictEqual(copy.id, "mobo-1");
      assert.strictEqual(copy.status, "draft");
      assert.ok(copy.title.endsWith("(Copy)"));
      assert.ok(copy.sku.endsWith("-COPY"));
      assert.ok(copy.slug.endsWith("-copy"));

      // Storefront does not show duplicated draft
      assert.strictEqual(await adapter.getProductBySlug(copy.slug), null);

      const deleted = await deleteCustomProduct(copy.id);
      assert.strictEqual(deleted, true);
      assert.strictEqual(await getCustomProductById(copy.id), null);
      assert.strictEqual(await deleteCustomProduct("non-existent-id"), false);
    });

    it("ensures unique slugs when creating products with colliding titles", async () => {
      setCustomStoreDriver(createMemoryStorageDriver());

      const first = await upsertCustomProduct({
        title: "Custom Gaming Mouse",
        categorySlug: "mouse",
        status: "publish",
      });
      const second = await upsertCustomProduct({
        title: "Custom Gaming Mouse",
        categorySlug: "mouse",
        status: "publish",
      });

      assert.strictEqual(first.slug, "custom-gaming-mouse");
      assert.strictEqual(second.slug, "custom-gaming-mouse-2");
    });
  });

  describe("Categories, Media CRUD, and Snapshot Export/Import/Reset", () => {
    it("supports category upsert and delete and reflects in adapter.getCategories()", async () => {
      setCustomStoreDriver(createMemoryStorageDriver());
      const adapter = new CustomCmsAdapter({ logUnmapped: false });

      const rawCatsBefore = await listCustomCategories();
      assert.strictEqual(rawCatsBefore.length, RAW_MOCK_CATEGORIES.length);

      const created = await upsertCustomCategory({
        name: "UPS & Surge Protectors",
        slug: "ups-power",
        parentSlug: "power",
        description: "Backup power supplies.",
      });
      assert.strictEqual(created.slug, "ups-power");

      const rawCatsAfter = await listCustomCategories();
      assert.strictEqual(rawCatsAfter.length, RAW_MOCK_CATEGORIES.length + 1);

      const cats = await adapter.getCategories();
      assert.ok(cats.some((c) => c.slug === "ups-power"));

      const updated = await upsertCustomCategory({
        id: created.id,
        name: "UPS Systems",
        slug: "ups-power",
      });
      assert.strictEqual(updated.name, "UPS Systems");

      assert.strictEqual(await deleteCustomCategory("ups-power"), true);
      assert.strictEqual(await deleteCustomCategory("ups-power"), false);
      const afterCats = await adapter.getCategories();
      assert.ok(!afterCats.some((c) => c.slug === "ups-power"));
    });

    it("supports media save, metadata listing, binary fetch, and deletion", async () => {
      setCustomStoreDriver(createMemoryStorageDriver());

      const payloadBytes = Buffer.from("hello-image-bytes").toString("base64");
      const saved = await saveCustomMedia({
        filename: "hero-gpu.webp",
        mimeType: "image/webp",
        bytesBase64: payloadBytes,
      });

      assert.ok(saved.id.startsWith("media-"));
      assert.strictEqual(saved.url, `/api/cms/media/${saved.id}`);
      assert.strictEqual(saved.sizeBytes, Buffer.from("hello-image-bytes").byteLength);

      const list = await listCustomMedia();
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].filename, "hero-gpu.webp");
      assert.strictEqual("bytesBase64" in list[0], false);

      const full = await getCustomMedia(saved.id);
      assert.ok(full);
      assert.strictEqual(full.bytesBase64, payloadBytes);

      assert.strictEqual(await deleteCustomMedia(saved.id), true);
      assert.strictEqual(await getCustomMedia(saved.id), null);
      assert.strictEqual((await listCustomMedia()).length, 0);
    });

    it("exports snapshot, imports snapshot, and resets store to seed", async () => {
      setCustomStoreDriver(createMemoryStorageDriver());
      const adapter = new CustomCmsAdapter({ logUnmapped: false });

      await upsertCustomProduct({
        id: "snap-prod-1",
        title: "Snapshot Test SSD",
        sku: "SNAP-SSD-1",
        categorySlug: "storage",
        status: "publish",
        price: 9900,
      });
      await saveCustomMedia({
        id: "snap-media-1",
        filename: "ssd.png",
        mimeType: "image/png",
        bytesBase64: "AQIDBA==",
      });

      const snapshot = await exportCustomStoreSnapshot();
      assert.ok(snapshot.products.some((p) => p.id === "snap-prod-1"));
      assert.strictEqual(snapshot.media.length, 1);

      const resetResult = await resetCustomStoreToSeed();
      assert.strictEqual(resetResult.products.length, RAW_MOCK_PRODUCTS.length);
      assert.strictEqual(resetResult.media.length, 0);
      assert.strictEqual(await getCustomProductById("snap-prod-1"), null);
      assert.strictEqual((await adapter.getAllProducts()).length, RAW_MOCK_PRODUCTS.length);

      await importCustomStoreSnapshot(snapshot);
      assert.ok(await getCustomProductById("snap-prod-1"));
      assert.ok(await getCustomMedia("snap-media-1"));
      assert.strictEqual(
        (await adapter.getAllProducts()).length,
        RAW_MOCK_PRODUCTS.length + 1
      );
    });
  });
});
