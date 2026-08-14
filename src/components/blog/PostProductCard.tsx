import Link from "next/link";

import { affiliateUrl } from "@/lib/affiliate";

import { formatPrice } from "@/lib/utils";
import type { PostProduct } from "@/types/blog";

/*
 * The item a post is about, shown beside the post.
 *
 * Two links, on purpose. The shop is where the thing is bought; the
 * conversation is where the other people who found it are, and that one
 * is the reason this site exists rather than a list of sales.
 */
export default function PostProductCard({
  product,
}: {
  product: PostProduct;
}) {
  const discount =
    product.originalPrice &&
    product.salePrice &&
    product.originalPrice > product.salePrice
      ? Math.round(
          ((product.originalPrice - product.salePrice) /
            product.originalPrice) *
            100,
        )
      : null;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-neutral-50">
      <div className="flex gap-4 p-4">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-24 w-24 shrink-0 rounded-xl object-cover"
          />
        ) : null}

        {/* min-w-0 so a long name wraps instead of stretching the row. */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
            {product.brand}
          </p>

          <p className="mt-1 break-words text-base font-bold leading-6 text-neutral-950">
            {product.name}
          </p>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {product.salePrice === null ? null : (
              <span className="text-base font-black text-neutral-950">
                {formatPrice(product.salePrice, product.currency)}
              </span>
            )}

            {product.originalPrice && discount ? (
              <>
                <span className="text-xs font-medium text-neutral-400 line-through">
                  {formatPrice(product.originalPrice, product.currency)}
                </span>

                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black text-white">
                  {discount}% off
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-black/10 bg-white px-4 py-3">
        <Link
          href={`/blog?product=${encodeURIComponent(product.id)}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold !text-white transition hover:bg-neutral-700 hover:!text-white"
        >
          See everyone on this item
        </Link>

        {product.url ? (
          <Link
            href={affiliateUrl(product.url)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-bold text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
          >
            View at the shop
            <span aria-hidden="true">↗</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
