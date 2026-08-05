import { getSupabaseAdmin } from "@/lib/supabase/admin";

/*
 * How often one caller may do something.
 *
 * Counted in the database rather than in memory, because the site runs
 * as serverless functions: each request may land on a different
 * instance, and a per-instance counter is a limit an attacker leaves
 * behind simply by being spread across instances.
 *
 * If the table is not there the limiter falls back to counting in
 * memory, which is weaker but is not nothing, and above all does not
 * take down the routes it is protecting. A rate limiter whose own
 * failure blocks writing is worse than the abuse it prevents.
 */

export interface RateLimit {
  /* How many actions are allowed in the window. */
  limit: number;

  /* How long the window is, in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /* Seconds until the caller may try again, when refused. */
  retryAfter: number;
}

/*
 * Deliberately generous. These stop a script, not a person: someone
 * writing several comments in a row is using the site as intended.
 */
export const LIMITS = {
  comment: { limit: 10, windowSeconds: 60 },
  post: { limit: 5, windowSeconds: 300 },
  like: { limit: 60, windowSeconds: 60 },
  visit: { limit: 120, windowSeconds: 60 },
} satisfies Record<string, RateLimit>;

const memory = new Map<string, { count: number; expiresAt: number }>();

/*
 * When to try the database again after finding it had nothing to
 * count with.
 *
 * Not a permanent latch. Instances are long-lived and a migration is
 * run while they are warm, so a one-way switch meant the counters kept
 * falling back to memory long after the table existed — and the only
 * cure was a redeploy, which is a silly thing to need after running
 * some SQL. Retrying occasionally costs one failed call every few
 * minutes and lets it heal itself.
 */
const RETRY_AFTER_MS = 5 * 60_000;

let unavailableUntil = 0;

function checkInMemory(key: string, rule: RateLimit): RateLimitResult {
  const now = Date.now();
  const existing = memory.get(key);

  if (!existing || existing.expiresAt <= now) {
    memory.set(key, {
      count: 1,
      expiresAt: now + rule.windowSeconds * 1000,
    });

    /*
     * Drop what has expired, so a long-lived instance does not hold a
     * row for every caller it has ever seen.
     */
    if (memory.size > 10_000) {
      for (const [existingKey, value] of memory) {
        if (value.expiresAt <= now) {
          memory.delete(existingKey);
        }
      }
    }

    return { allowed: true, remaining: rule.limit - 1, retryAfter: 0 };
  }

  existing.count += 1;

  const retryAfter = Math.ceil((existing.expiresAt - now) / 1000);

  return existing.count > rule.limit
    ? { allowed: false, remaining: 0, retryAfter }
    : {
        allowed: true,
        remaining: Math.max(0, rule.limit - existing.count),
        retryAfter: 0,
      };
}

/*
 * The window a moment belongs to. Fixed windows rather than a rolling
 * count: a caller can send two windows' worth across a boundary, which
 * is a known and acceptable cost for a single indexed row per caller
 * instead of a row per request.
 */
function windowStart(rule: RateLimit): string {
  const seconds = Math.floor(Date.now() / 1000);

  return new Date(
    (seconds - (seconds % rule.windowSeconds)) * 1000,
  ).toISOString();
}

export async function checkRateLimit(
  action: keyof typeof LIMITS,
  caller: string,
  rule: RateLimit = LIMITS[action],
): Promise<RateLimitResult> {
  const key = `${action}:${caller}`;

  if (Date.now() < unavailableUntil) {
    return checkInMemory(key, rule);
  }

  try {
    const { data, error } = await getSupabaseAdmin().rpc("bump_rate_limit", {
      p_key: key,
      p_window_start: windowStart(rule),
      p_window_seconds: rule.windowSeconds,
    });

    if (error) {
      /* 42883 undefined_function, 42P01 undefined_table, PGRST202 no such rpc. */
      if (
        error.code === "42883" ||
        error.code === "42P01" ||
        error.code === "PGRST202" ||
        error.code === "PGRST205"
      ) {
        if (unavailableUntil === 0) {
          console.error(
            "Rate limiting is counting in memory only. Run supabase/rate-limits.sql to count across instances.",
          );
        }

        unavailableUntil = Date.now() + RETRY_AFTER_MS;

        return checkInMemory(key, rule);
      }

      throw new Error(error.message);
    }

    const count = typeof data === "number" ? data : 0;

    const retryAfter =
      rule.windowSeconds -
      (Math.floor(Date.now() / 1000) % rule.windowSeconds);

    return count > rule.limit
      ? { allowed: false, remaining: 0, retryAfter }
      : {
          allowed: true,
          remaining: Math.max(0, rule.limit - count),
          retryAfter: 0,
        };
  } catch (error) {
    /*
     * Never refuse a genuine request because the limiter itself broke.
     */
    console.error("Rate limit check failed, allowing the request:", error);

    return { allowed: true, remaining: rule.limit, retryAfter: 0 };
  }
}

/*
 * Who to count against: the signed-in account when there is one, and
 * otherwise the address the request came from. Accounts first, so
 * sharing an office network does not mean sharing a limit.
 */
export function callerKey(
  request: Request,
  userId?: string | null,
): string {
  if (userId) {
    return `user:${userId}`;
  }

  const forwarded = request.headers.get("x-forwarded-for") ?? "";

  const ip = forwarded.split(",")[0]?.trim() || "unknown";

  return `ip:${ip}`;
}

export function tooManyRequests(result: RateLimitResult) {
  return Response.json(
    { error: "That is a lot of requests. Please wait a moment." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, result.retryAfter)),
      },
    },
  );
}
