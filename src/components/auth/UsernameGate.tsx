"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/*
 * Rendered once in the root layout: sends signed-in users who have not
 * picked a username yet to /choose-username, wherever they land.
 */
export default function UsernameGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (
      pathname.startsWith("/choose-username") ||
      pathname.startsWith("/login")
    ) {
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const body = (await response.json()) as {
          user?: { needsUsername?: boolean } | null;
        };

        if (!cancelled && body.user?.needsUsername) {
          router.replace("/choose-username");
        }
      } catch {
        // Ignore — the APIs still refuse writes without a username.
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname, router]);

  return null;
}
