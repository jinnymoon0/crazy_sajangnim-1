"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

const TOPICS = [
  { value: "brand", label: "Request a brand" },
  { value: "bug", label: "Report a problem" },
  { value: "other", label: "Something else" },
] as const;

type Topic = (typeof TOPICS)[number]["value"];

const MAX_LENGTH = 2000;

export default function ContactUs() {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<Topic>("brand");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

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

  function close() {
    setOpen(false);
    setError(null);
    setSent(false);
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
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, message: trimmed }),
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

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
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
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl"
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
                  placeholder={
                    topic === "brand"
                      ? "Which brand would you like to see on sale here?"
                      : topic === "bug"
                        ? "What went wrong, and where were you on the site?"
                        : "Tell us anything."
                  }
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

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full border border-black/15 px-4 py-2.5 text-sm transition hover:bg-black/5"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSending || message.trim().length === 0}
                    className="rounded-full bg-black px-6 py-2.5 text-sm font-bold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSending ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
