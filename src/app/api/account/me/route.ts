import { NextResponse } from "next/server";

import { getAuthState } from "@/lib/auth/session";

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
