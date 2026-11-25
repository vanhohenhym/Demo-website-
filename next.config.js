const fs = require("fs");
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  async redirects() {
    try {
      const redirectsFilePath = path.join(__dirname, "data", "redirects.json");
      if (fs.existsSync(redirectsFilePath)) {
        const raw = fs.readFileSync(redirectsFilePath, "utf8");
        const redirects = JSON.parse(raw);
        if (Array.isArray(redirects)) {
          return redirects
            .filter(
              (r) =>
                r &&
                typeof r.source === "string" &&
                r.source.startsWith("/") &&
                typeof r.destination === "string" &&
                r.destination.length > 0
            )
            .map((r) => ({
              source: r.source,
              destination: r.destination,
              statusCode: r.statusCode ?? (r.permanent === false ? 302 : 301),
            }));
        }
      }
    } catch (e) {
      console.warn("Could not load data/redirects.json:", e.message);
    }
    return [];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), camera=(), microphone=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
