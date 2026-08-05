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
  /** The signed-in account's id, to know which comments are theirs. */
  viewerId: string;
  /** The super admin may remove anyone's comment, not only their own. */
  isSuperAdmin: boolean;
};

type SubmissionStatus =
  | { type: "idle"; message: "" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

/*
 * How far replies indent before they stop moving right. Matches the
 * limit the API enforces when saving, so what is drawn and what is
 * stored agree.
 */
const MAX_THREAD_DEPTH = 6;

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
  viewerId,
  isSuperAdmin,
}: BlogCommentsProps) {
  const [comments, setComments] = useState<BlogComment[]>(initialComments);
  const [content, setContent] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  async function postComment(
    text: string,
    parentId: string | null,
  ): Promise<boolean> {
    const response = await fetch(`/api/blog/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, website, parentId }),
    });

    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(result.error ?? "Failed to post the comment.");
    }

    return true;
  }

  async function handleReply(parentId: string) {
    if (!replyContent.trim()) {
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      await postComment(replyContent, parentId);

      setReplyContent("");
      setReplyingTo(null);
      setStatus({ type: "success", message: "Your reply has been posted." });

      await refreshComments();
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to post the reply.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(comment: BlogComment, replyCount: number) {
    /*
     * Deleting takes the replies underneath with it, so say so before
     * doing it rather than after.
     */
    const warning =
      replyCount > 0
        ? `Delete this comment and the ${replyCount} ${
            replyCount === 1 ? "reply" : "replies"
          } under it?`
        : "Delete this comment?";

    if (!window.confirm(warning)) {
      return;
    }

    setDeletingId(comment.id);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch(
        `/api/blog/${postId}/comments/${comment.id}`,
        { method: "DELETE" },
      );

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete the comment.");
      }

      setStatus({ type: "success", message: "The comment has been deleted." });

      await refreshComments();
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete the comment.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  const topLevel = comments.filter((comment) => !comment.parent_id);

  const repliesByParent = new Map<string, BlogComment[]>();

  for (const comment of comments) {
    if (!comment.parent_id) {
      continue;
    }

    const thread = repliesByParent.get(comment.parent_id) ?? [];

    thread.push(comment);
    repliesByParent.set(comment.parent_id, thread);
  }

  /*
   * Everything below a comment, however deep, so the confirmation can
   * say how much is about to go.
   */
  function countDescendants(commentId: string): number {
    const replies = repliesByParent.get(commentId) ?? [];

    return replies.reduce(
      (total, reply) => total + 1 + countDescendants(reply.id),
      0,
    );
  }

  function canDelete(comment: BlogComment): boolean {
    return isSuperAdmin || (Boolean(comment.user_id) && comment.user_id === viewerId);
  }

  function renderReplyBox(parentId: string) {
    return (
      <div className="mt-3">
        <textarea
          value={replyContent}
          onChange={(event) => setReplyContent(event.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Write a reply"
          className="w-full resize-y rounded-xl border border-black/15 bg-white p-3 text-sm outline-none transition focus:border-neutral-950"
        />

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setReplyingTo(null);
              setReplyContent("");
            }}
            className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-black/5"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void handleReply(parentId)}
            disabled={isSubmitting || replyContent.trim().length === 0}
            className="rounded-full bg-neutral-950 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Posting..." : "Reply"}
          </button>
        </div>
      </div>
    );
  }

  /*
   * A comment and everything answering it. Rendered by recursion so a
   * reply to a reply keeps going, rather than one fixed level of
   * nesting.
   */
  function renderComment(comment: BlogComment, depth: number) {
    const replies = repliesByParent.get(comment.id) ?? [];
    const isTopLevel = depth === 0;

    return (
      <li
        key={comment.id}
        className={
          isTopLevel ? "rounded-2xl bg-neutral-100 px-5 py-4" : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {isTopLevel ? null : (
            <span aria-hidden="true" className="text-neutral-400">
              ↳
            </span>
          )}

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

        <p
          className={`${
            isTopLevel ? "mt-2" : "mt-1"
          } whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700`}
        >
          {comment.content}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setReplyingTo(replyingTo === comment.id ? null : comment.id);
              setReplyContent("");
            }}
            className="text-xs font-semibold text-neutral-500 transition hover:text-neutral-950"
          >
            {replyingTo === comment.id ? "Cancel" : "Reply"}
          </button>

          {/*
            Shown to the writer and to the super admin. The route checks
            this too — hiding the button would leave it open to anyone
            calling the API directly.
          */}
          {canDelete(comment) ? (
            <button
              type="button"
              onClick={() =>
                void handleDelete(comment, countDescendants(comment.id))
              }
              disabled={deletingId === comment.id}
              className="text-xs font-semibold text-neutral-500 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deletingId === comment.id ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>

        {replyingTo === comment.id ? renderReplyBox(comment.id) : null}

        {replies.length > 0 ? (
          <ul
            className={`mt-3 space-y-3 border-l-2 border-neutral-300 ${
              depth + 1 >= MAX_THREAD_DEPTH ? "pl-2" : "pl-4"
            }`}
          >
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  }

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
      await postComment(content, null);

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
          {topLevel.map((comment) => renderComment(comment, 0))}
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
