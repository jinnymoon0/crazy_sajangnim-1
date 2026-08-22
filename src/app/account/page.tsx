import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import DeleteAccountPanel from "@/components/account/DeleteAccountPanel";
import { getAuthState } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Account | Crazy Sajangnim",
  description: "Manage or delete your Crazy Sajangnim account.",
};

export default async function AccountPage() {
  const state = await getAuthState();

  if (!state.authenticated) {
    redirect("/login?callbackUrl=/account");
  }

  return (
    <main className="min-h-screen bg-[#f5f2ea] px-4 py-8 text-[#111111] md:px-10 md:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-semibold text-black/55 underline-offset-4 hover:text-black hover:underline"
        >
          Back to shop
        </Link>

        <header className="mt-10 border-b border-black/10 pb-8">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-black/45 uppercase">
            Account settings
          </p>
          <h1 className="text-4xl font-medium tracking-normal md:text-5xl">
            Your account
          </h1>
          <p className="mt-5 text-base leading-7 text-black/65">
            Review the profile attached to your Google sign-in and delete the
            account when you no longer want Crazy Sajangnim to keep it.
          </p>
        </header>

        <section className="py-8">
          <h2 className="text-xl font-semibold">Profile</h2>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-black/50">Username</dt>
              <dd className="mt-1 text-black/80">
                {state.username ?? "Not chosen yet"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-black/50">Google name</dt>
              <dd className="mt-1 text-black/80">
                {state.name ?? "Not shared"}
              </dd>
            </div>
          </dl>
        </section>

        <DeleteAccountPanel />
      </div>
    </main>
  );
}
