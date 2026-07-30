import { NextResponse } from "next/server";

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
