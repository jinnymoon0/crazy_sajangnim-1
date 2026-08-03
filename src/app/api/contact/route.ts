import crypto from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isMissingTableError,
  isSameOriginRequest,
} from "@/lib/auth/api-helpers";
import { getAuthState } from "@/lib/auth/session";
import {
  getStorageContentType,
  getStorageExtension,
  isSupportedImage,
} from "@/lib/images/upload-fields";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "contact-images";

// The browser shrinks each photo to about 800 KB, so four stay well
// inside the ~4.5 MB a serverless request body may carry.
const MAX_IMAGE_COUNT = 4;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

const contactSchema = z.object({
  topic: z.enum(["brand", "bug", "other"]),

  message: z
    .string()
    .trim()
    .min(1, "Please write a message.")
    .max(2000, "Please keep the message under 2000 characters."),
});

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();

    if (first) {
      return first.slice(0, 100);
    }
  }

  return request.headers.get("x-real-ip")?.slice(0, 100) ?? null;
}

export async function POST(request: Request) {
  const uploadedPaths: string[] = [];

  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    /*
     * Signed in only, so every message has an account behind it for the
     * admin to answer and for abuse to be traced to.
     */
    const state = await getAuthState();

    if (!state.authenticated || !state.userId) {
      return NextResponse.json(
        { error: "Please sign in before sending a message." },
        { status: 401 },
      );
    }

    const form = await request.formData().catch(() => null);

    if (!form) {
      return NextResponse.json(
        { error: "Please check the message." },
        { status: 400 },
      );
    }

    const parsed = contactSchema.safeParse({
      topic: form.get("topic"),
      message: form.get("message"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Please check the message.",
        },
        { status: 400 },
      );
    }

    const images = form
      .getAll("images")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (images.length > MAX_IMAGE_COUNT) {
      return NextResponse.json(
        { error: `Please attach at most ${MAX_IMAGE_COUNT} photos.` },
        { status: 400 },
      );
    }

    for (const image of images) {
      if (!isSupportedImage(image)) {
        return NextResponse.json(
          { error: `${image.name} is not an image we can accept.` },
          { status: 400 },
        );
      }

      if (image.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `${image.name} is too large.` },
          { status: 400 },
        );
      }
    }

    const supabase = getSupabaseAdmin();

    /*
     * Into a private bucket: a screenshot of someone's own screen can
     * carry their email or orders, so the admin views these through
     * short-lived signed links rather than permanent public addresses.
     */
    const folder = crypto.randomUUID();

    for (const [index, image] of images.entries()) {
      const path = [
        new Date().getUTCFullYear(),
        folder,
        `${index + 1}-${crypto.randomUUID()}.${getStorageExtension(image)}`,
      ].join("/");

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, Buffer.from(await image.arrayBuffer()), {
          contentType: getStorageContentType(image),
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) {
        console.error("Contact photo upload failed:", {
          name: uploadError.name,
          message: uploadError.message,
          path,
        });

        if (uploadedPaths.length > 0) {
          await supabase.storage.from(BUCKET).remove(uploadedPaths);
        }

        return NextResponse.json(
          { error: "The photo could not be attached. Please try again." },
          { status: 500 },
        );
      }

      uploadedPaths.push(path);
    }

    const { error } = await supabase.from("contact_messages").insert({
      user_id: state.userId,
      topic: parsed.data.topic,
      message: parsed.data.message,
      image_paths: uploadedPaths.length > 0 ? uploadedPaths : null,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    });

    if (error) {
      // Nothing references the photos now, so do not leave them behind.
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(uploadedPaths);
      }

      if (isMissingTableError(error)) {
        console.error(
          "The contact_messages table does not exist. Run supabase/contact.sql.",
        );

        return NextResponse.json(
          { error: "The contact box is not ready yet. Please try later." },
          { status: 503 },
        );
      }

      /*
       * 42703 is the column missing: the message could still be stored
       * without its photos, but silently dropping them would be worse
       * than saying so.
       */
      if (error.code === "42703" || error.code === "PGRST204") {
        console.error(
          "contact_messages.image_paths is missing. Run supabase/contact-images.sql.",
        );

        return NextResponse.json(
          { error: "Photos are not ready yet. Please send without one." },
          { status: 503 },
        );
      }

      console.error("Contact message insert failed:", {
        code: error.code,
        message: error.message,
      });

      return NextResponse.json(
        { error: "The message could not be sent." },
        { status: 500 },
      );
    }

    return NextResponse.json({ sent: true }, { status: 201 });
  } catch (error) {
    console.error("Contact message error:", error);

    if (uploadedPaths.length > 0) {
      await getSupabaseAdmin()
        .storage.from(BUCKET)
        .remove(uploadedPaths)
        .catch(() => undefined);
    }

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
