import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { isSameOriginRequest } from "@/lib/auth/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const metadataSchema = z.object({
  browserLanguage: z.string().trim().min(1).max(100).nullable(),
  browserLanguages: z
    .array(z.string().trim().min(1).max(100))
    .max(20),
  timezone: z.string().trim().min(1).max(100).nullable(),

  screenSize: z.string().trim().min(1).max(60).nullable().optional(),
  devicePlatform: z.string().trim().min(1).max(120).nullable().optional(),
  cpuCores: z.number().int().min(1).max(1024).nullable().optional(),
  deviceMemoryGb: z.number().min(0).max(1024).nullable().optional(),
  connectionType: z.string().trim().min(1).max(40).nullable().optional(),
  referrer: z.string().trim().min(1).max(500).nullable().optional(),
});

function getCountryCode(request: Request): string | null {
  const value =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry");

  if (!value || !/^[A-Za-z]{2}$/.test(value)) {
    return null;
  }

  return value.toUpperCase();
}

function decodeHeader(value: string | null): string | null {
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

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin submissions are not allowed." },
        { status: 403 },
      );
    }

    const session = await auth();
    const googleSub = session?.user?.id;

    if (!googleSub) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = metadataSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid login metadata." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const baseUpdate = {
      browser_language: parsed.data.browserLanguage,
      browser_languages: parsed.data.browserLanguages,
      timezone: parsed.data.timezone,
      country_code: getCountryCode(request),
      metadata_updated_at: new Date().toISOString(),
    };

    /*
     * Network and location details come from the request itself; device
     * details from the browser report. Everything is best-effort.
     */
    const extendedUpdate = {
      ...baseUpdate,
      last_ip: getClientIp(request),
      ip_city: decodeHeader(request.headers.get("x-vercel-ip-city")),
      ip_region: decodeHeader(
        request.headers.get("x-vercel-ip-country-region"),
      ),
      user_agent:
        request.headers.get("user-agent")?.slice(0, 500) ?? null,
      device_platform: parsed.data.devicePlatform ?? null,
      screen_size: parsed.data.screenSize ?? null,
      cpu_cores: parsed.data.cpuCores ?? null,
      device_memory_gb: parsed.data.deviceMemoryGb ?? null,
      connection_type: parsed.data.connectionType ?? null,
      referrer: parsed.data.referrer ?? null,
    };

    let { error } = await supabase
      .from("site_users")
      .update(extendedUpdate)
      .eq("google_sub", googleSub);

    /*
     * PGRST204: the extended columns have not been migrated yet — fall
     * back to the original fields so metadata capture keeps working.
     */
    if (error && error.code === "PGRST204") {
      ({ error } = await supabase
        .from("site_users")
        .update(baseUpdate)
        .eq("google_sub", googleSub));
    }

    if (error) {
      console.error("Login metadata update failed:", {
        code: error.code,
        message: error.message,
      });

      return NextResponse.json(
        { error: "Failed to update login metadata." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Login metadata error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
