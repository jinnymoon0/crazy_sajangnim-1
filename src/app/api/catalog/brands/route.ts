import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Brand filters come from the product service, so brands added in the
 * admin appear in the sidebar without a deploy. Forwarded server-side
 * so the service token stays off the client.
 */
export async function GET() {
  const backendUrl = process.env.BACKEND_URL?.trim();

  if (!backendUrl) {
    return NextResponse.json({ brands: [] });
  }

  const token = process.env.BACKEND_API_TOKEN?.trim();

  try {
    const response = await fetch(new URL("/api/brands", backendUrl), {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      console.error("Brand list request failed:", response.status);

      return NextResponse.json({ brands: [] });
    }

    const body = (await response.json()) as { brands?: unknown };

    return NextResponse.json(
      { brands: body.brands ?? [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      },
    );
  } catch (error) {
    console.error("Brand list request failed:", error);

    return NextResponse.json({ brands: [] });
  }
}
