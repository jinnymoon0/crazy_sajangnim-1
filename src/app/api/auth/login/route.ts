import { NextResponse } from "next/server";
import { z } from "zod";

import {
  accountsNotSetUpResponse,
  isMissingTableError,
  isSameOriginRequest,
} from "@/lib/auth/api-helpers";
import { verifySecret } from "@/lib/auth/passwords";
import {
  SESSION_COOKIE,
  createSessionId,
  sessionCookieOptions,
  sessionExpiry,
} from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Please enter your username."),
  password: z.string().min(1, "Please enter your password."),
});

const INVALID_CREDENTIALS = "The username or password is incorrect.";

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = loginSchema.safeParse(body ?? {});

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

    const { data: user, error } = await supabase
      .from("site_users")
      .select("id, username, password_hash")
      .eq("username_lower", parsed.data.username.toLowerCase())
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return accountsNotSetUpResponse();
      }

      console.error("Login lookup failed:", {
        code: error.code,
        message: error.message,
      });

      return NextResponse.json(
        { error: "Failed to log in." },
        { status: 500 },
      );
    }

    if (
      !user ||
      !verifySecret(parsed.data.password, user.password_hash)
    ) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS },
        { status: 401 },
      );
    }

    const sessionId = createSessionId();
    const expires = sessionExpiry();

    const { error: sessionError } = await supabase
      .from("site_sessions")
      .insert({
        id: sessionId,
        user_id: user.id,
        expires_at: expires.toISOString(),
      });

    if (sessionError) {
      console.error("Login session creation failed:", {
        code: sessionError.code,
        message: sessionError.message,
      });

      return NextResponse.json(
        { error: "Failed to log in." },
        { status: 500 },
      );
    }

    await supabase
      .from("site_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
      },
    });

    response.cookies.set(
      SESSION_COOKIE,
      sessionId,
      sessionCookieOptions(expires),
    );

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
