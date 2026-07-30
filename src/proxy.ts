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
     * api/account is excluded because those routes authenticate
     * themselves and must answer with JSON — a redirect to the login
     * page would hand the browser HTML to parse.
     */
    "/((?!login|api/auth|api/account|api/cron|api/products|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
