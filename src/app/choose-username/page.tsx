import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth/session";
import UsernamePicker from "@/components/auth/UsernamePicker";

export const dynamic = "force-dynamic";

export default async function ChooseUsernamePage() {
  const state = await getAuthState();

  if (!state.authenticated) {
    redirect("/login");
  }

  if (state.username) {
    redirect("/");
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
        <UsernamePicker />
      </section>
    </main>
  );
}
