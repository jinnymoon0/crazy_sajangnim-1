import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface SessionUser {
  id: string;
  username: string;
}

/*
 * Real Google subjects are numeric strings. Anything else (e.g. a UUID
 * from an older session) must never overwrite a stored account id.
 */
function isGoogleSubject(value: string): boolean {
  return /^\d+$/.test(value);
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
     * record was never written, or the account id changed. Before
     * creating anything, adopt an existing account with the same
     * verified email — otherwise a returning user would be handed a
     * duplicate account and asked to pick a username all over again.
     */
    const email = session.user?.email ?? null;
    const emailTrusted =
      Boolean(email) && session.user?.googleEmailVerified !== false;

    /*
     * The row for this id exists but has no username, while another
     * account for the same verified email already has one. That is the
     * same person arriving through a stale or duplicated id, so use
     * their real account instead of asking for a username again.
     */
    if (data && !data.username && emailTrusted) {
      const { data: named } = await supabase
        .from("site_users")
        .select("id, username")
        .eq("email", email)
        .not("username", "is", null)
        .neq("id", data.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (named) {
        console.log("Resolving to the existing named account for:", email);

        return {
          authenticated: true,
          userId: named.id,
          username: named.username ?? null,
          name: session.user?.name ?? null,
          picture: session.user?.image ?? null,
        };
      }
    }

    if (!data) {
      if (emailTrusted) {
        const { data: byEmail } = await supabase
          .from("site_users")
          .select("id, username")
          .eq("email", email)
          .not("username", "is", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (byEmail) {
          console.log("Linking Google id to existing account:", email);

          /*
           * Only a genuine Google subject may take over the stored id;
           * a stale identifier must not overwrite a working account.
           */
          if (isGoogleSubject(googleSub)) {
            await supabase
              .from("site_users")
              .update({
                google_sub: googleSub,
                last_login_at: new Date().toISOString(),
              })
              .eq("id", byEmail.id);
          }

          return {
            authenticated: true,
            userId: byEmail.id,
            username: byEmail.username ?? null,
            name: session.user?.name ?? null,
            picture: session.user?.image ?? null,
          };
        }
      }

      console.log("Self-healing missing site_users row for sub:", googleSub);

      const { data: created, error: createError } = await supabase
        .from("site_users")
        .upsert(
          {
            google_sub: googleSub,
            email,
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
/*
 * Where they were headed, carried through sign-in and username choice
 * so a shared link still opens the post it pointed at. Someone arriving
 * on a link to a post has no account yet more often than not, and
 * dropping them on the front page loses whatever they were sent.
 */
export async function requireOnboardedUser(
  next?: string,
): Promise<SessionUser> {
  const state = await getAuthState();

  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  const query = destination
    ? `?callbackUrl=${encodeURIComponent(destination)}`
    : "";

  if (!state.authenticated) {
    redirect(`/login${query}`);
  }

  if (!state.userId || !state.username) {
    redirect(`/choose-username${query}`);
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
