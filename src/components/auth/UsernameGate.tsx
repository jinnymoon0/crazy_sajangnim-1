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
      pathname.startsWith("/login") ||
      pathname.startsWith("/account") ||
      pathname.startsWith("/privacy") ||
      pathname.startsWith("/terms")
    ) {
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/account/me", {
          cache: "no-store",
        });

        const body = (await response.json()) as {
          user?: { needsUsername?: boolean } | null;
        };

        if (!cancelled && body.user?.needsUsername) {
          /*
           * Carry where they were, so onboarding returns them to it.
           *
           * A shared link to an item sends a stranger through login and
           * back to that item — unless they are new, and a new person is
           * exactly who a shared link reaches. They were then pulled
           * into choosing a username, which had no idea where they had
           * come from and finished by dropping them on the front page:
           * the friend who sent the link watched them arrive somewhere
           * else entirely.
           *
           * Read from location rather than useSearchParams, which would
           * put a Suspense boundary around every page in the layout for
           * a string this only needs inside an effect.
           */
          const destination = `${pathname}${window.location.search}`;

          router.replace(
            `/choose-username?callbackUrl=${encodeURIComponent(destination)}`,
          );
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
