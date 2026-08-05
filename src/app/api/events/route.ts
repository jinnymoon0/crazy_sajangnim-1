import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { recordEvent } from "@/lib/analytics/events";
import { getAuthState } from "@/lib/auth/session";
import {
  callerKey,
  checkRateLimit,
  tooManyRequests,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "cs_visitor";

/*
 * Only the kinds the browser is allowed to report. Latency and failure
 * are recorded server-side, where the numbers are real — a client can
 * claim any duration it likes, and an analytics table anyone can write
 * arbitrary rows into is not evidence of anything.
 */
const eventSchema = z.object({
  kind: z.enum(["search", "retailer_click"]),
  path: z.string().trim().max(500).nullish(),
  market: z.enum(["US", "KR"]).nullish(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX"]).nullish(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function isSameOriginRequest(request: Request): boolean {
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

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    const limit = await checkRateLimit("visit", callerKey(request));

    if (!limit.allowed) {
      return tooManyRequests(limit);
    }

    const parsed = eventSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ recorded: false }, { status: 400 });
    }

    const jar = await cookies();
    const visitorId = jar.get(VISITOR_COOKIE)?.value ?? null;

    const state = await getAuthState();

    /*
     * Trim what the browser sent to a known size before storing it.
     * The payload is jsonb, so without a bound one caller could park a
     * megabyte in the analytics table.
     */
    const metadata = Object.fromEntries(
      Object.entries(parsed.data.metadata ?? {})
        .slice(0, 12)
        .map(([key, value]) => [
          key.slice(0, 40),
          typeof value === "string" ? value.slice(0, 200) : value,
        ]),
    );

    await recordEvent({
      kind: parsed.data.kind,
      visitorId,
      userId: state.userId,
      path: parsed.data.path ?? null,
      market: parsed.data.market ?? null,
      gender: parsed.data.gender ?? null,
      metadata,
    });

    return NextResponse.json({ recorded: true });
  } catch (error) {
    console.error("Event recording failed:", error);

    /*
     * Still 200. The browser has nothing useful to do with a failure
     * here, and a retry loop over analytics would be worse than the
     * missing row.
     */
    return NextResponse.json({ recorded: false });
  }
}
