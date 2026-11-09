import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Matches config/session.php's cookie name on the Laravel API. This is an
// *optimistic* check only (cookie presence, not validity - the proxy has no
// way to decrypt/verify a Laravel session cookie without a network call,
// which Next.js's own guidance says not to do here) to avoid a flash of
// protected UI - the real authorization check happens against the API
// itself (every request; see src/lib/auth-context.tsx's /auth/me call and
// src/app/dashboard/layout.tsx's redirect-if-unauthenticated effect).
// Relies on the API and this app sharing a cookie domain (both on
// "localhost" in dev; a shared parent domain, e.g. ".khadmatona.com", in
// production).
//
// Deliberately one-directional: only /dashboard requires the cookie.
// Redirecting *away* from /login when a cookie is merely present (not
// verified) previously caused an infinite loop for a stale cookie - present
// but no longer valid server-side - since /login would bounce to /dashboard,
// /auth/me would then correctly 401, the client would bounce back to
// /login, and the proxy would send it to /dashboard again, forever. Protecting
// /dashboard fails safe (worst case: one extra hop to /login); redirecting
// away from /login on presence alone does not, so that direction is gone.
const SESSION_COOKIE = "khadmatona-session";
const PROTECTED_PREFIX = "/dashboard";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname.startsWith(PROTECTED_PREFIX) && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
