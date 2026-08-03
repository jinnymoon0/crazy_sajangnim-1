"use client";

import { useEffect } from "react";

/*
 * Tell the server this browser called, once per load.
 *
 * The shop is open to anyone now, so most visits leave no trace on an
 * account. What the browser can say about itself is sent here; the
 * address and country come from the request headers on the other side.
 */
export default function VisitRecorder() {
  useEffect(() => {
    const controller = new AbortController();

    // Past the render tick, so it never delays the first paint.
    const timer = window.setTimeout(() => {
      const extendedNavigator = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { effectiveType?: string };
        userAgentData?: { platform?: string };
      };

      const payload = {
        landingPath: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        browserLanguage: navigator.language || null,
        screenSize: window.screen
          ? `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio || 1}x`
          : null,
        devicePlatform:
          extendedNavigator.userAgentData?.platform ||
          navigator.platform ||
          null,
        cpuCores: navigator.hardwareConcurrency ?? null,
        deviceMemoryGb: extendedNavigator.deviceMemory ?? null,
        connectionType: extendedNavigator.connection?.effectiveType ?? null,
      };

      void fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        keepalive: true,
      }).catch(() => {
        // Recording a visit is never worth interrupting one.
      });
    }, 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
