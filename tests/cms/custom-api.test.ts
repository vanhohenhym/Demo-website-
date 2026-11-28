import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  GET as getAuth,
  POST as postAuth,
  DELETE as deleteAuth,
} from "../../app/api/cms/auth/route.ts";
import {
  GET as getCategories,
  POST as postCategories,
  DELETE as deleteCategories,
} from "../../app/api/cms/categories/route.ts";
import {
  GET as getMediaList,
  POST as postMedia,
} from "../../app/api/cms/media/route.ts";
import {
  GET as getMediaById,
  DELETE as deleteMediaById,
} from "../../app/api/cms/media/[id]/route.ts";
import {
  GET as getProducts,
  POST as postProducts,
} from "../../app/api/cms/products/route.ts";
import {
  GET as getProductById,
  PATCH as patchProductById,
  DELETE as deleteProductById,
  POST as postProductAction,
} from "../../app/api/cms/products/[id]/route.ts";
import {
  GET as getSeed,
  POST as postSeed,
} from "../../app/api/cms/seed/route.ts";
import {
  CMS_ADMIN_COOKIE_NAME,
  DEFAULT_DEV_ADMIN_TOKEN,
  verifyAdminToken,
} from "../../lib/cms/admin-auth.ts";
import { CustomCmsAdapter } from "../../lib/cms/adapters/custom.ts";
import {
  createMemoryStorageDriver,
  resetCustomStoreDriver,
  setCustomStoreDriver,
} from "../../lib/cms/custom-store.ts";
import { isRenderableImageUrl } from "../../lib/cms/image-url.ts";

const TEST_ORIGIN = "http://localhost:3000";

function makeJsonRequest(
  path: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Request {
  return new Request(`${TEST_ORIGIN}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function extractCookiePair(setCookieHeader: string | null): string {
  assert.ok(setCookieHeader, "Expected Set-Cookie header");
  const pair = setCookieHeader.split(";")[0]?.trim() ?? "";
  assert.ok(
    pair.startsWith(`${CMS_ADMIN_COOKIE_NAME}=`),
    `Expected ${CMS_ADMIN_COOKIE_NAME} cookie, got: ${pair}`
  );
  return pair;
}

describe("Custom CMS API & Auth", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCmsToken = process.env.CMS_ADMIN_TOKEN;
  const originalHealthToken = process.env.DATA_HEALTH_TOKEN;

  beforeEach(() => {
    setCustomStoreDriver(createMemoryStorageDriver());
    delete process.env.CMS_ADMIN_TOKEN;
    delete process.env.DATA_HEALTH_TOKEN;
  });

  afterEach(() => {
    resetCustomStoreDriver();
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    if (originalCmsToken === undefined) {
      delete process.env.CMS_ADMIN_TOKEN;
    } else {
      process.env.CMS_ADMIN_TOKEN = originalCmsToken;
    }
    if (originalHealthToken === undefined) {
      delete process.env.DATA_HEALTH_TOKEN;
    } else {
      process.env.DATA_HEALTH_TOKEN = originalHealthToken;
    }
  });

  describe("isRenderableImageUrl", () => {
    it("allows /api/cms/media/<id> relative URLs while blocking protocol-relative and unsafe schemes", () => {
      assert.strictEqual(isRenderableImageUrl("/api/cms/media/media-123"), true);
      assert.strictEqual(isRenderableImageUrl("https://cdn.example.com/a.webp"), true);
      assert.strictEqual(isRenderableImageUrl("http://localhost:3000/img.png"), true);
      assert.strictEqual(isRenderableImageUrl("data:image/png;base64,AAAA"), true);

      assert.strictEqual(isRenderableImageUrl("//evil.example/a.png"), false);
      assert.strictEqual(isRenderableImageUrl("javascript:alert(1)"), false);
      assert.strictEqual(isRenderableImageUrl(""), false);
      assert.strictEqual(isRenderableImageUrl(undefined), false);
    });
  });

  describe("Auth guards & cookie/bearer verification", () => {
    it("enforces explicit token in production and falls back to dev token in non-production", async () => {
      assert.strictEqual(await verifyAdminToken(DEFAULT_DEV_ADMIN_TOKEN), true);
      assert.strictEqual(await verifyAdminToken("wrong-token"), false);

      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      assert.strictEqual(await verifyAdminToken(DEFAULT_DEV_ADMIN_TOKEN), false);

      process.env.CMS_ADMIN_TOKEN = "prod-secret-xyz";
      assert.strictEqual(await verifyAdminToken("prod-secret-xyz"), true);
      assert.strictEqual(await verifyAdminToken(DEFAULT_DEV_ADMIN_TOKEN), false);
    });

    it("returns 401 without credentials across protected endpoints and accepts cookie or bearer", async () => {
      const unauthTargets = [
        getProducts(new Request(`${TEST_ORIGIN}/api/cms/products`)),
        postProducts(
          makeJsonRequest("/api/cms/products", "POST", { title: "Test" })
        ),
        getProductById(
          new Request(`${TEST_ORIGIN}/api/cms/products/p1`),
          { params: Promise.resolve({ id: "p1" }) }
        ),
        patchProductById(
          makeJsonRequest("/api/cms/products/p1", "PATCH", { price: 100 }),
          { params: Promise.resolve({ id: "p1" }) }
        ),
        deleteProductById(
          new Request(`${TEST_ORIGIN}/api/cms/products/p1`, { method: "DELETE" }),
          { params: Promise.resolve({ id: "p1" }) }
        ),
        postProductAction(
          makeJsonRequest("/api/cms/products/p1", "POST", { action: "duplicate" }),
          { params: Promise.resolve({ id: "p1" }) }
        ),
        getCategories(new Request(`${TEST_ORIGIN}/api/cms/categories`)),
        postCategories(
          makeJsonRequest("/api/cms/categories", "POST", { name: "Test" })
        ),
        deleteCategories(
          new Request(`${TEST_ORIGIN}/api/cms/categories?slug=cpu`, {
            method: "DELETE",
          })
        ),
        getMediaList(new Request(`${TEST_ORIGIN}/api/cms/media`)),
        postMedia(
          makeJsonRequest("/api/cms/media", "POST", {
            filename: "a.png",
            mimeType: "image/png",
            dataBase64: "AAAA",
          })
        ),
        deleteMediaById(
          new Request(`${TEST_ORIGIN}/api/cms/media/m1`, { method: "DELETE" }),
          { params: Promise.resolve({ id: "m1" }) }
        ),
        getSeed(new Request(`${TEST_ORIGIN}/api/cms/seed`)),
        postSeed(makeJsonRequest("/api/cms/seed", "POST", { action: "reset" })),
      ];

      const responses = await Promise.all(unauthTargets);
      for (const res of responses) {
        assert.strictEqual(res.status, 401);
      }

      // Auth status before login
      const authBefore = await getAuth(new Request(`${TEST_ORIGIN}/api/cms/auth`));
      assert.strictEqual(authBefore.status, 200);
      assert.strictEqual((await authBefore.json()).authenticated, false);

      // Wrong token rejected
      const badLogin = await postAuth(
        makeJsonRequest("/api/cms/auth", "POST", { token: "invalid-token" })
      );
      assert.strictEqual(badLogin.status, 401);

      // Valid login sets httpOnly cookie
      const loginRes = await postAuth(
        makeJsonRequest("/api/cms/auth", "POST", {
          token: DEFAULT_DEV_ADMIN_TOKEN,
        })
      );
      assert.strictEqual(loginRes.status, 200);
      const setCookie = loginRes.headers.get("set-cookie");
      assert.ok(setCookie?.includes("HttpOnly"));
      const cookiePair = extractCookiePair(setCookie);

      // Cookie works on /api/cms/auth and /api/cms/products
      const authAfter = await getAuth(
        new Request(`${TEST_ORIGIN}/api/cms/auth`, {
          headers: { Cookie: cookiePair },
        })
      );
      assert.strictEqual((await authAfter.json()).authenticated, true);

      const listWithCookie = await getProducts(
        new Request(`${TEST_ORIGIN}/api/cms/products`, {
          headers: { Cookie: cookiePair },
        })
      );
      assert.strictEqual(listWithCookie.status, 200);

      // Bearer token works too
      const listWithBearer = await getProducts(
        new Request(`${TEST_ORIGIN}/api/cms/products`, {
          headers: { Authorization: `Bearer ${DEFAULT_DEV_ADMIN_TOKEN}` },
        })
      );
      assert.strictEqual(listWithBearer.status, 200);

      // Logout clears cookie
      const logoutRes = await deleteAuth(
        new Request(`${TEST_ORIGIN}/api/cms/auth`, { method: "DELETE" })
      );
      assert.strictEqual(logoutRes.status, 200);
      assert.ok(logoutRes.headers.get("set-cookie")?.includes("Max-Age=0"));
    });
  });

  describe("Product CRUD & draft isolation", () => {
    it("creates drafts isolated from public storefront, updates & duplicates, publishes, and deletes", async () => {
      const authHeader = {
        Authorization: `Bearer ${DEFAULT_DEV_ADMIN_TOKEN}`,
      };

      // Create draft product
      const createRes = await postProducts(
        makeJsonRequest(
          "/api/cms/products",
          "POST",
          {
            title: "AMD Ryzen 7 9800X3D Custom Test",
            sku: "TEST-CPU-9800X3D",
            slug: "amd-ryzen-7-9800x3d-custom-test",
            status: "draft",
            categorySlug: "processor",
            categoryName: "Processor",
            brandTaxonomy: "AMD",
            price: 62000,
            salePrice: 59500,
            availability: "in_stock",
            stockQuantity: 10,
            images: [{ url: "/api/cms/media/sample-cpu", alt: "Ryzen 7 9800X3D" }],
            explicitAttributes: [
              { key: "Socket", value: "AM5" },
              { key: "TDP", value: "120" },
            ],
            warranty: "3 Years",
            isFeatured: true,
          },
          authHeader
        )
      );
      assert.strictEqual(createRes.status, 201);
      const createdJson = (await createRes.json()) as {
        product: { id: string; slug: string; status: string };
        normalized: {
          brand: string;
          componentType: string;
          attributes: { socket?: { value: string }; tdp?: { value: number } };
        };
      };
      assert.strictEqual(createdJson.product.status, "draft");
      assert.strictEqual(createdJson.normalized.brand, "AMD");
      assert.strictEqual(createdJson.normalized.componentType, "cpu");
      assert.strictEqual(createdJson.normalized.attributes.socket?.value, "AM5");
      assert.strictEqual(createdJson.normalized.attributes.tdp?.value, 120);

      // Verify draft isolation on public CustomCmsAdapter vs preview helper
      const adapter = new CustomCmsAdapter({ logUnmapped: false });
      try {
        const publicMatch = await adapter.getProductBySlug(createdJson.product.slug);
        assert.strictEqual(publicMatch, null);

        const allPublished = await adapter.getAllProducts();
        assert.strictEqual(
          allPublished.some((p) => p.id === createdJson.product.id),
          false
        );

        const previewMatch = await adapter.getProductPreviewBySlug(
          createdJson.product.slug
        );
        assert.ok(previewMatch);
        assert.strictEqual(previewMatch.status, "draft");
        assert.strictEqual(previewMatch.product.id, createdJson.product.id);

        // Filter API by status=draft and q=
        const draftListRes = await getProducts(
          new Request(
            `${TEST_ORIGIN}/api/cms/products?status=draft&q=9800X3D`,
            { headers: authHeader }
          )
        );
        assert.strictEqual(draftListRes.status, 200);
        const draftList = (await draftListRes.json()) as {
          total: number;
          products: Array<{ id: string }>;
        };
        assert.strictEqual(draftList.total, 1);
        assert.strictEqual(draftList.products[0]?.id, createdJson.product.id);

        // Duplicate product (always clones as draft)
        const dupRes = await postProductAction(
          makeJsonRequest(
            `/api/cms/products/${createdJson.product.id}`,
            "POST",
            { action: "duplicate" },
            authHeader
          ),
          { params: Promise.resolve({ id: createdJson.product.id }) }
        );
        assert.strictEqual(dupRes.status, 201);
        const dupJson = (await dupRes.json()) as {
          product: { id: string; sku: string; status: string };
        };
        assert.notStrictEqual(dupJson.product.id, createdJson.product.id);
        assert.strictEqual(dupJson.product.status, "draft");
        assert.ok(dupJson.product.sku.includes("COPY"));

        // Publish original product via PATCH
        const patchRes = await patchProductById(
          makeJsonRequest(
            `/api/cms/products/${createdJson.product.id}`,
            "PATCH",
            { status: "publish", salePrice: 58000 },
            authHeader
          ),
          { params: Promise.resolve({ id: createdJson.product.id }) }
        );
        assert.strictEqual(patchRes.status, 200);
        const patched = (await patchRes.json()) as {
          product: { status: string; salePrice: number };
        };
        assert.strictEqual(patched.product.status, "publish");
        assert.strictEqual(patched.product.salePrice, 58000);

        const nowLive = await adapter.getProductBySlug(createdJson.product.slug);
        assert.ok(nowLive);
        assert.strictEqual(nowLive.salePrice, 58000);

        // Delete original and duplicate
        const del1 = await deleteProductById(
          new Request(`${TEST_ORIGIN}/api/cms/products/${createdJson.product.id}`, {
            method: "DELETE",
            headers: authHeader,
          }),
          { params: Promise.resolve({ id: createdJson.product.id }) }
        );
        assert.strictEqual(del1.status, 200);

        const del2 = await deleteProductById(
          new Request(`${TEST_ORIGIN}/api/cms/products/${dupJson.product.id}`, {
            method: "DELETE",
            headers: authHeader,
          }),
          { params: Promise.resolve({ id: dupJson.product.id }) }
        );
        assert.strictEqual(del2.status, 200);

        const afterDelete = await getProductById(
          new Request(`${TEST_ORIGIN}/api/cms/products/${createdJson.product.id}`, {
            headers: authHeader,
          }),
          { params: Promise.resolve({ id: createdJson.product.id }) }
        );
        assert.strictEqual(afterDelete.status, 404);
      } finally {
        adapter.dispose();
      }
    });
  });

  describe("Categories, Media & Seed endpoints", () => {
    it("validates media uploads, serves public image bytes with immutable cache headers, and deletes with auth", async () => {
      const authHeader = {
        Authorization: `Bearer ${DEFAULT_DEV_ADMIN_TOKEN}`,
      };

      // Reject unsupported MIME type
      const badMime = await postMedia(
        makeJsonRequest(
          "/api/cms/media",
          "POST",
          {
            filename: "bad.svg",
            mimeType: "image/svg+xml",
            dataBase64: Buffer.from("<svg/>").toString("base64"),
          },
          authHeader
        )
      );
      assert.strictEqual(badMime.status, 400);

      // Reject > 2 MB payload
      const oversizedBytes = Buffer.alloc(2 * 1024 * 1024 + 16, 0x41);
      const tooLarge = await postMedia(
        makeJsonRequest(
          "/api/cms/media",
          "POST",
          {
            filename: "huge.png",
            mimeType: "image/png",
            dataBase64: oversizedBytes.toString("base64"),
          },
          authHeader
        )
      );
      assert.strictEqual(tooLarge.status, 413);

      // Upload valid PNG via JSON base64
      const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3]);
      const uploadJsonRes = await postMedia(
        makeJsonRequest(
          "/api/cms/media",
          "POST",
          {
            filename: "gpu-photo.png",
            mimeType: "image/png",
            dataBase64: pngBytes.toString("base64"),
          },
          authHeader
        )
      );
      assert.strictEqual(uploadJsonRes.status, 201);
      const uploaded = (await uploadJsonRes.json()) as {
        media: { id: string; url: string; mimeType: string; sizeBytes: number };
      };
      assert.strictEqual(uploaded.media.url, `/api/cms/media/${uploaded.media.id}`);
      assert.strictEqual(uploaded.media.mimeType, "image/png");
      assert.strictEqual(uploaded.media.sizeBytes, pngBytes.byteLength);

      // Upload via multipart/form-data
      const formData = new FormData();
      formData.append(
        "file",
        new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "card.jpg", {
          type: "image/jpeg",
        })
      );
      const uploadFormRes = await postMedia(
        new Request(`${TEST_ORIGIN}/api/cms/media`, {
          method: "POST",
          headers: authHeader,
          body: formData,
        })
      );
      assert.strictEqual(uploadFormRes.status, 201);

      // List media (metadata only)
      const listRes = await getMediaList(
        new Request(`${TEST_ORIGIN}/api/cms/media`, { headers: authHeader })
      );
      assert.strictEqual(listRes.status, 200);
      const listJson = (await listRes.json()) as {
        media: Array<Record<string, unknown>>;
      };
      assert.strictEqual(listJson.media.length, 2);
      assert.strictEqual("bytesBase64" in (listJson.media[0] ?? {}), false);

      // Public GET /api/cms/media/[id] WITHOUT auth returns bytes + Cache-Control
      const publicGet = await getMediaById(
        new Request(`${TEST_ORIGIN}${uploaded.media.url}`),
        { params: Promise.resolve({ id: uploaded.media.id }) }
      );
      assert.strictEqual(publicGet.status, 200);
      assert.strictEqual(publicGet.headers.get("content-type"), "image/png");
      assert.strictEqual(
        publicGet.headers.get("cache-control"),
        "public, max-age=31536000, immutable"
      );
      const fetchedBytes = Buffer.from(await publicGet.arrayBuffer());
      assert.deepStrictEqual(fetchedBytes, pngBytes);

      // Delete media
      const delRes = await deleteMediaById(
        new Request(`${TEST_ORIGIN}${uploaded.media.url}`, {
          method: "DELETE",
          headers: authHeader,
        }),
        { params: Promise.resolve({ id: uploaded.media.id }) }
      );
      assert.strictEqual(delRes.status, 200);

      const afterDel = await getMediaById(
        new Request(`${TEST_ORIGIN}${uploaded.media.url}`),
        { params: Promise.resolve({ id: uploaded.media.id }) }
      );
      assert.strictEqual(afterDel.status, 404);
    });

    it("manages categories and exports/imports/resets snapshots via /api/cms/seed", async () => {
      const authHeader = {
        Authorization: `Bearer ${DEFAULT_DEV_ADMIN_TOKEN}`,
      };

      const catCreate = await postCategories(
        makeJsonRequest(
          "/api/cms/categories",
          "POST",
          {
            name: "Capture Cards",
            slug: "capture-cards",
            parentSlug: "accessories",
            description: "Streaming and HDMI capture hardware",
          },
          authHeader
        )
      );
      assert.strictEqual(catCreate.status, 201);

      const catList = await getCategories(
        new Request(`${TEST_ORIGIN}/api/cms/categories`, { headers: authHeader })
      );
      assert.strictEqual(catList.status, 200);
      const catsJson = (await catList.json()) as {
        categories: Array<{ slug: string }>;
      };
      assert.ok(catsJson.categories.some((c) => c.slug === "capture-cards"));

      const exportRes = await getSeed(
        new Request(`${TEST_ORIGIN}/api/cms/seed`, { headers: authHeader })
      );
      assert.strictEqual(exportRes.status, 200);
      const exportedSnapshot = (await exportRes.json()) as {
        version: number;
        categories: Array<{ slug: string }>;
        products: unknown[];
      };
      assert.strictEqual(exportedSnapshot.version, 1);
      assert.ok(
        exportedSnapshot.categories.some((c) => c.slug === "capture-cards")
      );

      // Reset wipes custom additions back to seed
      const resetRes = await postSeed(
        makeJsonRequest(
          "/api/cms/seed",
          "POST",
          { action: "reset" },
          authHeader
        )
      );
      assert.strictEqual(resetRes.status, 200);
      const resetBody = (await resetRes.json()) as {
        ok: boolean;
        snapshot: { categories: Array<{ slug: string }> };
      };
      assert.strictEqual(resetBody.ok, true);
      assert.strictEqual(
        resetBody.snapshot.categories.some((c) => c.slug === "capture-cards"),
        false
      );

      // Re-import exported snapshot restores capture-cards
      const importRes = await postSeed(
        makeJsonRequest(
          "/api/cms/seed",
          "POST",
          { action: "import", snapshot: exportedSnapshot },
          authHeader
        )
      );
      assert.strictEqual(importRes.status, 200);
      const importBody = (await importRes.json()) as {
        ok: boolean;
        snapshot: { categories: Array<{ slug: string }> };
      };
      assert.strictEqual(importBody.ok, true);
      assert.ok(
        importBody.snapshot.categories.some((c) => c.slug === "capture-cards")
      );

      // Delete category
      const catDel = await deleteCategories(
        new Request(`${TEST_ORIGIN}/api/cms/categories?slug=capture-cards`, {
          method: "DELETE",
          headers: authHeader,
        })
      );
      assert.strictEqual(catDel.status, 200);
    });
  });
});
