import type { NextConfig } from "next";

const IMMUTABLE_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // Keep catalogue descriptions in <head> for browsers and crawlers. The list
  // loading boundary is scoped separately so missing details can return 404.
  htmlLimitedBots: /.*/,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "fruitezy.com.au" }
    ]
  },
  async headers() {
    return [
      {
        source: "/products/:file(.*\\.webp)",
        headers: [{ key: "Cache-Control", value: IMMUTABLE_CACHE }]
      },
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: IMMUTABLE_CACHE }]
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ]
      },
      {
        source: "/order-confirmation/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" }
        ]
      }
    ];
  }
};

export default nextConfig;
