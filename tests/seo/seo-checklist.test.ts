import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";
import type { MetadataRoute } from "next";
import {
  BASE_URL,
  SITE_NAME,
  constructMetadata,
} from "../../lib/seo/metadata.ts";
import {
  getCmsAdapter,
  matchesCategorySlug,
  toCatalogProduct,
} from "../../lib/cms/index.ts";
import { brandVisibility } from "../../lib/logic/brand-visibility.ts";
import type { Product } from "../../lib/cms/types.ts";

// Resolve Next.js `@/` tsconfig path aliases and extensionless relative TS imports under Node 24
registerHooks({
  resolve(specifier, context, nextResolve) {
    let base: string | null = null;
    if (specifier.startsWith("@/")) {
      base = path.resolve(process.cwd(), specifier.slice(2));
    } else if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[a-z0-9]+$/i.test(specifier) &&
      context.parentURL?.startsWith("file:")
    ) {
      base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }

    if (base) {
      const candidates = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        path.join(base, "index.ts"),
        path.join(base, "index.tsx"),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const { default: robots } = (await import("../../app/robots.ts")) as {
  default: () => MetadataRoute.Robots;
};
const { default: sitemap, SITEMAP_PARENT_CATEGORIES } = (await import("../../app/sitemap.ts")) as {
  default: () => Promise<MetadataRoute.Sitemap>;
  SITEMAP_PARENT_CATEGORIES: readonly string[];
};
const { getOrganizationSchema, getProductSchema, getItemListSchema } =
  (await import("../../lib/seo/schema.ts")) as {
    getOrganizationSchema: () => {
      "@context": string;
      "@type": string;
      name: string;
      url: string;
      logo: string;
      contactPoint: unknown[];
      sameAs: string[];
    };
    getProductSchema: (product: Product) => {
      "@context": string;
      "@type": string;
      name: string;
      image?: string;
      sku: string;
      brand: { "@type": string; name: string };
      offers?: {
        "@type": string;
        priceCurrency: string;
        url: string;
        availability: string;
      };
    };
    getItemListSchema: (
      listName: string,
      items: Array<{ name: string; slug: string; position: number }>
    ) => {
      "@context": string;
      "@type": string;
      name: string;
      itemListElement: Array<{
        "@type": string;
        position: number;
        url: string;
        name: string;
      }>;
    };
  };

describe("SEO checklist & production readiness", () => {
  describe("robots.ts", () => {
    it("disallows internal/non-canonical routes and declares sitemap", () => {
      const config = robots();
      const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;

      assert.ok(rules, "robots() must return at least one rule");
      assert.equal(rules.userAgent, "*");
      assert.equal(rules.allow, "/");

      const disallowed = Array.isArray(rules.disallow)
        ? rules.disallow
        : rules.disallow
          ? [rules.disallow]
          : [];

      for (const expected of [
        "/data-health",
        "/pc-builder?*",
        "/cart",
        "/checkout",
        "/compare",
        "/api/*",
      ]) {
        assert.ok(
          disallowed.includes(expected),
          `robots.disallow must include ${expected}`
        );
      }

      assert.equal(config.sitemap, `${BASE_URL}/sitemap.xml`);
    });
  });

  describe("sitemap.ts", () => {
    it("includes static, non-empty category, indexable brand, and active product URLs without disallowed paths", async () => {
      const entries = await sitemap();
      const urls = entries.map((entry) => entry.url);

      assert.ok(urls.includes(`${BASE_URL}/`), "must include root URL");
      for (const staticPath of [
        "/pc-builder",
        "/contact",
        "/privacy-policy",
        "/terms",
      ]) {
        assert.ok(
          urls.includes(`${BASE_URL}${staticPath}`),
          `must include static page ${staticPath}`
        );
      }

      const adapter = getCmsAdapter();
      const [categories, products] = await Promise.all([
        adapter.getCategories(),
        adapter.getAllProducts(),
      ]);

      const categorySlugs: string[] = [];
      const seenSlugs = new Set<string>(["all"]);
      for (const category of categories) {
        if (!seenSlugs.has(category.slug)) {
          seenSlugs.add(category.slug);
          categorySlugs.push(category.slug);
        }
      }
      for (const parentSlug of SITEMAP_PARENT_CATEGORIES) {
        if (!seenSlugs.has(parentSlug)) {
          seenSlugs.add(parentSlug);
          categorySlugs.push(parentSlug);
        }
      }

      // Ensure zero duplicate URLs in sitemap.xml
      assert.equal(new Set(urls).size, urls.length, "sitemap must not contain duplicate URLs");

      for (const parentSlug of SITEMAP_PARENT_CATEGORIES) {
        assert.ok(
          urls.includes(`${BASE_URL}/category/${encodeURIComponent(parentSlug)}`),
          `populated parent category ${parentSlug} must be in sitemap`
        );
      }

      for (const categorySlug of categorySlugs) {
        const catalogProducts = products.map((p) => {
          const projected = toCatalogProduct(p, false);
          return matchesCategorySlug(p, categorySlug)
            ? { ...projected, categorySlug }
            : projected;
        });
        const vis = brandVisibility({
          categorySlug,
          products: catalogProducts,
          minBrandProducts: 1,
          indexMinProducts: 3,
        });
        const categoryUrl = `${BASE_URL}/category/${encodeURIComponent(categorySlug)}`;
        if (vis.totalCategoryProducts >= 1) {
          assert.ok(
            urls.includes(categoryUrl),
            `non-empty category ${categorySlug} must be in sitemap`
          );
        } else {
          assert.equal(
            urls.includes(categoryUrl),
            false,
            `empty category ${categorySlug} must not be in sitemap`
          );
        }

        for (const brand of vis.brands) {
          const brandUrl = `${BASE_URL}/category/${encodeURIComponent(categorySlug)}/${encodeURIComponent(brand.brandSlug)}`;
          if (brand.indexable) {
            assert.ok(
              brand.count >= 3 && brand.brandSlug !== "other",
              `indexable brand ${brand.brandSlug} must have >= 3 products and not be "other"`
            );
            assert.ok(
              urls.includes(brandUrl),
              `indexable brand ${brandUrl} must be in sitemap`
            );
          } else {
            assert.equal(
              urls.includes(brandUrl),
              false,
              `non-indexable brand ${brandUrl} must not be in sitemap`
            );
          }
        }
      }

      for (const product of products) {
        assert.ok(
          urls.includes(`${BASE_URL}/product/${encodeURIComponent(product.slug)}`),
          `active product ${product.slug} must be in sitemap`
        );
      }

      for (const url of urls) {
        assert.equal(
          url.includes("/data-health") ||
            url.includes("/compare") ||
            url.includes("/cart") ||
            url.includes("/pc-builder?"),
          false,
          `sitemap must not include disallowed URL: ${url}`
        );
        assert.equal(
          /\/category\/[^/]+\/other$/.test(url),
          false,
          `sitemap must not include "other" brand URL: ${url}`
        );
      }
    });
  });

  describe("lib/seo/schema.ts", () => {
    it("getOrganizationSchema() returns valid Organization JSON-LD", () => {
      const schema = getOrganizationSchema();
      assert.equal(schema["@context"], "https://schema.org");
      assert.equal(schema["@type"], "Organization");
      assert.equal(schema.name, SITE_NAME);
      assert.equal(schema.url, BASE_URL);
      assert.equal(schema.logo, `${BASE_URL}/opengraph-image`);
      assert.ok(Array.isArray(schema.contactPoint) && schema.contactPoint.length > 0);
      assert.ok(Array.isArray(schema.sameAs) && schema.sameAs.length > 0);
    });

    it("getProductSchema() includes Offer, Brand, and schema.org availability", async () => {
      const adapter = getCmsAdapter();
      const products = await adapter.getAllProducts();
      const pricedProduct = products.find((p) => p.price !== undefined);
      assert.ok(pricedProduct, "mock CMS must have at least one priced product");

      const schema = getProductSchema(pricedProduct);
      assert.equal(schema["@context"], "https://schema.org");
      assert.equal(schema["@type"], "Product");
      assert.equal(schema.name, pricedProduct.name);
      assert.equal(schema.sku, pricedProduct.sku);
      assert.deepEqual(schema.brand, {
        "@type": "Brand",
        name: pricedProduct.brand,
      });

      assert.ok(schema.offers, "priced product must include offers");
      assert.equal(schema.offers["@type"], "Offer");
      assert.equal(schema.offers.priceCurrency, "BDT");
      assert.equal(
        schema.offers.url,
        `${BASE_URL}/product/${pricedProduct.slug}`
      );
      assert.ok(
        typeof schema.offers.availability === "string" &&
          schema.offers.availability.startsWith("https://schema.org/"),
        "Offer availability must be a schema.org URL"
      );

      // Relative mock /images/products/*.png image must omit image key completely
      const relativeImageProduct: Product = {
        ...pricedProduct,
        images: [{ url: "/images/products/mock-cpu.png", alt: pricedProduct.name }],
      };
      const relativeSchema = getProductSchema(relativeImageProduct);
      assert.equal(
        Object.prototype.hasOwnProperty.call(relativeSchema, "image"),
        false,
        "relative /images/products/*.png URL must omit image key"
      );
      assert.equal(relativeSchema.image, undefined);

      // Absolute https:// image must be preserved
      const absoluteImageUrl = "https://cdn.example.com/products/cpu.jpg";
      const absoluteImageProduct: Product = {
        ...pricedProduct,
        images: [{ url: absoluteImageUrl, alt: pricedProduct.name }],
      };
      const absoluteSchema = getProductSchema(absoluteImageProduct);
      assert.equal(absoluteSchema.image, absoluteImageUrl);
    });

    it("getItemListSchema() returns valid ItemList JSON-LD with positions", () => {
      const schema = getItemListSchema("Processors", [
        { name: "AMD Ryzen 7 7800X3D", slug: "amd-ryzen-7-7800x3d", position: 1 },
        { name: "Intel Core i9-14900K", slug: "intel-core-i9-14900k", position: 2 },
      ]);

      assert.equal(schema["@context"], "https://schema.org");
      assert.equal(schema["@type"], "ItemList");
      assert.equal(schema.name, "Processors");
      assert.equal(schema.itemListElement.length, 2);
      assert.deepEqual(schema.itemListElement[0], {
        "@type": "ListItem",
        position: 1,
        url: `${BASE_URL}/product/amd-ryzen-7-7800x3d`,
        name: "AMD Ryzen 7 7800X3D",
      });
    });
  });

  describe("lib/seo/metadata.ts", () => {
    it("constructMetadata() builds clean canonical, noIndex robots, OG, and Twitter fields", () => {
      const meta = constructMetadata({
        title: "Processors",
        description: "Shop desktop processors.",
        path: "/category/processor?sort=price_asc",
        canonicalPath: "/category/processor",
        noIndex: true,
      });

      assert.equal(meta.title, `Processors | ${SITE_NAME}`);
      assert.equal(meta.description, "Shop desktop processors.");
      assert.equal(
        meta.alternates?.canonical,
        `${BASE_URL}/category/processor`
      );

      assert.deepEqual(meta.robots, {
        index: false,
        follow: true,
        googleBot: {
          index: false,
          follow: true,
        },
      });

      assert.equal(meta.openGraph?.title, `Processors | ${SITE_NAME}`);
      assert.equal(meta.openGraph?.description, "Shop desktop processors.");
      assert.equal(meta.openGraph?.url, `${BASE_URL}/category/processor`);
      assert.equal(meta.openGraph?.siteName, SITE_NAME);

      assert.equal(meta.twitter?.title, `Processors | ${SITE_NAME}`);
      assert.equal(meta.twitter?.description, "Shop desktop processors.");
      assert.ok(
        Array.isArray(meta.twitter?.images) && meta.twitter.images.length === 1
      );
    });
  });
});
