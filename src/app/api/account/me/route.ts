import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/api-helpers";
import { getAuthState } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getAuthState();

    return NextResponse.json(
      {
        user: state.authenticated
          ? {
              id: state.userId,
              username: state.username,
              name: state.name,
              picture: state.picture,
              needsUsername: !state.username,
            }
          : null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Session lookup error:", error);

    return NextResponse.json({ user: null });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    const state = await getAuthState();

    if (!state.authenticated || !state.userId) {
      return NextResponse.json(
        { error: "Please log in first." },
        { status: 401 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("site_users")
      .delete()
      .eq("id", state.userId);

    if (error) {
      console.error("Account deletion failed:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        { error: "Failed to delete the account." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      deleted: true,
    });
  } catch (error) {
    console.error("Account deletion error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
