import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

interface GoogleProfile {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email_verified?: boolean;
  locale?: string;
  hd?: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async signIn({ account, profile }) {
      const googleProfile = profile as GoogleProfile | undefined;

      if (account?.provider !== "google" || !googleProfile?.sub) {
        return false;
      }

      try {
        const supabase = getSupabaseAdmin();

        const { error } = await supabase.rpc("record_google_login", {
          p_google_sub: googleProfile.sub,
          p_email: googleProfile.email ?? null,
          p_full_name: googleProfile.name ?? null,
          p_given_name: googleProfile.given_name ?? null,
          p_family_name: googleProfile.family_name ?? null,
          p_avatar_url: googleProfile.picture ?? null,
          p_email_verified:
            typeof googleProfile.email_verified === "boolean"
              ? googleProfile.email_verified
              : null,
          p_google_locale: googleProfile.locale ?? null,
          p_google_hosted_domain: googleProfile.hd ?? null,
        });

        if (error) {
          console.error("Google login recording failed:", {
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

    jwt({ token, account, profile }) {
      /*
       * Pin the token subject to the stable Google account id. Never
       * rely on library defaults for the identity every DB row is
       * keyed by.
       */
      if (account?.provider === "google" && profile?.sub) {
        token.sub = profile.sub;
      }

      return token;
    },

    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});
