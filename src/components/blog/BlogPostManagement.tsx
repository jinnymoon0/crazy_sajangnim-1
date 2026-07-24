"use client";

import {
  type FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type BlogPostManagementProps = {
  postId: string;
  initialTitle: string;
  initialContent: string;
};

type Status = {
  type: "idle" | "error" | "success";
  message: string;
};

export default function BlogPostManagement({
  postId,
  initialTitle,
  initialContent,
}: BlogPostManagementProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "delete">("edit");
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>({
    type: "idle",
    message: "",
  });

  function openManager(nextMode: "edit" | "delete") {
    setMode(nextMode);
    setStatus({
      type: "idle",
      message: "",
    });
    setIsOpen(true);
  }

  function closeManager() {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
    setStatus({
      type: "idle",
      message: "",
    });
  }

  async function handleEdit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setIsSubmitting(true);
    setStatus({
      type: "idle",
      message: "",
    });

    try {
      const response = await fetch(`/api/blog/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ?? "Failed to update the post.",
        );
      }

      setStatus({
        type: "success",
        message: "The post was updated.",
      });

      router.refresh();

      window.setTimeout(() => {
        setIsOpen(false);
      }, 700);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update the post.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const confirmed = window.confirm(
      "Delete this post permanently? Its uploaded images will also be removed.",
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setStatus({
      type: "idle",
      message: "",
    });

    try {
      const response = await fetch(`/api/blog/${postId}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ?? "Failed to delete the post.",
        );
      }

      router.push("/blog");
      router.refresh();
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete the post.",
      });

      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-8 border-t border-neutral-200 pt-6">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-neutral-500">
        Manage post
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => openManager("edit")}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 hover:bg-neutral-950 hover:text-white"
        >
          Edit post
        </button>

        <button
          type="button"
          onClick={() => openManager("delete")}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-700 transition hover:border-red-700 hover:bg-red-700 hover:text-white"
        >
          Delete post
        </button>
      </div>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-post-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="manage-post-title"
                  className="text-2xl font-black text-neutral-950"
                >
                  {mode === "edit"
                    ? "Edit post"
                    : "Delete post"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {mode === "edit"
                    ? "Update the title or description."
                    : "This action permanently deletes the post."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeManager}
                aria-label="Close"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl text-neutral-700 hover:bg-neutral-200"
              >
                ×
              </button>
            </div>

            {mode === "edit" ? (
              <form
                onSubmit={handleEdit}
                className="mt-6 space-y-5"
              >
                <div>
                  <label
                    htmlFor="editTitle"
                    className="mb-2 block text-sm font-semibold text-neutral-800"
                  >
                    Title
                  </label>

                  <input
                    id="editTitle"
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    required
                    maxLength={120}
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label
                    htmlFor="editContent"
                    className="mb-2 block text-sm font-semibold text-neutral-800"
                  >
                    Description
                  </label>

                  <textarea
                    id="editContent"
                    value={content}
                    onChange={(event) =>
                      setContent(event.target.value)
                    }
                    required
                    maxLength={5000}
                    rows={8}
                    className="w-full resize-y rounded-xl border border-neutral-300 px-4 py-3 leading-7 outline-none focus:border-neutral-950"
                  />
                </div>

                {status.message ? (
                  <p
                    role="status"
                    className={
                      status.type === "error"
                        ? "text-sm font-semibold text-red-600"
                        : "text-sm font-semibold text-emerald-700"
                    }
                  >
                    {status.message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : "Save changes"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleDelete}
                className="mt-6 space-y-5"
              >
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                  This permanently deletes the post and all uploaded
                  images associated with it.
                </div>

                {status.message ? (
                  <p
                    role="status"
                    className="text-sm font-semibold text-red-600"
                  >
                    {status.message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Deleting..."
                    : "Delete permanently"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
