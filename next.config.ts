import createMDX from "@next/mdx";
import type { NextConfig } from "next";

// Baseline security headers applied to every response. A full nonce-based
// CSP belongs in proxy.ts (per Next.js's CSP guide) — not added here
// because layout.tsx ships an inline theme-bootstrap script that needs
// a per-request nonce. These headers are the cheap, portable wins.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Allow .mdx files to be imported and treated as modules.
  pageExtensions: ["js", "jsx", "ts", "tsx", "mdx"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
