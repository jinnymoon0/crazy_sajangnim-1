import type { BrandSlug } from "@/constants/brands";
import type { CategorySlug } from "@/constants/categories";

export type Market = "US" | "KR";
export type Currency = "USD" | "KRW";
export type Gender = "MEN" | "WOMEN";

export type ProductSort =
  | "discount-desc"
  | "price-asc"
  | "price-desc"
  | "newest";

export interface Product {
  id: string;
  sourceName: string;
  sourceUrl: string;

  market: Market;
  currency: Currency;
  gender: Gender;

  brandSlug: BrandSlug;
  brandName: string;

  productName: string;
  categorySlug: Exclude<CategorySlug, "all">;

  imageUrl: string;

  originalPrice: number;
  salePrice: number;
  discountPercentage: number;

  isAvailable: boolean;
  collectedAt: string;
}
