import type { Metadata } from "next";
import Link from "next/link";

import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service | Crazy Sajangnim",
  description:
    "Terms for using Crazy Sajangnim sale listings, community posts, and account features.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      updatedAt="August 22, 2026"
      intro="These terms describe the rules for using Crazy Sajangnim, including sale listings, affiliate links, accounts, and community features."
      sections={[
        {
          title: "Using the site",
          body: (
            <p>
              Crazy Sajangnim helps shoppers discover sale listings from Korean,
              Japanese, and United States retailers. Listings, prices, stock,
              images, discounts, currencies, and retailer pages can change
              quickly. Check the retailer&apos;s page before buying.
            </p>
          ),
        },
        {
          title: "Accounts",
          body: (
            <p>
              Some features require Google sign-in and a site username. You are
              responsible for activity under your account. Use accurate contact
              information and do not try to access another person&apos;s account or
              admin-only areas.
            </p>
          ),
        },
        {
          title: "Community content",
          body: (
            <p>
              Posts, comments, usernames, and uploaded images must be lawful,
              non-abusive, and related to the shopping community. Do not post
              private information, impersonate others, upload malicious content,
              or use the community to harass, spam, or mislead people.
            </p>
          ),
        },
        {
          title: "Retailers and affiliate links",
          body: (
            <p>
              Purchases happen on retailer websites, not on Crazy Sajangnim.
              Retailers control checkout, fulfillment, returns, taxes, duties,
              product authenticity, and customer service. Some outbound links
              may be affiliate links, which can earn a commission without
              changing your listed price.
            </p>
          ),
        },
        {
          title: "Moderation and availability",
          body: (
            <p>
              We may remove content, limit access, or suspend accounts that
              appear to violate these terms or threaten the site. The site may
              be changed, paused, or discontinued, and availability is not
              guaranteed.
            </p>
          ),
        },
        {
          title: "Account deletion",
          body: (
            <p>
              You can delete your account on the{" "}
              <Link href="/account" className="font-semibold underline">
                account page
              </Link>
              . Deletion removes your profile and account links from private
              records. Public posts and comments remain visible under their
              saved display name.
            </p>
          ),
        },
        {
          title: "Disclaimer",
          body: (
            <p>
              The site is provided as is. To the fullest extent allowed by law,
              Crazy Sajangnim is not responsible for retailer errors, changed
              sale terms, unavailable products, external websites, or indirect
              losses from using the site.
            </p>
          ),
        },
      ]}
    />
  );
}
