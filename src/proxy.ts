import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isRequestAuthenticated } from "@/lib/auth";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanism, new
 * name/export — see node_modules/next/dist/docs/.../proxy.md).
 */

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // The UI kit (Base UI) positions popovers/dialogs via inline `style`
    // attributes at runtime; CSP nonces don't cover style *attributes*
    // (only <style> elements), so this needs 'unsafe-inline'. script-src
    // stays strictly nonce-based, which is where it matters most.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fresh per request — required for the nonce-based CSP below (see
  // node_modules/next/dist/docs/.../content-security-policy.md).
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  function withCsp(response: NextResponse): NextResponse {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  if (pathname === "/login") {
    return withCsp(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  if (await isRequestAuthenticated(request)) {
    return withCsp(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  if (pathname.startsWith("/api/")) {
    return withCsp(
      NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    );
  }

  const loginUrl = new URL("/login", request.url);
  return withCsp(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: ["/((?!p/|robots\\.txt$|favicon\\.ico$|_next/).*)"],
};
