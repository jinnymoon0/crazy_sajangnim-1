import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import {
  USERNAME_PATTERN,
  USERNAME_RULES_MESSAGE,
  isSameOriginRequest,
  normalizeUsername,
} from "@/lib/auth/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const usernameSchema = z.object({
  username: z
    .string()
    .transform((value) => normalizeUsername(value))
    .pipe(z.string().regex(USERNAME_PATTERN, USERNAME_RULES_MESSAGE)),
});

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    const session = await auth();
    const googleSub = session?.user?.id;

    if (!googleSub) {
      return NextResponse.json(
        { error: "Please log in first." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const parsed = usernameSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Please check the username.",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existing, error: lookupError } = await supabase
      .from("site_users")
      .select("id, username")
      .eq("google_sub", googleSub)
      .maybeSingle();

    if (lookupError || !existing) {
      console.error("Username lookup failed:", lookupError);

      return NextResponse.json(
        { error: "Failed to save the username." },
        { status: 500 },
      );
    }

    if (existing.username) {
      return NextResponse.json(
        { error: "Your username is already set." },
        { status: 409 },
      );
    }

    const { error: updateError } = await supabase
      .from("site_users")
      .update({
        username: parsed.data.username,
        username_lower: parsed.data.username.toLowerCase(),
      })
      .eq("id", existing.id);

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "That username is already taken." },
          { status: 409 },
        );
      }

      console.error("Username update failed:", {
        code: updateError.code,
        message: updateError.message,
      });

      return NextResponse.json(
        { error: "Failed to save the username." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      username: parsed.data.username,
    });
  } catch (error) {
    console.error("Username error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
