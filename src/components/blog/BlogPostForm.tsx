"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

type SubmissionStatus =
  | { type: "idle"; message: "" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

export default function BlogPostForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SubmissionStatus>({
    type: "idle",
    message: "",
  });

  function clearPreviewUrls() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }

  function setFiles(files: File[]) {
    clearPreviewUrls();

    setSelectedFiles(files);
    setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
  }

  function rebuildFileInput(files: File[]) {
    if (!fileInputRef.current) {
      return;
    }

    const dataTransfer = new DataTransfer();

    files.forEach((file) => {
      dataTransfer.items.add(file);
    });

    fileInputRef.current.files = dataTransfer.files;
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      setFiles([]);
      return;
    }

    if (files.length > MAX_IMAGE_COUNT) {
      event.target.value = "";
      setFiles([]);

      setStatus({
        type: "error",
        message: `You can upload up to ${MAX_IMAGE_COUNT} images.`,
      });

      return;
    }

    const unsupportedFile = files.find(
      (file) =>
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ].includes(file.type),
    );

    if (unsupportedFile) {
      event.target.value = "";
      setFiles([]);

      setStatus({
        type: "error",
        message: `${unsupportedFile.name} is not a supported image type.`,
      });

      return;
    }

    const oversizedFile = files.find(
      (file) => file.size > MAX_IMAGE_SIZE,
    );

    if (oversizedFile) {
      event.target.value = "";
      setFiles([]);

      setStatus({
        type: "error",
        message: `${oversizedFile.name} is larger than 20 MB.`,
      });

      return;
    }

    setStatus({ type: "idle", message: "" });
    setFiles(files);
  }

  function removeImage(indexToRemove: number) {
    const nextFiles = selectedFiles.filter(
      (_, index) => index !== indexToRemove,
    );

    setFiles(nextFiles);
    rebuildFileInput(nextFiles);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setStatus({
        type: "error",
        message: "Please select at least one clothing image.",
      });

      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const formData = new FormData(event.currentTarget);

      formData.delete("images");

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch("/api/blog", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ?? "Failed to publish the post.",
        );
      }

      formRef.current?.reset();
      clearPreviewUrls();
      setSelectedFiles([]);
      setPreviewUrls([]);

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
          Upload up to five clothing photos. No account is required.
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
            htmlFor="images"
            className="mb-2 block text-sm font-semibold text-neutral-800"
          >
            Clothing images
          </label>

          <input
            ref={fileInputRef}
            id="images"
            name="images"
            type="file"
            required
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
            className="block w-full rounded-xl border border-dashed border-neutral-300 p-4 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-neutral-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />

          <p className="mt-2 text-xs text-neutral-500">
            Select 1–5 JPG, PNG, WebP, or GIF files. Maximum 20 MB
            per image.
          </p>
        </div>

        {previewUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {previewUrls.map((previewUrl, index) => (
              <div
                key={`${selectedFiles[index]?.name}-${index}`}
                className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={`Selected clothing preview ${index + 1}`}
                  className="aspect-square w-full object-cover"
                />

                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  aria-label={`Remove image ${index + 1}`}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-lg font-bold text-white transition hover:bg-black"
                >
                  ×
                </button>

                {index === 0 ? (
                  <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-neutral-900">
                    Cover
                  </span>
                ) : null}
              </div>
            ))}
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
