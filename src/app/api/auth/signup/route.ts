import { NextResponse } from "next/server";
import { z } from "zod";

import { isSecurityQuestionIndex } from "@/constants/security-questions";
import {
  accountsNotSetUpResponse,
  isMissingTableError,
  isSameOriginRequest,
} from "@/lib/auth/api-helpers";
import {
  hashSecret,
  normalizeSecurityAnswer,
} from "@/lib/auth/passwords";
import {
  SESSION_COOKIE,
  createSessionId,
  sessionCookieOptions,
  sessionExpiry,
} from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9._-]{3,30}$/,
      "Usernames are 3–30 characters: letters, numbers, dots, dashes, underscores.",
    ),

  password: z
    .string()
    .min(8, "The password must be at least 8 characters.")
    .max(72, "The password must be 72 characters or fewer."),

  securityQuestion: z.number().int(),

  securityAnswer: z
    .string()
    .trim()
    .min(1, "Please answer the security question.")
    .max(100, "The answer must be 100 characters or fewer."),
});

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const { website, ...fields } = (body ?? {}) as Record<string, unknown>;

    // Honeypot field — real visitors never fill it.
    if (typeof website === "string" && website.trim()) {
      return NextResponse.json(
        { error: "The submission could not be processed." },
        { status: 400 },
      );
    }

    const parsed = signupSchema.safeParse(fields);

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

    if (!isSecurityQuestionIndex(parsed.data.securityQuestion)) {
      return NextResponse.json(
        { error: "Please choose a security question." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: user, error: insertError } = await supabase
      .from("site_users")
      .insert({
        username: parsed.data.username,
        username_lower: parsed.data.username.toLowerCase(),
        password_hash: hashSecret(parsed.data.password),
        security_question: parsed.data.securityQuestion,
        security_answer_hash: hashSecret(
          normalizeSecurityAnswer(parsed.data.securityAnswer),
        ),
        last_login_at: new Date().toISOString(),
      })
      .select("id, username")
      .single();

    if (insertError) {
      if (isMissingTableError(insertError)) {
        return accountsNotSetUpResponse();
      }

      // 23505: the lowercase username is already taken.
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "That username is already taken." },
          { status: 409 },
        );
      }

      console.error("Signup failed:", {
        code: insertError.code,
        message: insertError.message,
      });

      return NextResponse.json(
        { error: "Failed to create the account." },
        { status: 500 },
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
      console.error("Signup session creation failed:", {
        code: sessionError.code,
        message: sessionError.message,
      });

      return NextResponse.json(
        { error: "The account was created. Please log in." },
        { status: 201 },
      );
    }

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
        },
      },
      { status: 201 },
    );

    response.cookies.set(
      SESSION_COOKIE,
      sessionId,
      sessionCookieOptions(expires),
    );

    return response;
  } catch (error) {
    console.error("Signup error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
