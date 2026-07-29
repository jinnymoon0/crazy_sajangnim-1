import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BlogComment } from "@/types/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_COMMENTS = 200;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const commentSchema = z.object({
  authorName: z
    .string()
    .trim()
    .max(40, "The display name must be 40 characters or fewer.")
    .optional(),

  content: z
    .string()
    .trim()
    .min(1, "Please enter a comment.")
    .max(1000, "The comment must be 1,000 characters or fewer."),
});

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

function isMissingTableError(error: { code?: string }): boolean {
  // 42P01: raw Postgres missing relation; PGRST205: PostgREST schema cache.
  return error.code === "42P01" || error.code === "PGRST205";
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("blog_comments")
      .select("id, post_id, author_name, content, created_at")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .limit(MAX_COMMENTS);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { error: "Comments are not set up yet." },
          { status: 503 },
        );
      }

      console.error("Blog comment fetch failed:", {
        code: error.code,
        message: error.message,
      });

      return NextResponse.json(
        { error: "Failed to load comments." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { comments: (data ?? []) as BlogComment[] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Blog comments GET error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const body: unknown = await request.json();

    const { website, ...fields } = (body ?? {}) as Record<string, unknown>;

    // Honeypot field — real visitors never fill it.
    if (typeof website === "string" && website.trim()) {
      return NextResponse.json(
        { error: "The submission could not be processed." },
        { status: 400 },
      );
    }

    const parsed = commentSchema.safeParse(fields);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Please check the submitted fields.",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: post, error: postError } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (postError) {
      console.error("Comment post lookup failed:", {
        code: postError.code,
        message: postError.message,
      });

      return NextResponse.json(
        { error: "Failed to save the comment." },
        { status: 500 },
      );
    }

    if (!post) {
      return NextResponse.json(
        { error: "The post could not be found." },
        { status: 404 },
      );
    }

    const { data: comment, error: insertError } = await supabase
      .from("blog_comments")
      .insert({
        post_id: id,
        author_name: parsed.data.authorName?.trim() || "Anonymous",
        content: parsed.data.content,
      })
      .select("id, post_id, author_name, content, created_at")
      .single();

    if (insertError) {
      if (isMissingTableError(insertError)) {
        return NextResponse.json(
          { error: "Comments are not set up yet." },
          { status: 503 },
        );
      }

      console.error("Blog comment insert failed:", {
        code: insertError.code,
        message: insertError.message,
      });

      return NextResponse.json(
        { error: "Failed to save the comment." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { comment: comment as BlogComment },
      { status: 201 },
    );
  } catch (error) {
    console.error("Blog comments POST error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
