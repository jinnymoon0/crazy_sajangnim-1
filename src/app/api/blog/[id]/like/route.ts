import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/api-helpers";
import { getAuthState } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isMissingTableError(error: { code?: string }): boolean {
  return error.code === "42P01" || error.code === "PGRST205";
}

async function countLikes(postId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("blog_post_likes")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

/*
 * Turn this reader's like on or off. The unique constraint on
 * (post_id, user_id) is what actually keeps it to one per person, so a
 * double tap or a second tab cannot count twice.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 },
      );
    }

    const state = await getAuthState();

    if (!state.authenticated || !state.userId || !state.username) {
      return NextResponse.json(
        { error: "Please sign in to like a post." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: existing, error: readError } = await supabase
      .from("blog_post_likes")
      .select("id")
      .eq("post_id", id)
      .eq("user_id", state.userId)
      .maybeSingle();

    if (readError) {
      if (isMissingTableError(readError)) {
        console.error(
          "The blog_post_likes table does not exist. Run supabase/blog-likes.sql.",
        );

        return NextResponse.json(
          { error: "Likes are not ready yet." },
          { status: 503 },
        );
      }

      throw new Error(readError.message);
    }

    if (existing) {
      const { error } = await supabase
        .from("blog_post_likes")
        .delete()
        .eq("id", existing.id);

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        liked: false,
        likeCount: await countLikes(id),
      });
    }

    const { error: insertError } = await supabase
      .from("blog_post_likes")
      .insert({
        post_id: id,
        user_id: state.userId,
        author_name: state.username,
      });

    /*
     * 23505 is the unique constraint: two requests raced and the other
     * one landed first. The reader wanted it liked, and it is.
     */
    if (insertError && insertError.code !== "23505") {
      if (insertError.code === "23503") {
        return NextResponse.json(
          { error: "The post could not be found." },
          { status: 404 },
        );
      }

      throw new Error(insertError.message);
    }

    return NextResponse.json({
      liked: true,
      likeCount: await countLikes(id),
    });
  } catch (error) {
    console.error("Blog like error:", error);

    return NextResponse.json(
      { error: "The like could not be saved." },
      { status: 500 },
    );
  }
}
