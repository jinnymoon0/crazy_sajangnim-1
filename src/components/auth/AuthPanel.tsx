"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { SECURITY_QUESTIONS } from "@/constants/security-questions";

type Mode = "login" | "signup" | "forgot";

type Status =
  | { type: "idle"; message: "" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

const IDLE_STATUS: Status = { type: "idle", message: "" };

const inputClassName =
  "w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-950";

const labelClassName =
  "mb-2 block text-sm font-semibold text-neutral-800";

export default function AuthPanel() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(IDLE_STATUS);

  // Forgot-password flow: the question arrives after the username step.
  const [resetQuestion, setResetQuestion] = useState<string | null>(null);
  const [resetUsername, setResetUsername] = useState("");

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setStatus(IDLE_STATUS);
    setResetQuestion(null);
    setResetUsername("");
  }

  async function postJson(
    url: string,
    method: "POST" | "PUT",
    payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; body: Record<string, unknown> }> {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    return { ok: response.ok, body };
  }

  function errorMessage(
    body: Record<string, unknown>,
    fallback: string,
  ): string {
    return typeof body.error === "string" && body.error
      ? body.error
      : fallback;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);
    setStatus(IDLE_STATUS);

    try {
      const { ok, body } = await postJson("/api/auth/login", "POST", {
        username: String(formData.get("username") ?? ""),
        password: String(formData.get("password") ?? ""),
      });

      if (!ok) {
        setStatus({
          type: "error",
          message: errorMessage(body, "Failed to log in."),
        });

        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setStatus({ type: "error", message: "Failed to log in." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");

    if (password !== confirm) {
      setStatus({
        type: "error",
        message: "The passwords do not match.",
      });

      return;
    }

    setIsSubmitting(true);
    setStatus(IDLE_STATUS);

    try {
      const { ok, body } = await postJson("/api/auth/signup", "POST", {
        username: String(formData.get("username") ?? ""),
        password,
        securityQuestion: Number(formData.get("securityQuestion") ?? -1),
        securityAnswer: String(formData.get("securityAnswer") ?? ""),
        website: String(formData.get("website") ?? ""),
      });

      if (!ok) {
        setStatus({
          type: "error",
          message: errorMessage(body, "Failed to create the account."),
        });

        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setStatus({
        type: "error",
        message: "Failed to create the account.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();

    setIsSubmitting(true);
    setStatus(IDLE_STATUS);

    try {
      const { ok, body } = await postJson("/api/auth/reset", "POST", {
        username,
      });

      if (!ok) {
        setStatus({
          type: "error",
          message: errorMessage(body, "Failed to look up the account."),
        });

        return;
      }

      setResetUsername(username);
      setResetQuestion(
        typeof body.question === "string"
          ? body.question
          : SECURITY_QUESTIONS[0],
      );
    } catch {
      setStatus({
        type: "error",
        message: "Failed to look up the account.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirm) {
      setStatus({
        type: "error",
        message: "The passwords do not match.",
      });

      return;
    }

    setIsSubmitting(true);
    setStatus(IDLE_STATUS);

    try {
      const { ok, body } = await postJson("/api/auth/reset", "PUT", {
        username: resetUsername,
        securityAnswer: String(formData.get("securityAnswer") ?? ""),
        newPassword,
      });

      if (!ok) {
        setStatus({
          type: "error",
          message: errorMessage(body, "Failed to reset the password."),
        });

        return;
      }

      setStatus({
        type: "success",
        message: "Your password has been reset. Please log in.",
      });

      setMode("login");
      setResetQuestion(null);
      setResetUsername("");
    } catch {
      setStatus({
        type: "error",
        message: "Failed to reset the password.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex rounded-full border border-black/15 bg-neutral-100 p-1 text-sm">
        {(
          [
            ["login", "Log in"],
            ["signup", "Create account"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            className={`flex-1 rounded-full px-3 py-2 font-semibold transition ${
              mode === value
                ? "bg-neutral-950 text-white"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {status.message ? (
        <p
          role="status"
          className={`mb-4 text-sm font-medium ${
            status.type === "error"
              ? "text-red-600"
              : "text-emerald-700"
          }`}
        >
          {status.message}
        </p>
      ) : null}

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-username" className={labelClassName}>
              Username
            </label>

            <input
              id="login-username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="login-password" className={labelClassName}>
              Password
            </label>

            <input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={inputClassName}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>

          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="block w-full text-center text-sm text-neutral-500 underline transition hover:text-neutral-950"
          >
            Forgot your password?
          </button>
        </form>
      ) : null}

      {mode === "signup" ? (
        <form onSubmit={handleSignup} className="space-y-4">
          <div
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
          >
            <label htmlFor="signup-website">Website</label>

            <input
              id="signup-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="signup-username" className={labelClassName}>
              Username
            </label>

            <input
              id="signup-username"
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9._\-]{3,30}"
              title="3–30 characters: letters, numbers, dots, dashes, underscores."
              autoComplete="username"
              className={inputClassName}
            />

            <p className="mt-2 text-xs text-neutral-500">
              3–30 characters. Letters, numbers, dots, dashes, and
              underscores.
            </p>
          </div>

          <div>
            <label htmlFor="signup-password" className={labelClassName}>
              Password
            </label>

            <input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="signup-confirm-password"
              className={labelClassName}
            >
              Confirm password
            </label>

            <input
              id="signup-confirm-password"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="signup-security-question"
              className={labelClassName}
            >
              Security question
            </label>

            <select
              id="signup-security-question"
              name="securityQuestion"
              required
              className={inputClassName}
            >
              {SECURITY_QUESTIONS.map((question, index) => (
                <option key={question} value={index}>
                  {question}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-neutral-500">
              You will answer this question to reset a forgotten
              password.
            </p>
          </div>

          <div>
            <label
              htmlFor="signup-security-answer"
              className={labelClassName}
            >
              Your answer
            </label>

            <input
              id="signup-security-answer"
              name="securityAnswer"
              type="text"
              required
              maxLength={100}
              className={inputClassName}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      ) : null}

      {mode === "forgot" && !resetQuestion ? (
        <form onSubmit={handleForgotLookup} className="space-y-4">
          <p className="text-sm leading-6 text-neutral-600">
            Enter your username and answer your security question to set
            a new password.
          </p>

          <div>
            <label htmlFor="forgot-username" className={labelClassName}>
              Username
            </label>

            <input
              id="forgot-username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className={inputClassName}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Looking up..." : "Continue"}
          </button>

          <button
            type="button"
            onClick={() => switchMode("login")}
            className="block w-full text-center text-sm text-neutral-500 underline transition hover:text-neutral-950"
          >
            Back to log in
          </button>
        </form>
      ) : null}

      {mode === "forgot" && resetQuestion ? (
        <form onSubmit={handleForgotReset} className="space-y-4">
          <p className="text-sm leading-6 text-neutral-600">
            Answer the security question for{" "}
            <span className="font-semibold text-neutral-900">
              {resetUsername}
            </span>
            .
          </p>

          <div>
            <label
              htmlFor="forgot-security-answer"
              className={labelClassName}
            >
              {resetQuestion}
            </label>

            <input
              id="forgot-security-answer"
              name="securityAnswer"
              type="text"
              required
              maxLength={100}
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="forgot-new-password"
              className={labelClassName}
            >
              New password
            </label>

            <input
              id="forgot-new-password"
              name="newPassword"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="forgot-confirm-password"
              className={labelClassName}
            >
              Confirm new password
            </label>

            <input
              id="forgot-confirm-password"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
