"use client";

import { signOut } from "next-auth/react";
import posthog from "posthog-js";

export default function SignOutLink() {
  return (
    <button
      type="button"
      onClick={() => {
        posthog.reset();
        void signOut({ callbackUrl: "/login" });
      }}
      className="text-sm text-neutral-500 underline transition hover:text-neutral-950"
    >
      Sign out
    </button>
  );
}
