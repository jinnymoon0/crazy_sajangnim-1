import type { Metadata } from "next";
import Link from "next/link";

import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | Crazy Sajangnim",
  description:
    "How Crazy Sajangnim collects, uses, protects, and deletes account and visitor information.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      updatedAt="August 22, 2026"
      intro="This policy explains what Crazy Sajangnim collects, why it is collected, and how you can remove your account information."
      sections={[
        {
          title: "Information we collect",
          body: (
            <>
              <p>
                Browsing the sale listings does not require an account. When you
                sign in with Google, we receive the Google account id, email
                address, display name, avatar, and email verification status.
                You may also choose a site username.
              </p>
              <p>
                If you use community features, we store the posts, comments,
                likes, and contact messages you submit. Contact messages may
                include uploaded images if you attach them.
              </p>
              <p>
                We record basic visit and device information to understand site
                reliability and abuse patterns, including page paths, referrer,
                approximate location from IP data, browser details, screen or
                viewport size, language, timezone, and whether Do Not Track was
                enabled.
              </p>
            </>
          ),
        },
        {
          title: "How we use information",
          body: (
            <>
              <p>
                We use account information to sign you in, show your username,
                protect posts and comments from impersonation, answer support
                messages, reduce spam, debug errors, and understand which
                shopping surfaces are working.
              </p>
              <p>
                Affiliate links may tell a retailer or affiliate network that
                Crazy Sajangnim referred the click. We do not sell your account
                profile information.
              </p>
            </>
          ),
        },
        {
          title: "Security",
          body: (
            <>
              <p>
                The site uses HTTPS, Google OAuth, server-side Supabase access,
                row-level security on private tables, same-origin checks on
                account-changing requests, rate limits on sensitive actions,
                and a Content Security Policy that limits where pages can load
                scripts and send data.
              </p>
              <p>
                No website can promise perfect security, but we keep account
                access narrow and avoid collecting payment information.
              </p>
            </>
          ),
        },
        {
          title: "Service providers",
          body: (
            <p>
              Crazy Sajangnim runs on services such as Vercel, Supabase, Google
              sign-in, PostHog analytics, and affiliate or retailer websites you
              choose to open. Those providers process data under their own
              policies.
            </p>
          ),
        },
        {
          title: "Your choices",
          body: (
            <>
              <p>
                You can browse without signing in. You can delete your account
                from the{" "}
                <Link href="/account" className="font-semibold underline">
                  account page
                </Link>
                . Deletion removes your Google-linked profile, username, email,
                avatar, and account likes, and unlinks your account from visits,
                contact messages, posts, and comments.
              </p>
              <p>
                Public posts and comments remain visible under the display name
                saved when they were written, so conversations do not break for
                other users.
              </p>
            </>
          ),
        },
        {
          title: "Contact",
          body: (
            <p>
              For privacy questions or deletion help, sign in and use the site
              contact form, or ask an existing admin for support.
            </p>
          ),
        },
      ]}
    />
  );
}
