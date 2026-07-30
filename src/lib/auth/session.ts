import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const SESSION_COOKIE = "sajang_session";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  username: string;
}

export function createSessionId(): string {
  return randomBytes(32).toString("hex");
}

export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

/*
 * Resolve the logged-in user from the session cookie. Returns null for
 * missing, expired, or unknown sessions — including when the auth tables
 * have not been created yet.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return null;
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("site_sessions")
    .select("expires_at, site_users ( id, username )")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (new Date(data.expires_at) < new Date()) {
    await supabase.from("site_sessions").delete().eq("id", sessionId);

    return null;
  }

  const user = Array.isArray(data.site_users)
    ? data.site_users[0]
    : data.site_users;

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
  };
}
