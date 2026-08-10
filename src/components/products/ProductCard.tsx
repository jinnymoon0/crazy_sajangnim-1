"use client";

import { type MouseEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

import { formatPrice } from "@/lib/utils";
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
            <p className="text-xs font-semibold tracking-[0.14em]">
              {product.brandName}
            </p>

            <p className="text-right text-[11px] text-black/45">
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
      <Link
        href={shareHref}
        prefetch
        onClick={handleShare}
        aria-disabled={isSharing}
        className={`mt-3 inline-flex min-h-11 w-full touch-manipulation items-center justify-center border border-black/15 px-3 text-xs font-semibold uppercase tracking-[0.08em] transition hover:bg-black hover:text-white ${
          isSharing ? "bg-black text-white" : ""
        }`}
      >
        {isSharing ? "Opening blog..." : "Share on blog"}
      </Link>
    </article>
  );
}
