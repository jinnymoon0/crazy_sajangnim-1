import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth/session";
import SignOutLink from "@/components/auth/SignOutLink";
import UsernamePicker from "@/components/auth/UsernamePicker";

export const dynamic = "force-dynamic";

export default async function ChooseUsernamePage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  // Our own paths only, or this becomes a way to forward people out.
  const destination =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : null;

  const state = await getAuthState();

  if (!state.authenticated) {
    redirect(`/login${destination ? `?callbackUrl=${encodeURIComponent(destination)}` : ""}`);
  }

  if (state.username) {
    redirect(destination ?? "/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#f5f2ea] px-4 py-10 text-[#111111]">
      <h1 className="font-diploma mb-3 mt-10 text-center text-4xl">
        Crazy Sajangnim
      </h1>

      <p className="mb-8 max-w-sm text-center text-sm leading-6 text-neutral-600">
        {state.name ? `Welcome, ${state.name}! ` : "Welcome! "}
        Choose the username that will appear on your posts and
        comments.
      </p>

      <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <UsernamePicker destination={destination} />
      </section>

      <div className="mt-6">
        <SignOutLink />
      </div>
    </main>
  );
}
