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

    if (error || !data) {
      return SIGNED_OUT;
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
