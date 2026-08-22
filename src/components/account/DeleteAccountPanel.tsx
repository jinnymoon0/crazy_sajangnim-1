"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { signOut } from "next-auth/react";
import posthog from "posthog-js";

export default function DeleteAccountPanel() {
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    if (!confirmed || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/account/me", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to delete the account.");
      }

      posthog.reset();
      await signOut({ callbackUrl: "/login?accountDeleted=1" });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to delete the account.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <section className="border-t border-black/10 pt-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Delete account</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-black/65">
            This removes your Google-linked profile, username, email, avatar,
            account likes, and the account link on visits, messages, posts,
            and comments. Public posts and comments remain visible under the
            display name saved when they were written.
          </p>
        </div>
      </div>

      <label className="mt-6 flex max-w-2xl items-start gap-3 text-sm leading-6 text-black/70">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 size-4 accent-black"
        />
        <span>
          I understand this permanently deletes my account profile and signs me
          out.
        </span>
      </label>

      {error ? (
        <p className="mt-4 text-sm font-medium text-red-700">{error}</p>
      ) : null}

      <button
        type="button"
        disabled={!confirmed || isDeleting}
        onClick={deleteAccount}
        className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-700 bg-red-700 px-5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:border-black/15 disabled:bg-black/10 disabled:text-black/35"
      >
        <Trash2 size={16} aria-hidden="true" />
        {isDeleting ? "Deleting..." : "Delete account"}
      </button>
    </section>
  );
}
