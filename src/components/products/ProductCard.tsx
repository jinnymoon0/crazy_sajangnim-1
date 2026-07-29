"use client";

import { useState } from "react";

import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  /*
   * Existing catalog rows may still be marked VERIFIED,
   * so detect Lyst by source name as well.
   */
  const isLystProduct = product.sourceName.toLowerCase().includes("lyst");

  const isVerified =
    !isLystProduct &&
    product.saleVerification === "VERIFIED" &&
    product.originalPrice !== null &&
    product.discountPercentage !== null;

  return (
    <a
      href={product.sourceUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block"
    >
      <article>
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

          <span className="absolute left-3 top-3 bg-[#d8432e] px-2.5 py-1 text-xs font-semibold text-white">
            {isVerified ? `${product.discountPercentage}% OFF` : "SALE"}
          </span>
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

          {isLystProduct ? (
            <div className="mt-3">
              <span className="inline-flex border border-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition group-hover:bg-black group-hover:text-white">
                Check current price
              </span>

              <p className="mt-2 text-[11px] leading-4 text-black/45">
                The final retailer price may vary by region, availability, and
                current promotion.
              </p>
            </div>
          ) : (
            <>
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

              {!isVerified && (
                <p className="mt-2 text-[11px] text-black/45">
                  Current price should be confirmed on the retailer website
                </p>
              )}
            </>
          )}
        </div>
      </article>
    </a>
  );
}
