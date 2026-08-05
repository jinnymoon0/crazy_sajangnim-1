import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthState } from "@/lib/auth/session";
import { canModerate } from "@/lib/blog/moderation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type StoredPost = {
  id: string;
  user_id: string | null;
  author_name: string | null;
  image_path: string | null;
  image_paths: string[] | null;
};

/*
 * A post may only be changed by the person who wrote it, or by the super
 * admin. Checked here rather than only in the page, because hiding the
 * button leaves the route open to anyone who calls it directly.
 *
 * Authorship is the account id. The stored author_name is only the
 * username at the time of writing, so it goes stale on a rename; it is
 * the fallback for rows written before the id was recorded.
 */
async function denyUnlessAllowed(
  post: StoredPost,
): Promise<NextResponse | null> {
  const state = await getAuthState();

  if (!state.authenticated || !state.userId || !state.username) {
    return NextResponse.json(
      { error: "Please sign in." },
      { status: 401 },
    );
  }

  const allowed = await canModerate(post, {
    id: state.userId,
    username: state.username,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: "Only the person who wrote this post can change it." },
      { status: 403 },
    );
  }

  return null;
}

const updatePostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please enter a title.")
    .max(120, "The title must be 120 characters or fewer."),

  content: z
    .string()
    .trim()
    .min(1, "Please enter a description.")
    .max(5000, "The description must be 5,000 characters or fewer."),
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

async function getStoredPost(id: string): Promise<StoredPost | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, user_id, author_name, image_path, image_paths")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Blog post lookup failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    throw new Error("Failed to load the post.");
  }

  return data as StoredPost | null;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = updatePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Please check the submitted values.",
        },
        { status: 400 },
      );
    }

    const existingPost = await getStoredPost(id);

    if (!existingPost) {
      return NextResponse.json(
        { error: "The post could not be found." },
        { status: 404 },
      );
    }

    const denied = await denyUnlessAllowed(existingPost);

    if (denied) {
      return denied;
    }

    const supabase = getSupabaseAdmin();

    const { data: updatedPost, error: updateError } =
      await supabase
        .from("blog_posts")
        .update({
          title: parsed.data.title,
          content: parsed.data.content,
        })
        .eq("id", id)
        .select(
          "id, title, content, author_name, image_url, image_path, image_urls, image_paths, created_at",
        )
        .single();

    if (updateError) {
      console.error("Blog post update failed:", {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });

      return NextResponse.json(
        { error: "Failed to update the post." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      post: updatedPost,
    });
  } catch (error) {
    console.error("Blog PATCH error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const post = await getStoredPost(id);

    if (!post) {
      return NextResponse.json(
        { error: "The post could not be found." },
        { status: 404 },
      );
    }

    const denied = await denyUnlessAllowed(post);

    if (denied) {
      return denied;
    }

    const storedPaths = Array.isArray(post.image_paths)
      ? post.image_paths.filter(
          (path): path is string =>
            typeof path === "string" && path.length > 0,
        )
      : [];

    const fallbackPaths =
      typeof post.image_path === "string" &&
      post.image_path.length > 0
        ? [post.image_path]
        : [];

    const imagePaths = Array.from(
      new Set(
        storedPaths.length > 0
          ? storedPaths
          : fallbackPaths,
      ),
    );

    const supabase = getSupabaseAdmin();

    const { error: deleteError } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Blog post deletion failed:", {
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
      });

      return NextResponse.json(
        { error: "Failed to delete the post." },
        { status: 500 },
      );
    }

    if (imagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("blog-images")
        .remove(imagePaths);

      if (storageError) {
        console.error(
          "Post deleted but image cleanup failed:",
          storageError,
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Blog DELETE error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
