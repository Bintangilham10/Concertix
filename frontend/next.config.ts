import type { NextConfig } from "next";

const apiOrigin = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_API_URL || "https://concertix-production.up.railway.app",
    ).origin;
  } catch {
    return "https://concertix-production.up.railway.app";
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' https://app.sandbox.midtrans.com https://app.midtrans.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} https://app.sandbox.midtrans.com https://api.sandbox.midtrans.com https://app.midtrans.com https://api.midtrans.com`,
  "frame-src https://app.sandbox.midtrans.com https://app.midtrans.com",
  "form-action 'self' https://app.sandbox.midtrans.com https://app.midtrans.com",
  ...(apiOrigin.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
