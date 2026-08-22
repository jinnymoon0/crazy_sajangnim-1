import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth/session";
import {
  productIdFromCallback,
  productLinkMetadata,
} from "@/lib/blog/product-metadata";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export const dynamic = "force-dynamic";

/*
 * When this page is standing in front of an item, it wears the item's
 * card rather than its own.
 *
 * An unfurler that does not identify itself is sent here by the same
 * redirect a person gets, and then asks this page what the link is
 * about. Answering "Sign in" turns a friend's message about a jacket
 * into a preview of a login form — the least clickable thing it could
 * possibly say about the item behind it.
 */
export async function generateMetadata({
  searchParams,
}: LoginPageProps): Promise<Metadata> {
  const productId = productIdFromCallback((await searchParams).callbackUrl);

  if (!productId) {
    return {};
  }

  return (await productLinkMetadata(productId)) ?? {};
}

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
    accountDeleted?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, callbackUrl, accountDeleted } = await searchParams;

  /*
   * Only our own paths: a callback taken from the query could otherwise
   * be pointed at another site and turn the login into a redirector.
   */
  const safeCallback =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : null;

  const authState = await getAuthState();

  if (authState.authenticated) {
    redirect(
      authState.username ? (safeCallback ?? "/") : "/choose-username",
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#f5f2ea] px-4 py-10 text-[#111111]">
      <h1 className="font-diploma mb-3 mt-10 text-center text-4xl">
        Crazy Sajangnim
      </h1>

      <p className="mb-8 max-w-sm text-center text-sm leading-6 text-neutral-600">
        Browsing sales and reading the blog need no account. Sign in to
        open a post, write one, comment, or share a find.
      </p>

      <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        {accountDeleted === "1" ? (
          <p
            role="status"
            className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            Your account has been deleted.
          </p>
        ) : null}

        {error ? (
          <p
            role="status"
            className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error === "AccessDenied"
              ? "Sign-in was not completed. Please try again — if the problem continues, the site's account setup may be incomplete."
              : "Sign-in failed. Please try again."}
          </p>
        ) : null}

        <GoogleSignInButton callbackUrl={safeCallback} />

        <p className="mt-4 text-center text-xs leading-5 text-neutral-500">
          First time here? After signing in you will pick a username —
          in any language — that appears on your posts and comments.
        </p>
      </section>

      <Link
        href="/"
        className="mt-8 text-sm text-neutral-500 underline transition hover:text-neutral-950"
      >
        Back
      </Link>
    </main>
  );
}
