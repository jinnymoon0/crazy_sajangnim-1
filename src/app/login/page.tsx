import Link from "next/link";
import { redirect } from "next/navigation";

import AuthPanel from "@/components/auth/AuthPanel";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#f5f2ea] px-4 py-10 text-[#111111]">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition hover:text-neutral-950"
      >
        <span aria-hidden="true">←</span>
        Back to shopping
      </Link>

      <h1 className="font-diploma mb-8 text-center text-4xl">
        Crazy Sajangnim
      </h1>

      <AuthPanel />

      <p className="mt-6 max-w-md text-center text-xs leading-5 text-neutral-500">
        No email is required. Your password and security answer are
        stored as one-way hashes and can never be read back.
      </p>
    </main>
  );
}
