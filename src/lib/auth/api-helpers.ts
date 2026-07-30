import { NextResponse } from "next/server";

/*
 * Usernames accept letters and digits from any language (Unicode
 * property classes) plus dots, dashes, and underscores; 2–30 characters
 * so two-syllable Korean names work.
 */
export const USERNAME_PATTERN = /^[\p{L}\p{N}._-]{2,30}$/u;

export const USERNAME_RULES_MESSAGE =
  "Usernames are 2–30 characters: letters in any language, numbers, dots, dashes, underscores.";

/*
 * NFC normalization so visually identical names (e.g. composed vs
 * decomposed Hangul) resolve to the same account.
 */
export function normalizeUsername(value: string): string {
  return value.trim().normalize("NFC");
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function isMissingTableError(error: { code?: string }): boolean {
  // 42P01: raw Postgres missing relation; PGRST205: PostgREST schema cache.
  return error.code === "42P01" || error.code === "PGRST205";
}

export function accountsNotSetUpResponse(): NextResponse {
  return NextResponse.json(
    { error: "Accounts are not set up yet." },
    { status: 503 },
  );
}
