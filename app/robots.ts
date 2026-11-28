import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/*",
        "/data-health",
        "/data-health/*",
        "/pc-builder?*",
        "/cart",
        "/checkout",
        "/compare",
        "/api/*",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
