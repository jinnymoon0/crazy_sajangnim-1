import type { Product } from "@/types/product";
import { formatPrice } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <a
      href={product.sourceUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block"
    >
      <article>
        <div className="relative aspect-[4/5] overflow-hidden bg-[#e7e3da]">
          <img
            src={product.imageUrl}
            alt={`${product.brandName} ${product.productName}`}
            className="size-full object-cover transition duration-500 group-hover:scale-[1.025]"
          />

          <span className="absolute top-3 left-3 bg-[#d8432e] px-2.5 py-1 text-xs font-semibold text-white">
            {product.discountPercentage}% OFF
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

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#c83d29]">
              {formatPrice(
                product.salePrice,
                product.currency,
              )}
            </span>

            <span className="text-xs text-black/40 line-through">
              {formatPrice(
                product.originalPrice,
                product.currency,
              )}
            </span>
          </div>
        </div>
      </article>
    </a>
  );
}
