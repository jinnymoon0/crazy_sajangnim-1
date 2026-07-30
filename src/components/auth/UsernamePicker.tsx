"use client";

import { type FormEvent, useState } from "react";

export default function UsernamePicker() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/account/username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(body.error ?? "Failed to save the username.");

        return;
      }

      // Full reload so every part of the site sees the new username.
      window.location.href = "/";
    } catch {
      setError("Failed to save the username.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="username"
          className="mb-2 block text-sm font-semibold text-neutral-800"
        >
          Username
        </label>

        <input
          id="username"
          type="text"
          required
          minLength={2}
          maxLength={30}
          autoFocus
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="예: 미친사장님 / crazy_sajang"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
        />

        <p className="mt-2 text-xs text-neutral-500">
          2–30 characters in any language — letters, numbers, dots,
          dashes, and underscores. This cannot be changed later.
        </p>
      </div>

      {error ? (
        <p role="status" className="text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Start browsing"}
      </button>
    </form>
  );
}
