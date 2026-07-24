"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type SubmissionStatus =
  | { type: "idle"; message: "" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

export default function BlogPostForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SubmissionStatus>({
    type: "idle",
    message: "",
  });

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!file) {
      setPreviewUrl(null);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      event.target.value = "";
      setPreviewUrl(null);
      setStatus({
        type: "error",
        message: "The image must be 5 MB or smaller.",
      });
      return;
    }

    setStatus({ type: "idle", message: "" });
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const formData = new FormData(event.currentTarget);

      const response = await fetch("/api/blog", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to publish the post.");
      }

      formRef.current?.reset();

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(null);
      setStatus({
        type: "success",
        message: "Your clothing post has been published.",
      });

      router.refresh();
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to publish the post.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Community
        </p>

        <h2 className="mt-2 text-2xl font-bold text-neutral-950">
          Share a clothing find
        </h2>

        <p className="mt-2 text-sm leading-6 text-neutral-600">
          No account is required. Upload a clothing photo and tell the
          community about it.
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        >
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div>
          <label
            htmlFor="authorName"
            className="mb-2 block text-sm font-semibold text-neutral-800"
          >
            Display name
          </label>

          <input
            id="authorName"
            name="authorName"
            type="text"
            maxLength={40}
            placeholder="Anonymous"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
          />
        </div>

        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-semibold text-neutral-800"
          >
            Title
          </label>

          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={120}
            placeholder="Example: Lemaire jacket found on sale"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
          />
        </div>

        <div>
          <label
            htmlFor="content"
            className="mb-2 block text-sm font-semibold text-neutral-800"
          >
            Description
          </label>

          <textarea
            id="content"
            name="content"
            required
            maxLength={5000}
            rows={6}
            placeholder="Describe the item, fit, material, price, styling ideas, or where you found it."
            className="w-full resize-y rounded-xl border border-neutral-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-neutral-950"
          />
        </div>

        <div>
          <label
            htmlFor="image"
            className="mb-2 block text-sm font-semibold text-neutral-800"
          >
            Clothing image
          </label>

          <input
            id="image"
            name="image"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
            className="block w-full rounded-xl border border-dashed border-neutral-300 p-4 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-neutral-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />

          <p className="mt-2 text-xs text-neutral-500">
            JPG, PNG, WebP, or GIF. Maximum size: 5 MB.
          </p>
        </div>

        {previewUrl ? (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Selected clothing preview"
              className="max-h-[480px] w-full object-contain"
            />
          </div>
        ) : null}

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
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Publishing..." : "Publish post"}
        </button>
      </form>
    </section>
  );
}
