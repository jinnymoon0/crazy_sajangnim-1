import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Catalog reads are served by the separate backend service
 * (crazy-sajangnim-backend). The browser keeps calling this path, and
 * the request is forwarded server-side so the service token never
 * reaches the client and the catalog stays behind the site's login.
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

  try {
    const response = await fetch(target, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (error) {
    console.error("Catalog service request failed:", error);

    return NextResponse.json(
      { error: "Unable to load the product catalog." },
      { status: 502 },
    );
  }
}
