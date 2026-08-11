"use client";

import useSWR from "swr";

import type { Gender, Market, Product, ProductSort } from "@/types/product";

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

export function useProducts(
  market: Market,
  gender: Exclude<Gender, "UNISEX">,
  sort: ProductSort = "newest",
) {
  /*
   * The chosen order is asked of the service, not applied afterwards.
   *
   * This always requested discount-desc and let the page re-sort the
   * three hundred it got back — so every order was really a reshuffle
   * of the three hundred deepest discounts. "Recently added" could not
   * show a new item unless that item also happened to be among the
   * biggest reductions in the shop, which is the one thing a new
   * arrival usually is not.
   */
  const query = new URLSearchParams({
    market,
    gender,
    page: "1",
    size: "300",
    sort,
  });

  return useSWR<ProductResponse>(
    `/api/catalog/products?${query.toString()}`,
    fetcher,
    {
      /*
       * Refresh when someone comes back to the tab. Polling is paused
       * while the tab is hidden (see refreshWhenHidden), so without
       * this a tab left in the background for an hour showed hour-old
       * stock for up to five more minutes after being returned to —
       * the one moment a visitor is definitely looking, spent on the
       * stalest data of the whole session.
       *
       * Cheap now that the edge caches the response: someone flicking
       * between tabs is answered from the CDN, not by a function.
       */
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      /*
       * Well under the refresh interval, on purpose. Deduping exists to
       * collapse the burst of requests a re-render can cause, not to
       * gate the scheduled poll — and when the two windows were equal a
       * refresh landing on the boundary could be swallowed as a
       * duplicate, leaving the page stale with nothing to show for it.
       */
      dedupingInterval: 30 * 1000,
      keepPreviousData: true,

      /*
       * Pick up newly collected stock without anyone reloading the
       * page.
       *
       * Five minutes because that is how long the edge holds a catalog
       * response (s-maxage=300). Polling faster cannot return anything
       * newer — it re-downloads bytes the CDN has already decided are
       * current — and polling slower leaves the page staler than the
       * data it could be showing.
       *
       * This costs nothing in build minutes: it is the visitor's
       * browser asking a cached endpoint, not the collector running.
       * 27 KB gzipped, so about 0.3 MB an hour for a tab left open.
       */
      refreshInterval: 5 * 60 * 1000,

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
