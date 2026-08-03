"use client";

import { useEffect } from "react";

/*
 * Tell the server this browser called, once per load.
 *
 * The shop is open to anyone now, so most visits leave no trace on an
 * account. What the browser can say about itself is sent here; the
 * address and country come from the request headers on the other side.
 */
/*
 * Report a page — or a change of storefront, which is the shop's
 * equivalent of turning to a different page.
 */
export function recordView(context?: {
  market?: string | null;
  gender?: string | null;
}) {
  const extendedNavigator = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
    userAgentData?: { platform?: string };
  };

  const params = new URLSearchParams(window.location.search);

  const payload = {
    landingPath: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
    market: context?.market ?? null,
    gender: context?.gender ?? null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    browserLanguage: navigator.language || null,
    languages: navigator.languages ? [...navigator.languages].slice(0, 12) : null,
    screenSize: window.screen
      ? `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio || 1}x`
      : null,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    devicePlatform:
      extendedNavigator.userAgentData?.platform || navigator.platform || null,
    cpuCores: navigator.hardwareConcurrency ?? null,
    deviceMemoryGb: extendedNavigator.deviceMemory ?? null,
    connectionType: extendedNavigator.connection?.effectiveType ?? null,
    maxTouchPoints: navigator.maxTouchPoints ?? null,
    doNotTrack: navigator.doNotTrack === "1" ? true : null,
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmTerm: params.get("utm_term"),
    utmContent: params.get("utm_content"),
  };

  void fetch("/api/visits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Recording a visit is never worth interrupting one.
  });
}

export default function VisitRecorder() {
  useEffect(() => {
    // Past the render tick, so it never delays the first paint.
    const timer = window.setTimeout(() => recordView(), 0);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
