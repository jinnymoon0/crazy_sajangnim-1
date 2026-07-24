import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

type BlogPostRow = {
  id: string;
  title: string;
  content: string;
  author_name: string;
  image_url: string | null;
  image_path: string | null;
  image_urls: string[] | null;
  image_paths: string[] | null;
  created_at: string;
};

const blogPostSchema = z.object({
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

  authorName: z
    .string()
    .trim()
    .max(40, "The display name must be 40 characters or fewer.")
    .optional(),

});

function getFileExtension(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (
    extension &&
    ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(extension)
  ) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  const extensionByMimeType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif",
  };

  return extensionByMimeType[file.type] ?? "jpg";
}

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

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, title, content, author_name, image_url, image_path, image_urls, image_paths, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Blog post fetch failed:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        { error: "Failed to load blog posts." },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as BlogPostRow[];

    const posts = rows.map((post) => ({
      ...post,
      image_urls:
        post.image_urls && post.image_urls.length > 0
          ? post.image_urls
          : post.image_url
            ? [post.image_url]
            : [],
      image_paths:
        post.image_paths && post.image_paths.length > 0
          ? post.image_paths
          : post.image_path
            ? [post.image_path]
            : [],
    }));

    return NextResponse.json(
      { posts },
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
  const uploadedImagePaths: string[] = [];

  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    const formData = await request.formData();

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

    const images = formData
      .getAll("images")
      .filter(
        (value): value is File =>
          value instanceof File && value.size > 0,
      );

    if (images.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one clothing image." },
        { status: 400 },
      );
    }

    if (images.length > MAX_IMAGE_COUNT) {
      return NextResponse.json(
        {
          error: `You can upload up to ${MAX_IMAGE_COUNT} images per post.`,
        },
        { status: 400 },
      );
    }

    for (const image of images) {
      if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
        return NextResponse.json(
          {
            error:
              "Only JPG, PNG, WebP, GIF, HEIC, and HEIF images are supported.",
          },
          { status: 400 },
        );
      }

      if (image.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          {
            error: `${image.name} must be 20 MB or smaller.`,
          },
          { status: 400 },
        );
      }
    }

    const supabase = getSupabaseAdmin();
    const postFolder = crypto.randomUUID();
    const imageUrls: string[] = [];

    for (const [index, image] of images.entries()) {
      const extension = getFileExtension(image);

      const imagePath = [
        new Date().getUTCFullYear(),
        postFolder,
        `${index + 1}-${crypto.randomUUID()}.${extension}`,
      ].join("/");

      const imageBuffer = Buffer.from(await image.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(imagePath, imageBuffer, {
          contentType: image.type,
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) {
        console.error("Blog image upload failed:", {
          name: uploadError.name,
          message: uploadError.message,
          imagePath,
        });

        if (uploadedImagePaths.length > 0) {
          await supabase.storage
            .from("blog-images")
            .remove(uploadedImagePaths);
        }

        return NextResponse.json(
          {
            error:
              process.env.NODE_ENV === "development"
                ? `Failed to upload image ${index + 1}: ${uploadError.message}`
                : "Failed to upload one or more images.",
          },
          { status: 500 },
        );
      }

      uploadedImagePaths.push(imagePath);

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("blog-images")
        .getPublicUrl(imagePath);

      imageUrls.push(publicUrl);
    }

    const authorName =
      parsedFields.data.authorName?.trim() || "Anonymous";

    const { data: post, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title: parsedFields.data.title,
        content: parsedFields.data.content,
        author_name: authorName,


        image_urls: imageUrls,
        image_paths: uploadedImagePaths,

        // Preserve compatibility with the original schema.
        image_url: imageUrls[0],
        image_path: uploadedImagePaths[0],
      })
      .select(
        "id, title, content, author_name, image_url, image_path, image_urls, image_paths, created_at",
      )
      .single();

    if (insertError) {
      console.error("Blog post insert failed:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });

      await supabase.storage
        .from("blog-images")
        .remove(uploadedImagePaths);

      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === "development"
              ? `Failed to save blog post: ${insertError.code} - ${insertError.message}`
              : "Failed to save the blog post.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Blog POST error:", error);

    if (uploadedImagePaths.length > 0) {
      try {
        await getSupabaseAdmin()
          .storage
          .from("blog-images")
          .remove(uploadedImagePaths);
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
