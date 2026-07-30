import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/api-helpers";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

    if (sessionId) {
      const { error } = await getSupabaseAdmin()
        .from("site_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) {
        console.error("Logout session delete failed:", {
          code: error.code,
          message: error.message,
        });
      }
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
