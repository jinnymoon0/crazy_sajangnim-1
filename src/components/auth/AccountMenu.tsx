"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface MeUser {
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
        const response = await fetch("/api/auth/me", {
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
        className="inline-flex min-h-9 items-center rounded-full border border-black/15 bg-white px-3 text-xs font-semibold transition hover:bg-black hover:text-white md:px-4 md:text-sm"
      >
        Log in
      </Link>
    );
  }

  const displayName = user.username ?? user.name ?? "Account";

  return (
    <div className="flex items-center gap-2">
      {user.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.picture}
          alt=""
          referrerPolicy="no-referrer"
          className="h-7 w-7 rounded-full border border-black/10"
        />
      ) : null}

      <span
        title={displayName}
        className="max-w-24 truncate text-xs font-semibold md:max-w-36 md:text-sm"
      >
        {displayName}
      </span>

      <button
        type="button"
        onClick={() => void signOut({ callbackUrl: "/login" })}
        className="inline-flex min-h-9 items-center rounded-full border border-black/15 bg-white px-3 text-xs transition hover:bg-black hover:text-white"
      >
        Log out
      </button>
    </div>
  );
}
