"use client";

import { useEffect } from "react";

interface CurrentUserResponse {
  user?: {
    id: string;
  } | null;
}

export default function LoginMetadataRecorder() {
  useEffect(() => {
    const controller = new AbortController();

    async function recordMetadata() {
      try {
        const sessionResponse = await fetch("/api/auth/me", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!sessionResponse.ok) {
          return;
        }

        const sessionBody =
          (await sessionResponse.json()) as CurrentUserResponse;

        if (!sessionBody.user) {
          return;
        }

        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || null;

        const browserLanguages = Array.from(
          new Set(navigator.languages ?? [navigator.language]),
        ).filter(
          (language): language is string =>
            typeof language === "string" && language.length > 0,
        );

        const response = await fetch("/api/account/login-metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            browserLanguage: navigator.language || null,
            browserLanguages,
            timezone,
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
