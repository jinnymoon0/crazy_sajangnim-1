"use client";

import useSWR from "swr";

import type { Gender, Market, Product } from "@/types/product";

interface ProductResponse {
  products: Product[];

  page: number;
  size: number;
  total: number;
  hasMore: boolean;

  market: Market;
  gender: Exclude<Gender, "UNISEX">;

  updatedAt: string;
}

interface ErrorResponse {
  error?: string;
}

async function fetcher(url: string): Promise<ProductResponse> {
  const response = await fetch(url);

  const body = (await response.json()) as ProductResponse | ErrorResponse;

  if (!response.ok) {
    throw new Error(
      "error" in body && body.error
        ? body.error
        : "Unable to load product listings.",
    );
  }

  return body as ProductResponse;
}

export function useProducts(market: Market, gender: Exclude<Gender, "UNISEX">) {
  const query = new URLSearchParams({
    market,
    gender,
    page: "1",
    size: "300",
    sort: "discount-desc",
  });

  return useSWR<ProductResponse>(
    `/api/catalog/products?${query.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5 * 60 * 1000,
      keepPreviousData: true,
    },
  );
}
