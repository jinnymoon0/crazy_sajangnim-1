import crypto from "node:crypto";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { isSameOriginRequest } from "@/lib/auth/api-helpers";
import { getAuthState } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "cs_visitor";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const visitSchema = z.object({
  landingPath: z.string().trim().max(300).nullish(),
  referrer: z.string().trim().max(500).nullish(),
  timezone: z.string().trim().max(80).nullish(),
  browserLanguage: z.string().trim().max(40).nullish(),
  screenSize: z.string().trim().max(40).nullish(),
  devicePlatform: z.string().trim().max(80).nullish(),
  cpuCores: z.number().int().min(1).max(1024).nullish(),
  deviceMemoryGb: z.number().min(0).max(1024).nullish(),
  connectionType: z.string().trim().max(40).nullish(),
});

function header(request: Request, name: string): string | null {
  const value = request.headers.get(name);

  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();

    if (first) {
      return first.slice(0, 100);
    }
  }

  return request.headers.get("x-real-ip")?.slice(0, 100) ?? null;
}

/*
 * Record a visit to the shop, signed in or not.
 *
 * One row per browser per day rather than per page view: enough to see
 * how many people came and where from, without keeping a minute-by-
 * minute record of what each of them read.
 */
export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 },
      );
    }

    const body: unknown = await request.json().catch(() => ({}));
    const parsed = visitSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json({ recorded: false }, { status: 400 });
    }

    /*
     * A random id in a cookie. It names nobody by itself; it only lets a
     * second visit from the same browser be recognised as the same one.
     */
    const jar = await cookies();

    const existing = jar.get(VISITOR_COOKIE)?.value;

    const visitorId =
      existing && /^[0-9a-f-]{36}$/i.test(existing)
        ? existing
        : crypto.randomUUID();

    const state = await getAuthState();

    const supabase = getSupabaseAdmin();

    const today = new Date().toISOString().slice(0, 10);

    const { data: seen, error: readError } = await supabase
      .from("site_visits")
      .select("id, page_views")
      .eq("visitor_id", visitorId)
      .eq("visit_date", today)
      .maybeSingle();

    if (readError) {
      if (readError.code === "42P01" || readError.code === "PGRST205") {
        console.error(
          "The site_visits table does not exist. Run supabase/visits.sql.",
        );

        return NextResponse.json({ recorded: false }, { status: 503 });
      }

      throw new Error(readError.message);
    }

    if (seen) {
      await supabase
        .from("site_visits")
        .update({
          last_seen_at: new Date().toISOString(),
          page_views: (seen.page_views ?? 0) + 1,
          // Fill in the account if they signed in partway through.
          ...(state.userId ? { user_id: state.userId } : {}),
        })
        .eq("id", seen.id);
    } else {
      const { error: insertError } = await supabase
        .from("site_visits")
        .insert({
          visitor_id: visitorId,
          user_id: state.userId ?? null,
          visit_date: today,
          ip_address: getClientIp(request),
          ip_country:
            header(request, "x-vercel-ip-country") ??
            header(request, "cf-ipcountry"),
          ip_city: header(request, "x-vercel-ip-city"),
          ip_region: header(request, "x-vercel-ip-country-region"),
          referrer: parsed.data.referrer ?? null,
          landing_path: parsed.data.landingPath ?? null,
          user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
          device_platform: parsed.data.devicePlatform ?? null,
          screen_size: parsed.data.screenSize ?? null,
          timezone: parsed.data.timezone ?? null,
          browser_language: parsed.data.browserLanguage ?? null,
          cpu_cores: parsed.data.cpuCores ?? null,
          device_memory_gb: parsed.data.deviceMemoryGb ?? null,
          connection_type: parsed.data.connectionType ?? null,
        });

      // Another tab got there first; its row counts for both.
      if (insertError && insertError.code !== "23505") {
        throw new Error(insertError.message);
      }
    }

    const response = NextResponse.json({ recorded: true });

    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Visit record failed:", error);

    // Never let this get in the way of the page.
    return NextResponse.json({ recorded: false }, { status: 200 });
  }
}
