"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import type { BlogComment } from "@/types/blog";

type BlogCommentsProps = {
  postId: string;
  initialComments: BlogComment[];
  commentsReady: boolean;
  /** The signed-in account's username — comments post under it. */
  username: string;
};

type SubmissionStatus =
  | { type: "idle"; message: "" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

function formatCommentDate(dateValue: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

export default function BlogComments({
  postId,
  initialComments,
  commentsReady,
  username,
}: BlogCommentsProps) {
  const [comments, setComments] = useState<BlogComment[]>(initialComments);
  const [content, setContent] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SubmissionStatus>({
    type: "idle",
    message: "",
  });

  const refreshComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/blog/${postId}/comments`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as {
        comments?: BlogComment[];
      };

      setComments(body.comments ?? []);
    } catch {
      // Keep the current list when a refresh fails.
    }
  }, [postId]);

  useEffect(() => {
    if (!commentsReady) {
      return;
    }

    // Defer past the render tick; the strict effect lint rejects
    // state updates started synchronously inside an effect.
    const timer = window.setTimeout(() => {
      void refreshComments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [commentsReady, refreshComments]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      setStatus({
        type: "error",
        message: "Please enter a comment.",
      });

      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch(`/api/blog/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          website,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to post the comment.");
      }

      setContent("");
      setStatus({
        type: "success",
        message: "Your comment has been posted.",
      });

      await refreshComments();
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to post the comment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Comments"
      className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-neutral-500">
        Comments
      </h2>

      <p className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
        {comments.length}{" "}
        {comments.length === 1 ? "comment" : "comments"}
      </p>

      {comments.length > 0 ? (
        <ul className="mt-6 space-y-5">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-2xl bg-neutral-100 px-5 py-4"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-semibold text-neutral-800">
                  {comment.author_name}
                </span>

                <time
                  dateTime={comment.created_at}
                  className="text-xs text-neutral-500"
                >
                  {formatCommentDate(comment.created_at)}
                </time>
              </div>

              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">
                {comment.content}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-neutral-500">
          No comments yet. Share your thoughts on this find.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        >
          <label htmlFor={`comment-website-${postId}`}>Website</label>

          <input
            id={`comment-website-${postId}`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor={`comment-content-${postId}`}
            className="mb-2 block text-sm font-semibold text-neutral-800"
          >
            Comment as{" "}
            <span className="font-bold text-neutral-950">{username}</span>
          </label>

          <textarea
            id={`comment-content-${postId}`}
            required
            maxLength={1000}
            rows={4}
            placeholder="What do you think about this find?"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="w-full resize-y rounded-xl border border-neutral-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-neutral-950"
          />
        </div>

        {status.message ? (
          <p
            role="status"
            className={
              status.type === "error"
                ? "text-sm font-medium text-red-600"
                : "text-sm font-medium text-emerald-700"
            }
          >
            {status.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Posting..." : "Post comment"}
        </button>
      </form>
    </section>
  );
}
