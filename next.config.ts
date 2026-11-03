import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so a lockfile in a parent directory cannot be
  // mistaken for this project (breaks Turbopack on Windows).
  turbopack: {
    root: process.cwd(),
  },

  // Emits a self-contained .next/standalone bundle — required for small
  // Docker images on Coolify / Fly.io / any VPS.
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,

  // Keep the native `pg` driver out of the client bundle.
  serverExternalPackages: ["pg"],

  // Route handlers read the full multipart body so they can reject files over
  // 10 MB with a clear 413 instead of receiving a truncated body from proxy.
  experimental: {
    proxyClientMaxBodySize: "12mb",
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },

  // Security headers applied to every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Conservative CSP: no framing, plugins or <base> hijacking. It does
          // not restrict scripts/styles, so Next.js, login and uploads work.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
