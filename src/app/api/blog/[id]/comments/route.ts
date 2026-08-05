import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import {
  callerKey,
  checkRateLimit,
  tooManyRequests,
} from "@/lib/rate-limit";
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
  content: z
    .string()
    .trim()
    .min(1, "Please enter a comment.")
    .max(1000, "The comment must be 1,000 characters or fewer."),

  // The comment being replied to.
  parentId: z.string().uuid().nullish(),
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

/*
 * How far a thread may indent before replies stop nesting deeper.
 */
const MAX_THREAD_DEPTH = 6;

/*
 * The comment a new reply should hang off: the one being answered, or —
 * if answering it would indent past the limit — its nearest ancestor
 * that still fits.
 *
 * Read as one query and walked in memory rather than a query per level,
 * so depth costs nothing beyond the comments already being loaded.
 */
async function clampToMaxDepth(
  parentId: string,
  postId: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("blog_comments")
    .select("id, parent_id")
    .eq("post_id", postId)
    .limit(MAX_COMMENTS);

  if (error || !data) {
    return parentId;
  }

  const parentOf = new Map<string, string | null>(
    data.map((row) => [row.id as string, (row.parent_id as string) ?? null]),
  );

  /*
   * Walk from the comment being answered up to the root, collecting the
   * chain. Bounded by the number of comments read, so a parent_id cycle
   * — which the schema should never allow — cannot spin here.
   */
  const chain: string[] = [];
  const seen = new Set<string>();

  let cursor: string | null = parentId;

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    chain.push(cursor);
    cursor = parentOf.get(cursor) ?? null;
  }

  // chain[0] is the parent, chain[chain.length - 1] the root.
  const depthOfNewComment = chain.length;

  if (depthOfNewComment <= MAX_THREAD_DEPTH) {
    return parentId;
  }

  /*
   * Too deep: step back down the chain to the ancestor sitting at the
   * last depth a reply is allowed to occupy.
   */
  return chain[depthOfNewComment - MAX_THREAD_DEPTH] ?? parentId;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("blog_comments")
      .select("id, post_id, author_name, user_id, parent_id, content, created_at")
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

    /*
     * The commenter is always the logged-in account; the client cannot
     * choose a display name.
     */
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Please log in to comment." },
        { status: 401 },
      );
    }

    /*
     * Checked after the session, so the limit is per account rather
     * than per address wherever possible.
     */
    const limit = await checkRateLimit(
      "comment",
      callerKey(request, sessionUser.id),
    );

    if (!limit.allowed) {
      return tooManyRequests(limit);
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

    /*
     * A reply hangs off whatever it answers, so answering a reply nests
     * one level deeper rather than rejoining the top of the thread.
     *
     * Only up to MAX_THREAD_DEPTH, though. Indentation cannot keep
     * growing on a phone screen, so past that depth a reply joins its
     * deepest ancestor still within the limit — the conversation carries
     * on, it just stops moving right.
     */
    let parentId: string | null = null;

    if (parsed.data.parentId) {
      const { data: parent, error: parentError } = await supabase
        .from("blog_comments")
        .select("id, post_id, parent_id")
        .eq("id", parsed.data.parentId)
        .maybeSingle();

      if (parentError) {
        console.error("Reply parent lookup failed:", parentError.message);

        return NextResponse.json(
          { error: "Failed to save the comment." },
          { status: 500 },
        );
      }

      // Belonging to this post matters: the id comes from the browser.
      if (!parent || parent.post_id !== id) {
        return NextResponse.json(
          { error: "The comment being replied to could not be found." },
          { status: 404 },
        );
      }

      parentId = await clampToMaxDepth(parent.id, id);
    }

    const { data: comment, error: insertError } = await supabase
      .from("blog_comments")
      .insert({
        post_id: id,
        author_name: sessionUser.username,
        user_id: sessionUser.id,
        parent_id: parentId,
        content: parsed.data.content,
      })
      .select(
        "id, post_id, author_name, user_id, parent_id, content, created_at",
      )
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
