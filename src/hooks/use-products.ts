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

      /*
       * Pick up newly collected stock without anyone reloading the
       * page. The collector runs hourly, so asking more often would
       * only re-fetch the same rows.
       */
      refreshInterval: 60 * 60 * 1000,

      /*
       * Only while someone is actually looking. SWR pauses polling on
       * a hidden tab by default, and that is wanted: a tab left open
       * for a week should not spend a request an hour, nor keep a
       * phone's radio busy, to refresh a page nobody is reading.
       */
      refreshWhenHidden: false,

      /*
       * A background refresh must never blank the grid. keepPreviousData
       * holds the current products while the new ones arrive, so the
       * page updates in place rather than flashing empty on the hour.
       */
      revalidateIfStale: true,
    },
  );
}
