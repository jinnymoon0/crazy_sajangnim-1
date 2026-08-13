import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";

/*
 * The shop is open to anyone, and so is the front of the blog: someone
 * arriving from a link should see what is being written about before
 * being asked for anything.
 *
 * An account is needed at the point of taking part — opening a post,
 * writing one, commenting, or sharing a find to the blog.
 *
 * Anyone sent away is sent back afterwards, so following a link to a
 * post, or pressing "Share on blog", lands where it was going once they
 * have signed in.
 */
/*
 * How many people have posted about each item, which the shop shows on
 * every card to anyone at all.
 *
 * Open on purpose, and the one thing below /api/blog that is. It
 * answers with product ids and integers — no titles, no authors, no
 * post contents — and the whole point of it is to reach the visitor who
 * has not signed in and does not yet know there is anybody here.
 * Requiring an account to be told a conversation exists would hide the
 * community from exactly the person it needs to reach.
 */
const OPEN_BLOG_PATHS = new Set(["/api/blog/product-counts"]);

function needsAccount(pathname: string): boolean {
  if (OPEN_BLOG_PATHS.has(pathname)) {
    return false;
  }

  return (
    /* "/blog" itself stays open; anything below it does not. */
    /^\/blog\/.+/.test(pathname) ||
    pathname === "/choose-username" ||
    pathname === "/api/blog" ||
    pathname.startsWith("/api/blog/")
  );
}

/*
 * Where the browser may load things from.
 *
 * Everything the page needs is named. Product photographs are the one
 * unbounded case — they come from whichever retailer is selling the
 * item, and that list changes every time a brand is added — so images
 * are allowed from any https origin and nothing else is.
 */
function policy(nonce: string): string {
  const posthog = "https://*.posthog.com";
  const supabase = "https://*.supabase.co";

  /*
   * Development needs two things production must never have: eval,
   * because the dev server compiles modules through it for source maps,
   * and a websocket for hot reload. Granting them only here keeps local
   * work possible without weakening what ships — a policy that makes
   * developing painful is a policy someone eventually deletes.
   */
  const isDev = process.env.NODE_ENV === "development";

  const devScript = isDev ? " 'unsafe-eval'" : "";
  const devConnect = isDev ? " ws: http://localhost:*" : "";

  return [
    "default-src 'self'",

    /*
     * The nonce is the point of doing this at all. Next injects inline
     * bootstrap scripts, so the alternative was 'unsafe-inline', which
     * permits exactly the injected script a policy exists to stop —
     * reassurance rather than protection.
     *
     * strict-dynamic lets a script we trusted load the ones it needs,
     * which is how the PostHog recorder arrives. The https: after it is
     * ignored by browsers that understand strict-dynamic and acts as
     * the fallback for those that do not.
     */
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'${devScript}`,

    /*
     * Styles stay loose. Injected CSS can reskin a page but cannot read
     * a session or call an API, and Next inlines critical CSS with no
     * nonce of its own — so the trade here is the opposite of scripts.
     */
    "style-src 'self' 'unsafe-inline'",

    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",

    /* Where the page may send data. The narrowest list that works. */
    `connect-src 'self' ${posthog} ${supabase}${devConnect}`,

    "media-src 'self' https:",
    "worker-src 'self' blob:",

    /* Nothing may embed this site, and it embeds nothing. */
    "frame-ancestors 'none'",
    "frame-src 'none'",

    /* No Flash-era plugins, and no rewriting where relative URLs point. */
    "object-src 'none'",
    "base-uri 'self'",

    /*
     * A form may only post back to this site. Without it, an injected
     * form is a one-line way to send a filled-in password somewhere
     * else, and nothing above would stop it.
     */
    "form-action 'self'",

    "upgrade-insecure-requests",
  ].join("; ");
}

export const proxy = auth((request: NextRequest & { auth?: unknown }) => {
  const { pathname, search } = request.nextUrl;

  const session = (request as { auth?: { user?: unknown } }).auth;

  if (needsAccount(pathname) && !session?.user) {
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
  }

  /*
   * Only documents carry a policy. An API response is not parsed as a
   * page, and giving each one a fresh nonce would make every catalog
   * read unique and so uncacheable — the edge cache in front of it is
   * what keeps the shop off a function on every poll.
   */
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const header = policy(nonce);

  /*
   * Set on the request as well as the response: that is how Next finds
   * the nonce and stamps it on the scripts it injects. Without it the
   * page loads a policy its own bootstrap violates, and nothing runs.
   */
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", header);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", header);

  return response;
});

export const config = {
  /*
   * Everything except the things a policy cannot apply to: Next's own
   * build output, images it has already optimised, and the static files
   * at the root. The auth gate inside still only acts on the handful of
   * paths that need an account.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
