import redirectsData from "./data/redirects.json" with { type: "json" };

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
    if (!Array.isArray(redirectsData)) {
      return [];
    }
    return redirectsData
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

export default nextConfig;
