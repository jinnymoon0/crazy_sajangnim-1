"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SessionUser {
  id: string;
  username: string;
}

export default function AccountMenu() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const body = (await response.json()) as {
          user?: SessionUser | null;
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

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The cookie clears on the next successful request.
    }

    setUser(null);
    router.refresh();
  }

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

  return (
    <div className="flex items-center gap-2">
      <span
        title={user.username}
        className="max-w-24 truncate text-xs font-semibold md:max-w-36 md:text-sm"
      >
        {user.username}
      </span>

      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex min-h-9 items-center rounded-full border border-black/15 bg-white px-3 text-xs transition hover:bg-black hover:text-white"
      >
        Log out
      </button>
    </div>
  );
}
