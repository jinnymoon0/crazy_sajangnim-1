import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Currency } from "@/types/product";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDiscountPercentage(
  originalPrice: number,
  salePrice: number,
): number {
  if (
    !Number.isFinite(originalPrice) ||
    !Number.isFinite(salePrice) ||
    originalPrice <= 0 ||
    salePrice < 0 ||
    salePrice >= originalPrice
  ) {
    return 0;
  }

  return Math.round(
    ((originalPrice - salePrice) / originalPrice) * 100,
  );
}

export function formatPrice(
  price: number,
  currency: Currency,
): string {
  /*
   * Won and yen have no minor unit, so a price shown with decimals
   * reads as a converter's output rather than what the shop charges.
   * Kept in step with src/lib/currency.ts, which formats the
   * conversions underneath.
   */
  const zeroDecimal = currency === "KRW" || currency === "JPY";

  const locale =
    currency === "KRW" ? "ko-KR" : currency === "JPY" ? "ja-JP" : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  }).format(price);
}
