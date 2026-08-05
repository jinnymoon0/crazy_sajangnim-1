import { getSupabaseAdmin } from "@/lib/supabase/admin";

/*
 * Recording what happened, without ever being the reason a request
 * fails.
 *
 * Every function here swallows its own errors. Analytics is a
 * by-product: if the events table is missing, or slow, or the write is
 * refused, the thing the visitor asked for still has to work. The one
 * unforgivable outcome is a shop that will not show products because it
 * could not write down that someone looked at them.
 */

export type EventKind = "search" | "retailer_click" | "latency" | "failure";

export interface SiteEvent {
  kind: EventKind;
  visitorId?: string | null;
  userId?: string | null;
  path?: string | null;
  market?: string | null;
  gender?: string | null;
  metadata?: Record<string, unknown>;
  durationMs?: number | null;
}

let tableMissing = false;

/*
 * Returns whether the row was actually written, so a caller can report
 * honestly. Saying "recorded" when the table does not exist turns a
 * missing migration into a mystery: the API confirms the write and the
 * table stays empty.
 */
export async function recordEvent(event: SiteEvent): Promise<boolean> {
  if (tableMissing) {
    return false;
  }

  try {
    const { error } = await getSupabaseAdmin().from("site_events").insert({
      kind: event.kind,
      visitor_id: event.visitorId ?? null,
      user_id: event.userId ?? null,
      path: event.path ?? null,
      market: event.market ?? null,
      gender: event.gender ?? null,
      metadata: event.metadata ?? {},
      duration_ms: event.durationMs ?? null,
    });

    if (error) {
      /* 42P01 missing relation, PGRST205 missing from the schema cache. */
      if (error.code === "42P01" || error.code === "PGRST205") {
        if (!tableMissing) {
          console.error(
            "Events are not being recorded. Run supabase/site-events.sql.",
          );
        }

        tableMissing = true;

        return false;
      }

      console.error("Could not record an event:", error.message);

      return false;
    }

    return true;
  } catch (error) {
    console.error("Could not record an event:", error);

    return false;
  }
}

/*
 * Time an operation, record how long it took, and record a failure if
 * it threw — then let the error carry on to whoever called.
 *
 * The timing is the point: a route that has become slow and a route
 * that has started failing look the same from the outside (a page that
 * does not appear), and they need opposite responses.
 */
export async function timed<T>(
  name: string,
  run: () => Promise<T>,
  context: Omit<SiteEvent, "kind" | "durationMs" | "metadata"> & {
    metadata?: Record<string, unknown>;
  } = {},
): Promise<T> {
  const started = Date.now();

  try {
    const result = await run();

    void recordEvent({
      ...context,
      kind: "latency",
      durationMs: Date.now() - started,
      metadata: { ...context.metadata, operation: name },
    });

    return result;
  } catch (error) {
    void recordEvent({
      ...context,
      kind: "failure",
      durationMs: Date.now() - started,
      metadata: {
        ...context.metadata,
        operation: name,
        message: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
}

/*
 * A failure worth counting that was handled rather than thrown — an
 * upstream returning 500, a validation refusal, a rate limit hit.
 */
export async function recordFailure(
  operation: string,
  message: string,
  context: Omit<SiteEvent, "kind" | "metadata"> & {
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  await recordEvent({
    ...context,
    kind: "failure",
    metadata: { ...context.metadata, operation, message },
  });
}
