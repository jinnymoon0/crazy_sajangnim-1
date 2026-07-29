import { NextResponse } from "next/server";

import { searchSearxng } from "@/lib/search/searxng";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter q is required." },
        { status: 400 },
      );
    }

    const results = await searchSearxng({
      query,
      language: "en-US",
    });

    return NextResponse.json({
      query,
      count: results.length,
      results: results.slice(0, 20),
    });
  } catch (error) {
    console.error("SearXNG test failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Search request failed.",
      },
      { status: 500 },
    );
  }
}
