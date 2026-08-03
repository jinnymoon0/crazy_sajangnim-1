import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isMissingTableError,
  isSameOriginRequest,
} from "@/lib/auth/api-helpers";
import { getAuthState } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const body: unknown = await request.json().catch(() => null);
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Please check the message.",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("contact_messages").insert({
      user_id: state.userId,
      topic: parsed.data.topic,
      message: parsed.data.message,
      ip_address: getClientIp(request),
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    });

    if (error) {
      if (isMissingTableError(error)) {
        console.error(
          "The contact_messages table does not exist. Run supabase/contact.sql.",
        );

        return NextResponse.json(
          { error: "The contact box is not ready yet. Please try later." },
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

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
