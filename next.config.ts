import type { NextConfig } from "next";

const IMMUTABLE_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const isDev = process.env.NODE_ENV !== "production";

// Next injects inline bootstrap scripts, so script-src needs 'unsafe-inline'
// (a per-request nonce would force every page to render dynamically).
// Stripe Checkout is a full-page redirect; Stripe hosts are allowed for
// stripe-js should it be added later. Everything else is locked down.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://cdn.shopify.com https://fruitezy.com.au",
  "font-src 'self' data:",
  `connect-src 'self' https://api.stripe.com${isDev ? " ws: wss:" : ""}`,
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  ...(isDev ? [] : ["upgrade-insecure-requests"])
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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
