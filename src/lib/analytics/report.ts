"use client";

/*
 * Telling the server what someone did, from the browser.
 *
 * Never awaited by the thing that triggered it. A click that leaves for
 * a retailer must not wait on our own bookkeeping, so the report is
 * sent with sendBeacon where it exists — which survives the page going
 * away — and falls back to a keepalive fetch.
 */

export type ReportableKind = "search" | "retailer_click";

export interface ReportInput {
  kind: ReportableKind;
  market?: string | null;
  gender?: string | null;
  metadata?: Record<string, unknown>;
}

export function report(input: ReportInput): void {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    ...input,
    path: `${window.location.pathname}${window.location.search}`,
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/events",
        new Blob([body], { type: "application/json" }),
      );

      return;
    }

    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* Analytics never surfaces to the person using the site. */
    });
  } catch {
    /* Likewise. */
  }
}

/*
 * Searches arrive as a burst — picking four brands is four changes, not
 * four searches. Waiting for the filters to settle records the query
 * someone actually meant, and turns a dozen rows into one.
 */
let pending: ReturnType<typeof setTimeout> | null = null;

export function reportSearch(input: Omit<ReportInput, "kind">): void {
  if (pending) {
    clearTimeout(pending);
  }

  pending = setTimeout(() => {
    pending = null;

    report({ ...input, kind: "search" });
  }, 800);
}
