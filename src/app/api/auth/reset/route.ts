import { NextResponse } from "next/server";
import { z } from "zod";

import { SECURITY_QUESTIONS } from "@/constants/security-questions";
import {
  accountsNotSetUpResponse,
  isMissingTableError,
  isSameOriginRequest,
} from "@/lib/auth/api-helpers";
import {
  hashSecret,
  normalizeSecurityAnswer,
  verifySecret,
} from "@/lib/auth/passwords";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const questionSchema = z.object({
  username: z.string().trim().min(1, "Please enter your username."),
});

const resetSchema = z.object({
  username: z.string().trim().min(1, "Please enter your username."),

  securityAnswer: z
    .string()
    .trim()
    .min(1, "Please answer the security question."),

  newPassword: z
    .string()
    .min(8, "The new password must be at least 8 characters.")
    .max(72, "The new password must be 72 characters or fewer."),
});

const UNKNOWN_ACCOUNT = "No account exists with that username.";
const WRONG_ANSWER = "The security answer is incorrect.";

/*
 * Step 1: look up the account's security question.
 */
export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = questionSchema.safeParse(body ?? {});

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
      .select("security_question")
      .eq("username_lower", parsed.data.username.toLowerCase())
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return accountsNotSetUpResponse();
      }

      console.error("Reset question lookup failed:", {
        code: error.code,
        message: error.message,
      });

      return NextResponse.json(
        { error: "Failed to look up the account." },
        { status: 500 },
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: UNKNOWN_ACCOUNT },
        { status: 404 },
      );
    }

    return NextResponse.json({
      question:
        SECURITY_QUESTIONS[user.security_question] ??
        SECURITY_QUESTIONS[0],
    });
  } catch (error) {
    console.error("Reset question error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

/*
 * Step 2: verify the answer and set the new password. Every existing
 * session for the account is revoked.
 */
export async function PUT(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = resetSchema.safeParse(body ?? {});

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
      .select("id, security_answer_hash")
      .eq("username_lower", parsed.data.username.toLowerCase())
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return accountsNotSetUpResponse();
      }

      console.error("Reset lookup failed:", {
        code: error.code,
        message: error.message,
      });

      return NextResponse.json(
        { error: "Failed to reset the password." },
        { status: 500 },
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: UNKNOWN_ACCOUNT },
        { status: 404 },
      );
    }

    const answerMatches = verifySecret(
      normalizeSecurityAnswer(parsed.data.securityAnswer),
      user.security_answer_hash,
    );

    if (!answerMatches) {
      return NextResponse.json(
        { error: WRONG_ANSWER },
        { status: 403 },
      );
    }

    const { error: updateError } = await supabase
      .from("site_users")
      .update({
        password_hash: hashSecret(parsed.data.newPassword),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Password update failed:", {
        code: updateError.code,
        message: updateError.message,
      });

      return NextResponse.json(
        { error: "Failed to reset the password." },
        { status: 500 },
      );
    }

    await supabase
      .from("site_sessions")
      .delete()
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
