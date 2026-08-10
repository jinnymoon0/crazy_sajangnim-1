"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

interface CurrentUserResponse {
  user?: {
    id: string;
    username: string | null;
    name: string | null;
  } | null;
}

export default function LoginMetadataRecorder() {
  useEffect(() => {
    const controller = new AbortController();

    async function recordMetadata() {
      try {
        const sessionResponse = await fetch("/api/account/me", {
          cache: "no-store",
          signal: controller.signal,
        });

        /*
         * A signed-out visit can be answered with an HTML redirect
         * rather than JSON; parsing that would throw.
         */
        if (
          !sessionResponse.ok ||
          !sessionResponse.headers
            .get("content-type")
            ?.includes("application/json")
        ) {
          return;
        }

        const sessionBody =
          (await sessionResponse.json()) as CurrentUserResponse;

        if (!sessionBody.user) {
          return;
        }

        posthog.identify(sessionBody.user.id, {
          username: sessionBody.user.username,
          name: sessionBody.user.name,
        });

        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || null;

        const browserLanguages = Array.from(
          new Set(navigator.languages ?? [navigator.language]),
        ).filter(
          (language): language is string =>
            typeof language === "string" && language.length > 0,
        );

        /*
         * Device details, all best-effort — every field is optional and
         * some browsers expose none of the extended APIs.
         */
        const extendedNavigator = navigator as Navigator & {
          deviceMemory?: number;
          connection?: { effectiveType?: string };
          userAgentData?: { platform?: string };
        };

        const screenSize = window.screen
          ? `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio || 1}x`
          : null;

        const devicePlatform =
          extendedNavigator.userAgentData?.platform ||
          navigator.platform ||
          null;

        const response = await fetch("/api/account/login-metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            browserLanguage: navigator.language || null,
            browserLanguages,
            timezone,
            screenSize,
            devicePlatform,
            cpuCores: navigator.hardwareConcurrency ?? null,
            deviceMemoryGb: extendedNavigator.deviceMemory ?? null,
            connectionType:
              extendedNavigator.connection?.effectiveType ?? null,
            referrer: document.referrer || null,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          console.error(
            "Login metadata request failed:",
            response.status,
          );
        }
      } catch (error) {
        if (
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          console.error("Could not record login metadata:", error);
        }
      }
    }

    void recordMetadata();

    return () => {
      controller.abort();
    };
  }, []);

  return null;
}
