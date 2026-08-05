import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { canModerate } from "@/lib/blog/moderation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
    commentId: string;
  }>;
};

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/*
 * Remove a comment. Only the person who wrote it, or the super admin.
 *
 * Its replies go with it — parent_id cascades — because an answer to
 * something no longer there reads as a non sequitur. That is worth
 * saying out loud in the UI before the button is pressed, since it can
 * take other people's replies too.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 },
      );
    }

    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Please sign in." },
        { status: 401 },
      );
    }

    const { id, commentId } = await context.params;

    const supabase = getSupabaseAdmin();

    const { data: comment, error: lookupError } = await supabase
      .from("blog_comments")
      .select("id, post_id, user_id, author_name")
      .eq("id", commentId)
      .maybeSingle();

    if (lookupError) {
      console.error("Comment lookup failed:", {
        code: lookupError.code,
        message: lookupError.message,
      });

      return NextResponse.json(
        { error: "Failed to delete the comment." },
        { status: 500 },
      );
    }

    /*
     * Belonging to this post matters: both ids come from the browser, so
     * a comment id from elsewhere must not be deletable through a post
     * the caller happens to be able to reach.
     */
    if (!comment || comment.post_id !== id) {
      return NextResponse.json(
        { error: "The comment could not be found." },
        { status: 404 },
      );
    }

    const allowed = await canModerate(
      { user_id: comment.user_id, author_name: comment.author_name },
      sessionUser,
    );

    if (!allowed) {
      return NextResponse.json(
        { error: "Only the person who wrote this comment can delete it." },
        { status: 403 },
      );
    }

    const { error: deleteError } = await supabase
      .from("blog_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      console.error("Comment deletion failed:", {
        code: deleteError.code,
        message: deleteError.message,
      });

      return NextResponse.json(
        { error: "Failed to delete the comment." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Blog comment DELETE error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
