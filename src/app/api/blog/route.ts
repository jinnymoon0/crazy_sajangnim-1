import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
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
  "image/heic-sequence",
  "image/heif-sequence",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
]);

function getFileExtensionFromName(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function isSupportedImage(file: File): boolean {
  return (
    ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase()) ||
    ALLOWED_IMAGE_EXTENSIONS.has(getFileExtensionFromName(file))
  );
}

function getStorageContentType(file: File): string {
  const type = file.type.toLowerCase();

  if (ALLOWED_IMAGE_TYPES.has(type)) {
    return type;
  }

  const extension = getFileExtensionFromName(file);

  const contentTypeByExtension: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
  };

  return contentTypeByExtension[extension] ?? "application/octet-stream";
}

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

interface UploadableImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

const SHARED_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function isBlockedSharedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  return (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    // Raw IPv4 or IPv6 addresses cannot be public CDN hosts we trust.
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    host.includes(":")
  );
}

/*
 * Download a catalog item's image so a shared product can become the post
 * cover. Only public https image URLs are accepted, and the final URL is
 * re-validated after redirects.
 */
async function downloadSharedImage(
  rawUrl: string,
): Promise<UploadableImage | null> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || isBlockedSharedImageHost(url.hostname)) {
    return null;
  }

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "image/*",
        "User-Agent":
          process.env.COLLECTOR_USER_AGENT ?? "Mozilla/5.0 CrazySajangnim/1.0",
      },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  try {
    const finalUrl = new URL(response.url);

    if (
      finalUrl.protocol !== "https:" ||
      isBlockedSharedImageHost(finalUrl.hostname)
    ) {
      return null;
    }
  } catch {
    return null;
  }

  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  const extension = SHARED_IMAGE_EXTENSIONS[contentType];

  if (!extension) {
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length === 0 || buffer.length > MAX_IMAGE_SIZE) {
    return null;
  }

  return { buffer, contentType, extension };
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

    /*
     * The author is always the logged-in account; the client cannot
     * choose a display name.
     */
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Please log in to publish a post." },
        { status: 401 },
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

    const sharedImageUrls = formData
      .getAll("sharedImageUrls")
      .filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      );

    const totalImageCount = images.length + sharedImageUrls.length;

    if (totalImageCount === 0) {
      return NextResponse.json(
        { error: "Please select at least one clothing image." },
        { status: 400 },
      );
    }

    if (totalImageCount > MAX_IMAGE_COUNT) {
      return NextResponse.json(
        {
          error: `You can upload up to ${MAX_IMAGE_COUNT} images per post.`,
        },
        { status: 400 },
      );
    }

    for (const image of images) {
      if (!isSupportedImage(image)) {
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

    /*
     * Shared catalog images are downloaded server-side and become the post
     * cover, followed by any uploaded files.
     */
    const uploadableImages: UploadableImage[] = [];

    for (const sharedImageUrl of sharedImageUrls) {
      const sharedImage = await downloadSharedImage(sharedImageUrl);

      if (!sharedImage) {
        return NextResponse.json(
          {
            error:
              "The shared item image could not be attached. Please add a photo manually.",
          },
          { status: 400 },
        );
      }

      uploadableImages.push(sharedImage);
    }

    for (const image of images) {
      uploadableImages.push({
        buffer: Buffer.from(await image.arrayBuffer()),
        contentType: getStorageContentType(image),
        extension: getFileExtension(image),
      });
    }

    const supabase = getSupabaseAdmin();
    const postFolder = crypto.randomUUID();
    const imageUrls: string[] = [];

    for (const [index, image] of uploadableImages.entries()) {
      const imagePath = [
        new Date().getUTCFullYear(),
        postFolder,
        `${index + 1}-${crypto.randomUUID()}.${image.extension}`,
      ].join("/");

      const { error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(imagePath, image.buffer, {
          contentType: image.contentType,
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

    const authorName = sessionUser.username;

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
