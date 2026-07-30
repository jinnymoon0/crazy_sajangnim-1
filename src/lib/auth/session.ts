import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface SessionUser {
  id: string;
  username: string;
}

export interface AuthState {
  authenticated: boolean;
  userId: string | null;
  username: string | null;
  name: string | null;
  picture: string | null;
}

const SIGNED_OUT: AuthState = {
  authenticated: false,
  userId: null,
  username: null,
  name: null,
  picture: null,
};

/*
 * Resolve the Google session and the linked site_users row. A user who
 * signed in but has not picked a username yet has userId set and
 * username null.
 */
export async function getAuthState(): Promise<AuthState> {
  const session = await auth();
  const googleSub = session?.user?.id;

  if (!googleSub) {
    return SIGNED_OUT;
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("site_users")
      .select("id, username")
      .eq("google_sub", googleSub)
      .maybeSingle();

    if (error) {
      console.error("Auth state lookup failed:", {
        code: error.code,
        message: error.message,
      });

      return SIGNED_OUT;
    }

    /*
     * A valid Google session without a matching row means the sign-in
     * record was never written (or was written under a different id).
     * Self-heal by creating the account here instead of treating the
     * user as signed out, which previously looped them back to /login.
     */
    if (!data) {
      console.log("Self-healing missing site_users row for sub:", googleSub);

      const { data: created, error: createError } = await supabase
        .from("site_users")
        .upsert(
          {
            google_sub: googleSub,
            email: session.user?.email ?? null,
            full_name: session.user?.name ?? null,
            avatar_url: session.user?.image ?? null,
            last_login_at: new Date().toISOString(),
          },
          { onConflict: "google_sub" },
        )
        .select("id, username")
        .single();

      if (createError || !created) {
        console.error("Self-heal insert failed:", createError);

        return SIGNED_OUT;
      }

      return {
        authenticated: true,
        userId: created.id,
        username: created.username ?? null,
        name: session.user?.name ?? null,
        picture: session.user?.image ?? null,
      };
    }

    return {
      authenticated: true,
      userId: data.id,
      username: data.username ?? null,
      name: session.user?.name ?? null,
      picture: session.user?.image ?? null,
    };
  } catch {
    return SIGNED_OUT;
  }
}

/*
 * Server-side page guard: anyone not signed in goes to /login, and
 * anyone whose Google account has no username yet goes to
 * /choose-username. Pages call this so the redirect never depends on
 * client-side JavaScript.
 */
export async function requireOnboardedUser(): Promise<SessionUser> {
  const state = await getAuthState();

  if (!state.authenticated) {
    redirect("/login");
  }

  if (!state.userId || !state.username) {
    redirect("/choose-username");
  }

  return {
    id: state.userId,
    username: state.username,
  };
}

/*
 * Fully onboarded users only (signed in AND chose a username) — what
 * the blog APIs use to stamp authorship.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const state = await getAuthState();

  if (!state.authenticated || !state.userId || !state.username) {
    return null;
  }

  return {
    id: state.userId,
    username: state.username,
  };
}
