import { NextRequest, NextResponse } from "next/server";

import { recordEvent, recordFailure } from "@/lib/analytics/events";

export const runtime = "nodejs";

/*
 * Deliberately not force-dynamic. This handler reads the query string,
 * so it is dynamic whatever it says here — but declaring it explicitly
 * stopped the edge honouring the Cache-Control set below: the response
 * came back as a bare "public" with s-maxage stripped, and every open
 * tab's five-minute poll ran a function to fetch bytes that had not
 * changed. The catalog turns over every four hours.
 */

/*
 * Catalog reads are served by the separate backend service
 * (crazy-sajangnim-backend). The browser keeps calling this path, and
 * the request is forwarded server-side so the service token never
 * reaches the client.
 */
export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL?.trim();

  if (!backendUrl) {
    console.error("BACKEND_URL is not configured.");

    return NextResponse.json(
      { error: "The catalog service is not configured." },
      { status: 500 },
    );
  }

  const target = new URL("/api/catalog/products", backendUrl);

  target.search = request.nextUrl.search;

  const token = process.env.BACKEND_API_TOKEN?.trim();

  /*
   * Timed on the server rather than in the browser. This is the request
   * the whole shop waits on, and a route that has grown slow looks the
   * same from outside as one that has started failing — an empty page —
   * while needing the opposite response.
   */
  const started = Date.now();

  const market = request.nextUrl.searchParams.get("market");
  const gender = request.nextUrl.searchParams.get("gender");

  try {
    const response = await fetch(target, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    const body = await response.text();

    /*
     * An upstream 500 is a failure even though the fetch itself
     * succeeded, so it is recorded as one rather than as a slow read.
     */
    void (response.ok
      ? recordEvent({
          kind: "latency",
          path: "/api/catalog/products",
          market,
          gender,
          durationMs: Date.now() - started,
          metadata: { operation: "catalog.products", bytes: body.length },
        })
      : recordFailure(
          "catalog.products",
          `the catalog service returned ${response.status}`,
          {
            path: "/api/catalog/products",
            market,
            gender,
            durationMs: Date.now() - started,
          },
        ));

    /*
     * The catalog is identical for every visitor — no cookie, no
     * session, and the service token is added here rather than sent by
     * the browser — so the edge can hold it and absorb the poll every
     * open tab makes.
     *
     * A failure is deliberately not cached. This route passes the
     * upstream status straight through, and a 401 or a 500 pinned at
     * the edge for five minutes would turn a momentary backend blip
     * into an outage that retrying could not clear.
     */
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
        "Cache-Control": response.ok
          ? "public, s-maxage=300, stale-while-revalidate=900"
          : "no-store",
      },
    });
  } catch (error) {
    console.error("Catalog service request failed:", error);

    void recordFailure(
      "catalog.products",
      error instanceof Error ? error.message : "unreachable",
      {
        path: "/api/catalog/products",
        market,
        gender,
        durationMs: Date.now() - started,
      },
    );

    return NextResponse.json(
      { error: "Unable to load the product catalog." },
      { status: 502 },
    );
  }
}
