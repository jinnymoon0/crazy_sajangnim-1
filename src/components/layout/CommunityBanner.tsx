"use client";

import Link from "next/link";
import useSWR from "swr";

/*
 * The first thing on the page, saying what this is.
 *
 * A visitor's first impression was "another shopping website" — browse
 * clothes, nothing special — and the only thing on screen that said
 * otherwise was a button at the bottom of a product card. The part
 * worth leading with was the part you had to go looking for.
 *
 * So the claim goes at the top, with evidence next to it. "People talk
 * about what they find here" is a promise; "9 posts about 4 items" is a
 * fact, and a fact is what makes a stranger click. When there is
 * nothing to count the banner asks for the first post instead of
 * quietly showing a zero — an empty community that admits it is empty
 * reads better than one pretending.
 */
export default function CommunityBanner() {
  const { data } = useSWR<{ counts: Record<string, number> }>(
    "/api/blog/product-counts",
    (url: string) => fetch(url).then((response) => response.json()),
    {
      /* The same cadence as the catalogue, and shared with the cards. */
      refreshInterval: 5 * 60 * 1000,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      dedupingInterval: 30 * 1000,
      keepPreviousData: true,
    },
  );

  const counts = data?.counts ?? {};
  const items = Object.keys(counts).length;
  const posts = Object.values(counts).reduce((total, n) => total + n, 0);

  const evidence =
    items > 0
      ? `${posts} ${posts === 1 ? "post" : "posts"} about ${items} ${
          items === 1 ? "item" : "items"
        }`
      : "Be the first to post about a find";

  return (
    <Link
      href="/blog"
      className="group/banner block bg-[#111111] !text-white transition hover:bg-[#d8432e]"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center sm:px-6 lg:px-10">
        {/*
          * The dot does the work a bright colour would do, without
          * turning the bar into an advertisement. It is the same signal
          * used on the floating button: something is happening here.
          */}
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#d8432e] group-hover/banner:bg-white" />
        </span>

        {/*
          Shorter on a phone so the bar stays one line. Pinned to the top
          for the whole scroll, a second line is a quarter of a small
          screen spent saying the same thing at more length.
        */}
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] sm:hidden">
          Shop with friends
        </span>

        <span className="hidden text-xs font-bold uppercase tracking-[0.14em] sm:inline sm:text-sm">
          Shop with your friends, not alone
        </span>

        {/* Hidden on the narrowest screens, where the claim matters more. */}
        <span
          className="hidden text-xs text-white/60 sm:inline sm:text-sm"
          aria-hidden="true"
        >
          ·
        </span>

        <span className="hidden text-xs text-white/80 sm:inline sm:text-sm">
          {evidence}
        </span>

        <span className="text-[11px] font-bold underline underline-offset-4 sm:text-sm">
          {/* The invitation shortens with the claim, and keeps the arrow. */}
          <span className="sm:hidden">See what people say</span>
          <span className="hidden sm:inline">See what people are saying</span>
          <span aria-hidden="true"> →</span>
        </span>
      </div>
    </Link>
  );
}
