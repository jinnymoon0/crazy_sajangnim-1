"use client";

import { useState } from "react";

interface BlogLikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export default function BlogLikeButton({
  postId,
  initialLiked,
  initialCount,
}: BlogLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    // Show the change straight away, and put it back if it fails.
    const previous = { liked, count };

    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);

    try {
      const response = await fetch(`/api/blog/${postId}/like`, {
        method: "POST",
      });

      const body = (await response.json().catch(() => null)) as {
        liked?: boolean;
        likeCount?: number;
        error?: string;
      } | null;

      /*
       * Only a reply that says what happened counts. A lapsed session is
       * answered by the login page, which is a 200 — taking that as
       * success would leave a like showing that was never saved.
       */
      if (!response.ok || typeof body?.likeCount !== "number") {
        setLiked(previous.liked);
        setCount(previous.count);
        setError(body?.error ?? "Your like could not be saved.");

        return;
      }

      setLiked(body.liked === true);
      setCount(body.likeCount);
    } catch {
      setLiked(previous.liked);
      setCount(previous.count);
      setError("Your like could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={isSaving}
        aria-pressed={liked}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
          liked
            ? "border-red-200 bg-red-50 text-red-600"
            : "border-black/15 text-neutral-700 hover:bg-black/5"
        }`}
      >
        <span aria-hidden="true">{liked ? "♥" : "♡"}</span>

        {count} {count === 1 ? "like" : "likes"}
      </button>

      {error ? (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
