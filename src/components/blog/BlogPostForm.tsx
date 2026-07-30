"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { compressImageForUpload } from "@/lib/images/compress-image";
import { formatPrice } from "@/lib/utils";
import {
  BLOG_SHARE_DRAFT_KEY,
  type BlogShareDraft,
} from "@/types/blog";

const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

// Vercel serverless functions reject request bodies larger than ~4.5 MB, so the
// combined size of the compressed images we upload must stay under that ceiling.
const MAX_UPLOAD_TOTAL_BYTES = 4.3 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
]);

function isSupportedImage(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  return (
    ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase()) ||
    ALLOWED_IMAGE_EXTENSIONS.has(extension)
  );
}

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
  const [sharedImageUrl, setSharedImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [status, setStatus] = useState<SubmissionStatus>({
    type: "idle",
    message: "",
  });

  /*
   * Prefill the form when arriving from a product card's
   * "Share on blog" button. Deferred one tick: the strict effect
   * lint rejects state updates started synchronously in an effect.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      let draft: BlogShareDraft;

      try {
        const raw = sessionStorage.getItem(BLOG_SHARE_DRAFT_KEY);

        if (!raw) {
          return;
        }

        sessionStorage.removeItem(BLOG_SHARE_DRAFT_KEY);
        draft = JSON.parse(raw) as BlogShareDraft;
      } catch {
        return;
      }

      if (!draft?.productName || !draft?.brandName) {
        return;
      }

      const form = formRef.current;

      const titleInput =
        form?.querySelector<HTMLInputElement>("#title");

      const contentInput =
        form?.querySelector<HTMLTextAreaElement>("#content");

      if (titleInput && !titleInput.value) {
        const startsWithBrand = draft.productName
          .toLowerCase()
          .startsWith(draft.brandName.toLowerCase());

        titleInput.value = (
          startsWithBrand
            ? draft.productName
            : `${draft.brandName} ${draft.productName}`
        ).slice(0, 120);
      }

      if (contentInput && !contentInput.value) {
        const priceLine = draft.originalPrice
          ? `${formatPrice(draft.salePrice, draft.currency)} (was ${formatPrice(
              draft.originalPrice,
              draft.currency,
            )}${
              draft.discountPercentage
                ? `, ${draft.discountPercentage}% off`
                : ""
            })`
          : formatPrice(draft.salePrice, draft.currency);

        contentInput.value = [
          "Found this on sale!",
          "",
          `Brand: ${draft.brandName}`,
          `Item: ${draft.productName}`,
          `Price: ${priceLine}`,
          `From: ${draft.sourceName}`,
          `Link: ${draft.sourceUrl}`,
        ]
          .join("\n")
          .slice(0, 5000);
      }

      if (draft.imageUrl && /^https:\/\//i.test(draft.imageUrl)) {
        setSharedImageUrl(draft.imageUrl);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

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

    const maxSelectableFiles =
      MAX_IMAGE_COUNT - (sharedImageUrl ? 1 : 0);

    if (files.length > maxSelectableFiles) {
      event.target.value = "";
      setFiles([]);

      setStatus({
        type: "error",
        message: sharedImageUrl
          ? `You can add up to ${maxSelectableFiles} more images alongside the shared item image.`
          : `You can upload up to ${MAX_IMAGE_COUNT} images.`,
      });

      return;
    }

    const unsupportedFile = files.find(
      (file) => !isSupportedImage(file),
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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    if (selectedFiles.length === 0 && !sharedImageUrl) {
      setStatus({
        type: "error",
        message: "Please select at least one clothing image.",
      });

      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      // Shrink photos in the browser so the request stays under the upload size
      // limit (and so iPhone HEIC photos become universally viewable JPEGs).
      setIsOptimizing(true);

      const uploadFiles = await Promise.all(
        selectedFiles.map((file) => compressImageForUpload(file)),
      );

      setIsOptimizing(false);

      const totalBytes = uploadFiles.reduce(
        (sum, file) => sum + file.size,
        0,
      );

      if (totalBytes > MAX_UPLOAD_TOTAL_BYTES) {
        setStatus({
          type: "error",
          message:
            "These images are too large to upload from this browser. Please use JPG or PNG photos, or upload fewer at a time.",
        });

        return;
      }

      const formData = new FormData(form);

      formData.delete("images");

      uploadFiles.forEach((file) => {
        formData.append("images", file);
      });

      if (sharedImageUrl) {
        formData.append("sharedImageUrls", sharedImageUrl);
      }

      const response = await fetch("/api/blog", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ??
            `Failed to publish the post. (${response.status})`,
        );
      }

      formRef.current?.reset();
      clearPreviewUrls();
      setSelectedFiles([]);
      setPreviewUrls([]);
      setSharedImageUrl(null);

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
            : typeof error === "string"
              ? error
              : "Failed to publish the post.",
      });
    } finally {
      setIsOptimizing(false);
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
            required={!sharedImageUrl}
            multiple
            accept="image/*,.heic,.heif"
            onChange={handleImageChange}
            className="block w-full rounded-xl border border-dashed border-neutral-300 p-4 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-neutral-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />

          <p className="mt-2 text-xs text-neutral-500">
            Select 1–5 JPG, PNG, WebP, GIF, HEIC, or HEIF files.
            Maximum 20 MB per image.
          </p>
        </div>

        {sharedImageUrl || previewUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {sharedImageUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sharedImageUrl}
                  alt="Shared item preview"
                  className="aspect-square w-full object-cover"
                  onError={() => setSharedImageUrl(null)}
                />

                <button
                  type="button"
                  onClick={() => setSharedImageUrl(null)}
                  aria-label="Remove shared item image"
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-lg font-bold text-white transition hover:bg-black"
                >
                  ×
                </button>

                <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-neutral-900">
                  Cover · Shared item
                </span>
              </div>
            ) : null}

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

                {!sharedImageUrl && index === 0 ? (
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
          {isOptimizing
            ? "Optimizing images..."
            : isSubmitting
              ? "Publishing..."
              : "Publish post"}
        </button>
      </form>
    </section>
  );
}
