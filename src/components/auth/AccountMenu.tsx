"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import posthog from "posthog-js";

interface MeUser {
  id: string;
  username: string | null;
  name: string | null;
  picture: string | null;
}

export default function AccountMenu() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/account/me", {
          cache: "no-store",
        });

        const body = (await response.json()) as {
          user?: MeUser | null;
        };

        if (!cancelled) {
          setUser(body.user ?? null);
          setIsLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!isLoaded) {
    return <div aria-hidden="true" className="w-16" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-9 items-center justify-center rounded-full border border-black/15 bg-white px-3 text-xs font-semibold transition hover:bg-black hover:text-white md:px-4 md:text-sm"
      >
        Log in
      </Link>
    );
  }

  const displayName = user.username ?? user.name ?? "Account";

  return (
    <div className="flex items-center gap-2">
      {/*
        The name sits in the same pill as the buttons either side of it.
        Loose in the row it was the one thing in the header without a
        shape, so a signed-in header read as three buttons with a stray
        avatar wedged between them rather than as one set of controls.
      */}
      <span
        title={displayName}
        className="inline-flex min-h-9 max-w-32 items-center gap-2 rounded-full border border-black/15 bg-white px-3 md:max-w-44 md:px-4"
      >
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="h-5 w-5 shrink-0 rounded-full border border-black/10"
          />
        ) : null}

        <span className="truncate text-xs font-semibold md:text-sm">
          {displayName}
        </span>
      </span>

      <button
        type="button"
        onClick={() => {
          posthog.reset();
          void signOut({ callbackUrl: "/login" });
        }}
        className="inline-flex min-h-9 items-center justify-center rounded-full border border-black/15 bg-white px-3 text-xs font-semibold transition hover:bg-black hover:text-white md:px-4 md:text-sm"
      >
        Log out
      </button>
    </div>
  );
}
