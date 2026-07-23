"use client";

import useSWR from "swr";
import type {
  Gender,
  Market,
  Product,
} from "@/types/product";

interface ProductResponse {
  products: Product[];
  count: number;
  market: Market;
  gender: Gender;
  updatedAt: string;
}

interface ErrorResponse {
  error?: string;
}

async function fetcher(
  url: string,
): Promise<ProductResponse> {
  const response = await fetch(url);

  const body = (await response.json()) as
    | ProductResponse
    | ErrorResponse;

  if (!response.ok) {
    throw new Error(
      "error" in body && body.error
        ? body.error
        : "Unable to load product listings.",
    );
  }

  return body as ProductResponse;
}

export function useProducts(
  market: Market,
  gender: Exclude<Gender, "UNISEX">,
) {
  const query = new URLSearchParams({
    market,
    gender,
  });

  return useSWR<ProductResponse>(
    `/api/products?${query.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60 * 60 * 1000,
      keepPreviousData: true,
    },
  );
}
