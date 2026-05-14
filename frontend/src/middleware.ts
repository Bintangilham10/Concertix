import { NextRequest, NextResponse } from "next/server";

/**
 * CSP Nonce Middleware — Generates a unique nonce per request to replace
 * 'unsafe-inline' in script-src, mitigating XSS attacks.
 *
 * T7 Mitigation: Dynamic CSP with per-request nonce instead of static
 * 'unsafe-inline'. The nonce is propagated to the layout via request headers
 * so Next.js can inject it into all inline <script> tags.
 *
 * 'strict-dynamic' allows scripts loaded by nonce-trusted scripts (like our
 * Midtrans Snap loader) to execute without explicit whitelisting.
 */

const apiOrigin = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_API_URL ||
        "https://concertix-production.up.railway.app",
    ).origin;
  } catch {
    return "https://concertix-production.up.railway.app";
  }
})();

export function middleware(request: NextRequest) {
  // Generate a cryptographically random nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Build CSP with nonce instead of 'unsafe-inline' for script-src.
  // 'strict-dynamic' propagates trust to scripts loaded dynamically
  // (e.g. Midtrans Snap JS loaded via document.createElement("script")).
  // 'unsafe-inline' is kept as fallback for browsers that don't support nonces
  // (CSP Level 2+ ignores 'unsafe-inline' when a nonce is present).
  const cspDirectives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://app.sandbox.midtrans.com https://app.midtrans.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} https://app.sandbox.midtrans.com https://api.sandbox.midtrans.com https://app.midtrans.com https://api.midtrans.com`,
    "frame-src https://app.sandbox.midtrans.com https://app.midtrans.com",
    "form-action 'self' https://app.sandbox.midtrans.com https://app.midtrans.com",
    ...(apiOrigin.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
  ];

  const cspHeader = cspDirectives.join("; ");

  // Clone request headers and inject the nonce so layout.tsx can read it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set the CSP header on the response
  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}

export const config = {
  // Match all routes except static files, images, and Next.js internals
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
