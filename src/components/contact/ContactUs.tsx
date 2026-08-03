"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";

import { compressImageForUpload } from "@/lib/images/compress-image";

const TOPICS = [
  { value: "brand", label: "Request a brand" },
  { value: "bug", label: "Report a problem" },
  { value: "other", label: "Something else" },
] as const;

type Topic = (typeof TOPICS)[number]["value"];

const MAX_LENGTH = 2000;

const MAX_PHOTOS = 4;

const PLACEHOLDER = "Report any bug or request to add a new brand!";

interface Attachment {
  file: File;
  previewUrl: string;
}

export default function ContactUs() {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<Topic>("brand");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    messageRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function clearPhotos() {
    // Object URLs are held by the browser until revoked.
    for (const photo of photos) {
      URL.revokeObjectURL(photo.previewUrl);
    }

    setPhotos([]);
  }

  function close() {
    setOpen(false);
    setError(null);
    setSent(false);
    clearPhotos();
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const removed = current[index];

      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      return current.filter((_, i) => i !== index);
    });
  }

  /*
   * Shrink in the browser before sending. Phone photos are far larger
   * than a serverless request body may carry, and re-encoding turns an
   * iPhone HEIC into a JPEG that every browser can display.
   */
  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);

    event.target.value = "";

    if (chosen.length === 0) {
      return;
    }

    const room = MAX_PHOTOS - photos.length;

    if (room <= 0) {
      setError(`You can attach up to ${MAX_PHOTOS} photos.`);

      return;
    }

    setError(
      chosen.length > room ? `Only the first ${room} were added.` : null,
    );
    setIsPreparing(true);

    try {
      const prepared = await Promise.all(
        chosen.slice(0, room).map(async (file) => {
          const compressed = await compressImageForUpload(file);

          return {
            file: compressed,
            previewUrl: URL.createObjectURL(compressed),
          };
        }),
      );

      setPhotos((current) => [...current, ...prepared]);
    } catch {
      setError("That photo could not be prepared. Please try another.");
    } finally {
      setIsPreparing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = message.trim();

    if (!trimmed) {
      setError("Please write a message.");

      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const form = new FormData();

      form.set("topic", topic);
      form.set("message", trimmed);

      for (const photo of photos) {
        form.append("images", photo.file, photo.file.name);
      }

      const response = await fetch("/api/contact", {
        method: "POST",
        body: form,
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        sent?: boolean;
      } | null;

      /*
       * Only a confirmed save counts. Trusting the status alone would
       * report success for anything that answered 200 without storing
       * the message.
       */
      if (!response.ok || body?.sent !== true) {
        setError(body?.error ?? "The message could not be sent.");

        return;
      }

      setSent(true);
      setMessage("");
      clearPhotos();
    } catch {
      setError("The message could not be sent. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-black/15 bg-white px-3 py-2 text-xs transition hover:bg-black hover:text-white md:px-4 md:text-sm"
      >
        Contact us
      </button>

      {/*
        Rendered on the body rather than here in the header. The header
        carries backdrop-blur, and an element with a backdrop-filter
        becomes the containing block for fixed-position descendants — so
        inset-0 covered the 80px header instead of the screen, and
        centring the box inside it pushed its top out of view.
      */}
      {/* open only turns true from a click, so document exists by then. */}
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-black/40 p-4 sm:items-center"
              onMouseDown={(event) => {
                if (event.target === dialogRef.current?.parentElement) {
                  close();
                }
              }}
            >
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="contact-title"
                className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="contact-title" className="text-lg font-bold">
                      Contact us
                    </h2>

                    <p className="mt-1 text-sm text-black/60">
                      Ask for a brand you want on the site, tell us about a
                      problem, or say anything else.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-xl transition hover:bg-black/5"
                  >
                    ×
                  </button>
                </div>

                {sent ? (
                  <div className="mt-6">
                    <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
                      Thanks — your message is with us. We read every one.
                    </p>

                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setSent(false)}
                        className="rounded-full border border-black/15 px-4 py-2.5 text-sm transition hover:bg-black/5"
                      >
                        Send another
                      </button>

                      <button
                        type="button"
                        onClick={close}
                        className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black/80"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-5">
                    <fieldset>
                      <legend className="text-xs font-semibold uppercase tracking-wide text-black/50">
                        What is it about?
                      </legend>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {TOPICS.map((option) => (
                          <label
                            key={option.value}
                            className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                              topic === option.value
                                ? "border-black bg-black text-white"
                                : "border-black/15 hover:bg-black/5"
                            }`}
                          >
                            <input
                              type="radio"
                              name="topic"
                              value={option.value}
                              checked={topic === option.value}
                              onChange={() => setTopic(option.value)}
                              className="sr-only"
                            />

                            {option.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <label
                      htmlFor="contact-message"
                      className="mt-5 block text-xs font-semibold uppercase tracking-wide text-black/50"
                    >
                      Your message
                    </label>

                    <textarea
                      id="contact-message"
                      ref={messageRef}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      maxLength={MAX_LENGTH}
                      rows={6}
                      placeholder={PLACEHOLDER}
                      className="mt-2 w-full resize-y rounded-2xl border border-black/15 p-4 text-sm outline-none transition focus:border-black"
                    />

                    <div className="mt-1 flex items-center justify-between text-xs text-black/40">
                      <span>
                        {error ? (
                          <span role="alert" className="text-red-600">
                            {error}
                          </span>
                        ) : null}
                      </span>

                      <span>
                        {message.length}/{MAX_LENGTH}
                      </span>
                    </div>

                    {photos.length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-3">
                        {photos.map((photo, index) => (
                          <li key={photo.previewUrl} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.previewUrl}
                              alt={`Attachment ${index + 1}`}
                              className="size-20 rounded-xl border border-black/10 object-cover"
                            />

                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              aria-label={`Remove attachment ${index + 1}`}
                              className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-black text-xs text-white transition hover:bg-black/80"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,.heic,.heif"
                      multiple
                      onChange={handleFiles}
                      className="hidden"
                    />

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={isPreparing || photos.length >= MAX_PHOTOS}
                        className="rounded-full border border-black/15 px-4 py-2.5 text-sm transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isPreparing
                          ? "Adding photo..."
                          : photos.length > 0
                            ? `Add photo (${photos.length}/${MAX_PHOTOS})`
                            : "Add photo"}
                      </button>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={close}
                          className="rounded-full border border-black/15 px-4 py-2.5 text-sm transition hover:bg-black/5"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={
                            isSending ||
                            isPreparing ||
                            message.trim().length === 0
                          }
                          className="rounded-full bg-black px-6 py-2.5 text-sm font-bold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isSending ? "Sending..." : "Send"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
