import { NextResponse, type NextRequest } from "next/server";

/*
 * Site-wide login wall: every page requires a session.
 *
 * Presence of the Auth.js session cookie is checked here (fast, no
 * database); pages and APIs still resolve the real user server-side,
 * so a forged cookie only reaches a page that renders as logged out.
 *
 * Auth.js names its cookie differently on http (local dev) and https
 * (production) — check both.
 */
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) =>
    Boolean(request.cookies.get(name)?.value),
  );

  if (hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  /*
   * Everything requires login except:
   * - /login and the auth APIs (people must be able to sign in)
   * - /api/cron and /api/products (nightly catalog refresh runs
   *   without a browser session)
   * - Next.js internals and static assets
   */
  matcher: [
    "/((?!login|api/auth|api/cron|api/products|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
