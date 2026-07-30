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
    "/((?!login|api/auth|api/cron|api/products|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
