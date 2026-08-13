import { NextResponse } from "next/server";

import { isMissingProductColumn } from "@/lib/blog/posts";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/*
 * How many people have posted about each item.
 *
 * This is what lets the shop show that a conversation exists before
 * anyone clicks. The community was reachable only by pressing a button
 * at the bottom of a card and hoping — a visitor had no way of knowing
 * whether anything was there at all, which made the busiest item on the
 * site look exactly like the emptiest.
 *
 * Ids only. No titles, no authors, nothing about who wrote what; this
 * is served to every visitor including signed-out ones, and a count is
 * all the shop needs.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("blog_posts")
      .select("product_id")
      .not("product_id", "is", null)
      .limit(2000);

    /* Before the migration nothing is filed against an item yet. */
    if (isMissingProductColumn(error)) {
      return NextResponse.json({ counts: {} });
    }

    if (error) {
      console.error("Product post counts failed:", error.message);

      return NextResponse.json({ counts: {} });
    }

    const counts: Record<string, number> = {};

    for (const row of (data ?? []) as { product_id: string | null }[]) {
      if (row.product_id) {
        counts[row.product_id] = (counts[row.product_id] ?? 0) + 1;
      }
    }

    return NextResponse.json(
      { counts },
      {
        headers: {
          /*
           * Held at the edge for a minute. Every card on every page asks
           * for this, and a number that is sixty seconds old is worth far
           * more than a function invocation per visitor per page.
           */
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Product post counts error:", error);

    return NextResponse.json({ counts: {} });
  }
}
