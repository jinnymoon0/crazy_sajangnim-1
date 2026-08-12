"use client";

import { type MouseEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

import useSWR from "swr";

import { formatPrice } from "@/lib/utils";
import {
  convert,
  formatMoney,
  otherCurrencies,
  type RateTable,
} from "@/lib/currency";
import {
  BLOG_SHARE_DRAFT_KEY,
  type BlogShareDraft,
} from "@/types/blog";
import type { Product } from "@/types/product";
import { report } from "@/lib/analytics/report";

interface ProductCardProps {
  product: Product;
  isSignedIn: boolean;
}

export function ProductCard({ product, isSignedIn }: ProductCardProps) {
  const router = useRouter();
  const [imageFailed, setImageFailed] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  /*
   * Browsing is open; following a listing through to the shop that sells
   * it asks for an account. Signing in returns them to the same page of
   * results, where the card is one more click away.
   *
   * The retailer's address stays on the anchor so the card is still a
   * real link — copyable, openable in a new tab by anyone who has an
   * account, and readable by a crawler.
   */
  function handleOpen(event: MouseEvent<HTMLAnchorElement>) {
    if (isSignedIn) {
      /*
       * The one moment the site is worth something to a retailer, so
       * it is the number worth having. Sent without awaiting: the tab
       * is about to leave, and sendBeacon outlives the page.
       */
      posthog.capture("product_retailer_opened", {
        retailer: product.sourceName,
        brand: product.brandSlug,
        discount_percentage: product.discountPercentage,
      });

      report({
        kind: "retailer_click",
        metadata: {
          retailer: product.sourceName,
          brand: product.brandSlug,
          productName: product.productName,
          discount: product.discountPercentage,
        },
      });

      return;
    }

    event.preventDefault();

    const here = `${window.location.pathname}${window.location.search}`;

    router.push(`/login?callbackUrl=${encodeURIComponent(here)}`);
  }

  /*
   * Worked out at render, so the link is real markup a tap can follow
   * straight away rather than something JavaScript decides afterwards.
   */
  /*
   * One request for the whole grid. SWR keys on the URL, so three
   * hundred cards asking at once collapse into a single call, and the
   * answer is held for an hour to match how long the edge keeps it.
   */
  const { data: rates } = useSWR<RateTable>(
    "/api/rates",
    (url: string) => fetch(url).then((response) => response.json()),
    {
      /*
       * The same cadence as the catalogue in use-products, so the rate
       * is refreshed by whatever refreshed the prices: every five
       * minutes on a visible tab, on returning to it, and on
       * reconnecting. A price and the conversion under it should never
       * be from different moments.
       *
       * Deduping well inside that window, because three hundred cards
       * ask this question at once and only one of them needs to.
       */
      refreshInterval: 5 * 60 * 1000,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30 * 1000,
      keepPreviousData: true,
    },
  );

  const converted = otherCurrencies(product.currency)
    .map((code) => {
      const value = convert(product.salePrice, product.currency, code, rates);

      return value === null ? null : formatMoney(value, code);
    })
    .filter((entry): entry is string => entry !== null);

  const shareHref = isSignedIn
    ? "/blog"
    : `/login?callbackUrl=${encodeURIComponent("/blog")}`;

  function handleShare() {
    if (isSignedIn) {
      posthog.capture("product_shared_to_blog", {
        retailer: product.sourceName,
        brand: product.brandSlug,
      });
    }

    const draft: BlogShareDraft = {
      brandName: product.brandName,
      productName: product.productName,
      salePrice: product.salePrice,
      originalPrice: product.originalPrice,
      discountPercentage: product.discountPercentage,
      currency: product.currency,
      sourceName: product.sourceName,
      sourceUrl: product.sourceUrl,
      imageUrl: imageFailed ? "" : product.imageUrl,
    };

    try {
      sessionStorage.setItem(BLOG_SHARE_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage unavailable — the form simply starts empty.
    }

    // The link itself does the navigating; this only keeps the draft.
    setIsSharing(true);
  }

  const hasVerifiedDiscount =
    product.saleVerification === "VERIFIED" &&
    product.originalPrice !== null &&
    product.discountPercentage !== null;

  return (
    /*
     * The link and the share button are siblings, not nested. A button
     * inside an anchor is invalid HTML, and a phone resolves the tap
     * its own way — iOS follows the anchor to the retailer whatever the
     * button's handler says, so sharing never reached the blog.
     */
    <article className="group">
      <a
        href={product.sourceUrl}
        onClick={handleOpen}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-[#e7e3da]">
          {!imageFailed ? (
            <img
              src={product.imageUrl}
              alt={`${product.brandName} ${product.productName}`}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center">
              <div>
                <p className="text-xl font-semibold tracking-[0.12em]">
                  {product.brandName}
                </p>

                <p className="mt-3 text-xs text-black/45">Image unavailable</p>
              </div>
            </div>
          )}

          {hasVerifiedDiscount && (
            <span className="absolute left-3 top-3 bg-[#d8432e] px-2.5 py-1 text-xs font-semibold text-white">
              {product.discountPercentage}% OFF
            </span>
          )}
        </div>

        <div className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-xs font-semibold tracking-[0.14em]">
              {product.brandName}
            </p>

            {/*
              A flex child will not go narrower than its content unless
              it is allowed to, and a retailer domain has nowhere to
              break: mohawkgeneralstore.com pushed 126px out of a 164px
              card on a phone and took the whole page with it, so the
              site scrolled sideways and the fixed blog button sat off
              the right edge. Allowed to shrink, and to break mid-word
              when there is no kinder place.
            */}
            <p className="min-w-0 break-words text-right text-[11px] text-black/45">
              {product.sourceName}
            </p>
          </div>

          <h3 className="mt-2 min-h-10 text-sm leading-5">
            {product.productName}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#c83d29]">
              {formatPrice(product.salePrice, product.currency)}
            </span>

            {product.originalPrice !== null && (
              <span className="text-xs text-black/40 line-through">
                {formatPrice(product.originalPrice, product.currency)}
              </span>
            )}
          </div>

          {/*
            The same price in the other two currencies.

            A Korean shopper looking at a dollar figure, or an American
            at a won one, cannot tell whether it is a good price without
            leaving to find out — and the ones who leave do not come
            back. Both are shown rather than a guess at which is wanted,
            since the storefront says where the shop is, not where the
            shopper is.

            Absent until the rates arrive, and absent if they never do.
            A converted figure is a claim about money; a wrong one is
            worse than none, so nothing is rendered on a guess.
          */}
          {converted.length > 0 && (
            <p className="mt-1 text-[11px] tabular-nums text-black/45">
              ≈ {converted.join("  ·  ")}
            </p>
          )}

          <p className="mt-2 text-[11px] text-black/45">
            Verified from the retailer during the latest catalog refresh
          </p>
        </div>
      </a>

      {/*
        Outside the anchor, so a tap on a phone can only mean one thing.
        Signed out it goes to the login page and comes back here; the
        draft is kept either way, so the form is filled in on arrival.
      */}
      {/*
        Filled rather than outlined. As a hairline box on a cream card it
        read as a caption rather than something to press — the one action
        the card is asking for was the quietest thing on it. Black rather
        than the accent red, because red already means a discount here
        and a red button under a red badge says nothing new; the red is
        kept for the hover, where it is a response rather than a label.
      */}
      <Link
        href={shareHref}
        prefetch
        onClick={handleShare}
        aria-disabled={isSharing}
        className={`group/share mt-3 inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 bg-[#111111] px-3 text-xs font-bold uppercase tracking-[0.1em] !text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#d8432e] hover:shadow-md ${
          isSharing ? "bg-[#d8432e]" : ""
        }`}
      >
        {/* A speech mark says "write about this" faster than the words do. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 shrink-0 transition-transform group-hover/share:scale-110"
        >
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
        </svg>

        {isSharing ? "Opening blog..." : "Share on blog"}
      </Link>
    </article>
  );
}
