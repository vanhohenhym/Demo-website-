import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { constructMetadata, normalizeBaseUrl } from "../../lib/seo/metadata.ts";

interface RedirectRule {
  source: string;
  destination: string;
  permanent?: boolean;
  statusCode?: number;
}

interface SecurityHeaderEntry {
  key: string;
  value: string;
}

interface HeaderRule {
  source: string;
  headers: SecurityHeaderEntry[];
}

interface NextConfigShape {
  redirects?: () => Promise<RedirectRule[]>;
  headers?: () => Promise<HeaderRule[]>;
}

const require = createRequire(import.meta.url);
const nextConfig = require("../../next.config.js") as NextConfigShape;

describe("SEO redirects, headers, and metadata verification", () => {
  it("validates data/redirects.json integrity and required redirect rules", () => {
    const filePath = path.resolve(process.cwd(), "data", "redirects.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);

    assert.ok(Array.isArray(parsed), "redirects.json must be an array");
    const entries = parsed as RedirectRule[];
    assert.equal(entries.length, 12, "redirects.json must contain all 12 rules");

    const seenSources = new Set<string>();
    for (const rule of entries) {
      assert.equal(typeof rule.source, "string");
      assert.ok(rule.source.startsWith("/"), `source must start with /: ${rule.source}`);
      assert.equal(typeof rule.destination, "string");
      assert.ok(
        rule.destination.startsWith("/"),
        `destination must start with /: ${rule.destination}`
      );
      assert.notEqual(rule.source, rule.destination, "self-redirects are invalid");
      assert.equal(seenSources.has(rule.source), false, `duplicate source: ${rule.source}`);
      seenSources.add(rule.source);
    }

    const bySource = new Map(entries.map((entry) => [entry.source, entry.destination]));
    assert.equal(bySource.get("/old-category/laptops"), "/category/laptop");
    assert.equal(bySource.get("/build-pc"), "/pc-builder");
    assert.equal(bySource.get("/cpus"), "/category/processor");
    assert.equal(bySource.get("/gpus"), "/category/graphics-card");
    assert.equal(bySource.get("/motherboards"), "/category/motherboard");
    assert.equal(bySource.get("/contact-us"), "/contact");
    assert.equal(bySource.get("/privacy"), "/privacy-policy");
    assert.equal(bySource.get("/terms-and-conditions"), "/terms");
    assert.equal(bySource.get("/offers"), "/category/component");
    assert.equal(bySource.get("/deals"), "/category/component");
    assert.equal(bySource.get("/account"), "/contact");
    assert.equal(bySource.get("/cart"), "/pc-builder");
  });

  it("nextConfig.redirects() emits statusCode 301 without permanent collision", async () => {
    assert.equal(typeof nextConfig.redirects, "function");
    const resolved = await nextConfig.redirects!();

    assert.equal(resolved.length, 12);
    for (const rule of resolved) {
      assert.equal(rule.statusCode, 301);
      assert.equal(
        Object.prototype.hasOwnProperty.call(rule, "permanent"),
        false,
        `redirect ${rule.source} must omit permanent when statusCode is specified`
      );
    }

    const mapped = new Map(resolved.map((rule) => [rule.source, rule]));
    const expectedRules: ReadonlyArray<[string, string]> = [
      ["/old-category/laptops", "/category/laptop"],
      ["/build-pc", "/pc-builder"],
      ["/cpus", "/category/processor"],
      ["/gpus", "/category/graphics-card"],
      ["/motherboards", "/category/motherboard"],
      ["/contact-us", "/contact"],
      ["/privacy", "/privacy-policy"],
      ["/terms-and-conditions", "/terms"],
      ["/offers", "/category/component"],
      ["/deals", "/category/component"],
      ["/account", "/contact"],
      ["/cart", "/pc-builder"],
    ];

    for (const [source, destination] of expectedRules) {
      assert.deepEqual(mapped.get(source), {
        source,
        destination,
        statusCode: 301,
      });
    }
  });

  it("nextConfig.headers() configures Referrer-Policy and Permissions-Policy", async () => {
    assert.equal(typeof nextConfig.headers, "function");
    const headerRules = await nextConfig.headers!();
    const globalRule = headerRules.find((rule) => rule.source === "/(.*)");

    assert.ok(globalRule, "expected global /(.*) header rule");
    const headerMap = new Map(globalRule.headers.map((h) => [h.key, h.value]));
    assert.equal(headerMap.get("Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.equal(
      headerMap.get("Permissions-Policy"),
      "geolocation=(), camera=(), microphone=()"
    );
  });

  it("constructMetadata() populates verification.google dynamically from NEXT_PUBLIC_GSC_VERIFICATION", () => {
    const previousToken = process.env.NEXT_PUBLIC_GSC_VERIFICATION;

    try {
      delete process.env.NEXT_PUBLIC_GSC_VERIFICATION;
      const withoutGsc = constructMetadata({ title: "Test Page", path: "/test" });
      assert.equal(withoutGsc.verification, undefined);

      process.env.NEXT_PUBLIC_GSC_VERIFICATION = "gsc-verification-token-abc123";
      const withGsc = constructMetadata({ title: "Test Page", path: "/test" });
      assert.deepEqual(withGsc.verification, {
        google: "gsc-verification-token-abc123",
      });
    } finally {
      if (previousToken === undefined) {
        delete process.env.NEXT_PUBLIC_GSC_VERIFICATION;
      } else {
        process.env.NEXT_PUBLIC_GSC_VERIFICATION = previousToken;
      }
    }
  });

  it("normalizeBaseUrl() and constructMetadata() strip trailing slashes without double-slash URLs", () => {
    assert.equal(normalizeBaseUrl("https://shop.example.com///"), "https://shop.example.com");
    assert.equal(normalizeBaseUrl("  https://shop.example.com/  "), "https://shop.example.com");
    assert.equal(normalizeBaseUrl(""), "http://localhost:3000");
    assert.equal(normalizeBaseUrl(undefined), "http://localhost:3000");

    const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example.com///";
      const meta = constructMetadata({
        title: "Components",
        path: "/category/component",
        canonicalPath: "/category/component",
        image: "/opengraph-image",
      });

      const canonical = String(meta.alternates?.canonical ?? "");
      const ogUrl = String(meta.openGraph?.url ?? "");
      const ogImages = Array.isArray(meta.openGraph?.images)
        ? meta.openGraph.images
        : meta.openGraph?.images
          ? [meta.openGraph.images]
          : [];
      const firstOgImage = ogImages[0];
      const ogImageUrl =
        typeof firstOgImage === "string"
          ? firstOgImage
          : firstOgImage instanceof URL
            ? firstOgImage.toString()
            : firstOgImage
              ? String(firstOgImage.url)
              : "";

      const twitterImages = Array.isArray(meta.twitter?.images)
        ? meta.twitter.images
        : meta.twitter?.images
          ? [meta.twitter.images]
          : [];
      const firstTwitterImage = twitterImages[0];
      const twitterImageUrl =
        typeof firstTwitterImage === "string"
          ? firstTwitterImage
          : firstTwitterImage instanceof URL
            ? firstTwitterImage.toString()
            : firstTwitterImage
              ? String(firstTwitterImage.url)
              : "";

      assert.equal(canonical, "https://shop.example.com/category/component");
      assert.equal(ogUrl, "https://shop.example.com/category/component");
      assert.equal(ogImageUrl, "https://shop.example.com/opengraph-image");
      assert.equal(twitterImageUrl, "https://shop.example.com/opengraph-image");

      for (const url of [canonical, ogUrl, ogImageUrl, twitterImageUrl]) {
        const afterHost = url.replace(/^https?:\/\//, "");
        assert.equal(
          afterHost.includes("//"),
          false,
          `URL must not contain // after host: ${url}`
        );
      }
    } finally {
      if (previousSiteUrl === undefined) {
        delete process.env.NEXT_PUBLIC_SITE_URL;
      } else {
        process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
      }
    }
  });
});
