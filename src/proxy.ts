import { NextResponse } from "next/server";

import { auth } from "@/auth";

/*
 * The shop is open to anyone. The blog is where people write under a
 * name, so it needs an account — reading it, posting to it, and
 * commenting alike.
 *
 * Anyone sent away is sent back afterwards, so following a link to a
 * post, or pressing "Share on blog", lands where it was going once they
 * have signed in.
 */
export const proxy = auth((request) => {
  if (request.auth?.user) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;

  /*
   * The blog's own API answers in JSON, and its callers handle a
   * refusal. Handing them a login page would be parsed as nonsense —
   * and on a POST a 307 keeps the method, so the login page would
   * answer 200 and the write would look as though it had worked.
   */
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);

  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
});

export const config = {
  /*
   * Only what needs an account. Everything else — the shop, the catalog
   * it reads, the contact box — is reachable signed out, and the routes
   * that still need a session check for one themselves.
   */
  matcher: ["/blog", "/blog/:path*", "/choose-username", "/api/blog/:path*"],
};
