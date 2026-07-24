import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const blogPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please enter a title.")
    .max(120, "The title must be 120 characters or fewer."),

  content: z
    .string()
    .trim()
    .min(1, "Please enter some content.")
    .max(5000, "The content must be 5,000 characters or fewer."),

  authorName: z
    .string()
    .trim()
    .max(40, "The name must be 40 characters or fewer.")
    .optional(),
});

function sanitizeFileExtension(file: File): string {
  const extensionFromName = file.name.split(".").pop()?.toLowerCase();

  if (
    extensionFromName &&
    ["jpg", "jpeg", "png", "webp", "gif"].includes(extensionFromName)
  ) {
    return extensionFromName === "jpeg" ? "jpg" : extensionFromName;
  }

  const extensionsByMimeType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  return extensionsByMimeType[file.type] ?? "jpg";
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  const requestUrl = new URL(request.url);

  try {
    return new URL(origin).host === requestUrl.host;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, title, content, author_name, image_url, image_path, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Blog post fetch failed:", error);

      return NextResponse.json(
        { error: "Failed to load blog posts." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { posts: data ?? [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Blog GET error:", error);

    return NextResponse.json(
      { error: "The blog service is not configured correctly." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let uploadedImagePath: string | null = null;

  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    const formData = await request.formData();

    // Basic honeypot. Normal users never see or fill this field.
    const website = String(formData.get("website") ?? "").trim();

    if (website) {
      return NextResponse.json(
        { error: "The submission could not be processed." },
        { status: 400 },
      );
    }

    const parsedFields = blogPostSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
      authorName: formData.get("authorName"),
    });

    if (!parsedFields.success) {
      return NextResponse.json(
        {
          error:
            parsedFields.error.issues[0]?.message ??
            "Please check the submitted fields.",
        },
        { status: 400 },
      );
    }

    const image = formData.get("image");

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json(
        { error: "Please select a clothing image." },
        { status: 400 },
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return NextResponse.json(
        {
          error: "Only JPG, PNG, WebP, and GIF images are supported.",
        },
        { status: 400 },
      );
    }

    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "The image must be 5 MB or smaller." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const extension = sanitizeFileExtension(image);

    uploadedImagePath = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${extension}`;

    const imageBuffer = Buffer.from(await image.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(uploadedImagePath, imageBuffer, {
        contentType: image.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("Blog image upload failed:", uploadError);

      return NextResponse.json(
        { error: "Failed to upload the image." },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("blog-images")
      .getPublicUrl(uploadedImagePath);

    const authorName =
      parsedFields.data.authorName?.trim() || "Anonymous";

    const { data: post, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title: parsedFields.data.title,
        content: parsedFields.data.content,
        author_name: authorName,
        image_url: publicUrl,
        image_path: uploadedImagePath,
      })
      .select(
        "id, title, content, author_name, image_url, image_path, created_at",
      )
      .single();

    if (insertError) {
      console.error("Blog post insert failed:", insertError);

      await supabase.storage
        .from("blog-images")
        .remove([uploadedImagePath]);

      return NextResponse.json(
        { error: "Failed to save the blog post." },
        { status: 500 },
      );
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Blog POST error:", error);

    if (uploadedImagePath) {
      try {
        await getSupabaseAdmin()
          .storage
          .from("blog-images")
          .remove([uploadedImagePath]);
      } catch (cleanupError) {
        console.error("Uploaded image cleanup failed:", cleanupError);
      }
    }

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
