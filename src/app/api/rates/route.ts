import { NextResponse } from "next/server";

export const runtime = "nodejs";

/*
 * What a price is worth in the other two currencies.
 *
 * Rates are fetched rather than written down. A hard-coded number is
 * right the day it is typed and quietly wrong for ever after, and a
 * shopper comparing a Korean price to a dollar figure that has drifted
 * ten per cent is worse served than one shown no conversion at all.
 *
 * The source needs no key, which matters: the last thing here that
 * needed one 403'd for days without saying why, and a conversion that
 * silently stops is exactly the failure this whole file is trying to
 * avoid.
 */
const SOURCE = "https://open.er-api.com/v6/latest/USD";

/* The currencies the three storefronts price in. */
const WANTED = ["USD", "KRW", "JPY"] as const;

interface Rates {
  base: "USD";
  rates: Record<string, number>;
  fetchedAt: string;
}

/*
 * Held in the module between requests, so a warm instance answers
 * without going out at all. The edge cache below is what does most of
 * the work; this covers the misses.
 */
let cached: Rates | null = null;
let cachedAt = 0;

/*
 * Five minutes, matching how long a catalogue response is held. The
 * prices and the rate that converts them now go stale together — an
 * hour-old rate under a five-minute-old price is a mismatch nobody can
 * see and everybody would have to trust.
 */
const MAX_AGE_MS = 5 * 60 * 1000;

export async function GET() {
  const fresh = cached && Date.now() - cachedAt < MAX_AGE_MS;

  if (!fresh) {
    try {
      const response = await fetch(SOURCE, {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });

      if (response.ok) {
        const body = (await response.json()) as {
          result?: string;
          rates?: Record<string, number>;
        };

        const rates = body.rates ?? {};

        /*
         * Only accept a reply that has all three. A partial answer would
         * leave one storefront converting and the others not, which
         * reads as a bug in the page rather than a bad upstream.
         */
        if (
          body.result === "success" &&
          WANTED.every((code) => typeof rates[code] === "number" && rates[code] > 0)
        ) {
          cached = {
            base: "USD",
            rates: Object.fromEntries(
              WANTED.map((code) => [code, rates[code]]),
            ),
            fetchedAt: new Date().toISOString(),
          };

          cachedAt = Date.now();
        }
      }
    } catch {
      /* Fall through to whatever was cached; see below. */
    }
  }

  /*
   * A stale rate beats no rate. If the source is down, yesterday's
   * number still tells a shopper roughly what a jacket costs, and the
   * page keeps working — the alternative is conversions vanishing from
   * every card because a third party had a bad morning.
   */
  if (!cached) {
    return NextResponse.json(
      { error: "Exchange rates are unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(cached, {
    headers: {
      /*
       * The same five minutes the catalogue gets, so a refetch actually
       * returns a new rate rather than the edge handing back the one it
       * was already holding. The long stale window is what keeps the
       * conversions on the page when the source has a bad morning.
       */
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
