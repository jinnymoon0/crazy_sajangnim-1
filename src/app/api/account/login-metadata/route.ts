import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { isSameOriginRequest } from "@/lib/auth/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const metadataSchema = z.object({
  browserLanguage: z.string().trim().min(1).max(100).nullable(),
  browserLanguages: z
    .array(z.string().trim().min(1).max(100))
    .max(20),
  timezone: z.string().trim().min(1).max(100).nullable(),
});

function getCountryCode(request: Request): string | null {
  const value =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry");

  if (!value || !/^[A-Za-z]{2}$/.test(value)) {
    return null;
  }

  return value.toUpperCase();
}

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
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = metadataSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid login metadata." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("site_users")
      .update({
        browser_language: parsed.data.browserLanguage,
        browser_languages: parsed.data.browserLanguages,
        timezone: parsed.data.timezone,
        country_code: getCountryCode(request),
        metadata_updated_at: new Date().toISOString(),
      })
      .eq("google_sub", googleSub);

    if (error) {
      console.error("Login metadata update failed:", {
        code: error.code,
        message: error.message,
      });

      return NextResponse.json(
        { error: "Failed to update login metadata." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Login metadata error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
