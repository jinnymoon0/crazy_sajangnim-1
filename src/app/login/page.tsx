import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth/session";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, callbackUrl } = await searchParams;

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
        Sign in with Google to browse designer sales and share clothing
        finds.
      </p>

      <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
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
