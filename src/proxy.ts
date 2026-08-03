import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const proxy = auth((request) => {
  if (request.auth?.user) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);

  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: [
    /*
     * api/account and api/contact are excluded because those routes
     * authenticate themselves and must answer with JSON — a redirect to
     * the login page would hand the browser HTML to parse. Worse for a
     * POST: a 307 keeps the method, so the login page would answer 200
     * and a send would look like it had succeeded.
     */
    "/((?!login|api/auth|api/account|api/contact|api/cron|api/products|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
