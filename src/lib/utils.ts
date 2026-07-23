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
  return new Intl.NumberFormat(
    currency === "KRW" ? "ko-KR" : "en-US",
    {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "KRW" ? 0 : 2,
    },
  ).format(price);
}
