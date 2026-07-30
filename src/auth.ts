import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

declare module "next-auth" {
  interface Session {
    user: {
      /** Stable Google account id (the OIDC `sub` claim). */
      id: string;
    } & DefaultSession["user"];
  }
}

/*
 * Google-only sign-in. On every login the Google identity is upserted
 * into site_users (keyed by the stable google_sub); the username is
 * chosen by the user afterwards on /choose-username.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile?.sub) {
        return false;
      }

      try {
        const supabase = getSupabaseAdmin();

        const { error } = await supabase.from("site_users").upsert(
          {
            google_sub: profile.sub,
            email: profile.email ?? null,
            full_name: profile.name ?? null,
            avatar_url:
              typeof profile.picture === "string" ? profile.picture : null,
            email_verified:
              typeof profile.email_verified === "boolean"
                ? profile.email_verified
                : null,
            last_login_at: new Date().toISOString(),
          },
          { onConflict: "google_sub" },
        );

        if (error) {
          console.error("Google identity upsert failed:", {
            code: error.code,
            message: error.message,
          });

          return false;
        }

        return true;
      } catch (error) {
        console.error("Google sign-in error:", error);

        return false;
      }
    },

    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});
