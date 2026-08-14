"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { affiliateUrl } from "@/lib/affiliate";
import { readShareDraft } from "@/lib/blog/share-draft";
import { formatPrice } from "@/lib/utils";
import type { PostProduct } from "@/types/blog";

interface ProductConversationHeaderProps {
  productId: string;
  /*
   * Taken from the posts already written about this item. Null when
   * nobody has posted about it yet, which is exactly the case where the
   * person looking at this arrived holding the draft.
   */
  product: PostProduct | null;
  postCount: number;
}

export default function ProductConversationHeader({
  productId,
  product,
  postCount,
}: ProductConversationHeaderProps) {
  const [item, setItem] = useState<PostProduct | null>(product);

  /*
   * Session storage cannot be read while rendering on the server, so the
   * first person to share an item gets the card a tick after the page
   * rather than with it. Everyone arriving afterwards has it server-side
   * from `product` and never sees this run.
   */
  useEffect(() => {
    if (item) {
      return;
    }

    /* Deferred a tick, as in BlogPostForm: the strict effect lint rejects
     * a state update started synchronously in an effect. */
    const timer = window.setTimeout(() => {
      const draft = readShareDraft(productId);

      if (!draft) {
        return;
      }

      setItem({
        id: draft.productId,
        url: draft.sourceUrl,
        brand: draft.brandName,
        name: draft.productName,
        imageUrl: draft.imageUrl,
        market: draft.market,
        currency: draft.currency,
        salePrice: draft.salePrice,
        originalPrice: draft.originalPrice,
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [item, productId]);

  if (!item) {
    return null;
  }

  const discount =
    item.originalPrice && item.salePrice && item.originalPrice > item.salePrice
      ? Math.round(
          ((item.originalPrice - item.salePrice) / item.originalPrice) * 100,
        )
      : null;

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-7">
        {item.imageUrl ? (
          <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-neutral-100 sm:h-40 sm:w-40">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="(min-width: 640px) 160px, 100vw"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : null}

        {/* min-w-0: a long product name must wrap rather than push the price off. */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
            {item.brand}
          </p>

          <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-neutral-950 sm:text-3xl">
            {item.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {item.salePrice === null ? null : (
              <span className="text-xl font-black text-neutral-950">
                {formatPrice(item.salePrice, item.currency)}
              </span>
            )}

            {item.originalPrice && discount ? (
              <>
                <span className="text-sm font-medium text-neutral-400 line-through">
                  {formatPrice(item.originalPrice, item.currency)}
                </span>

                <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">
                  {discount}% off
                </span>
              </>
            ) : null}
          </div>

          {item.url ? (
            <Link
              href={affiliateUrl(item.url)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-950 px-4 py-2.5 text-sm font-bold text-neutral-950 transition hover:bg-neutral-950 hover:!text-white"
            >
              View at the shop
              <span aria-hidden="true">↗</span>
            </Link>
          ) : null}
        </div>
      </div>

      {/*
        * What the page is for, said plainly. Someone who has just pressed
        * "share on blog" needs to know they are in the right place and
        * that this is about the thing they were looking at, not a feed.
        */}
      <p className="border-t border-black/10 bg-neutral-50 px-5 py-4 text-sm font-semibold text-neutral-700 sm:px-7">
        {postCount === 0
          ? "Nobody has said anything about this one yet. Go first."
          : postCount === 1
            ? "1 person has posted about this item."
            : `${postCount} people have posted about this item.`}
      </p>
    </section>
  );
}
