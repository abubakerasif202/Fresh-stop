import type { NextConfig } from "next";

const IMMUTABLE_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  // Demo deployments bundle a read-only SQLite snapshot with every DB-backed route.
  outputFileTracingIncludes: {
    "/**/*": ["./prisma/demo.db"]
  },
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
        source: "/products/:path*",
        headers: [{ key: "Cache-Control", value: IMMUTABLE_CACHE }]
      },
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: IMMUTABLE_CACHE }]
      }
    ];
  }
};

export default nextConfig;
