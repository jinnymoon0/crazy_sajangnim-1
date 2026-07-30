"use client";

import { signOut } from "next-auth/react";

export default function SignOutLink() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/login" })}
      className="text-sm text-neutral-500 underline transition hover:text-neutral-950"
    >
      Sign out
    </button>
  );
}
