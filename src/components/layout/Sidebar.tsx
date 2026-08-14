"use client";

import { useState } from "react";
import { X } from "lucide-react";
import useSWR from "swr";

import { BRANDS, type BrandSlug } from "@/constants/brands";
import {
  CATEGORIES,
  type CategorySlug,
} from "@/constants/categories";
import type { Market } from "@/types/product";

interface BrandOption {
  slug: string;
  englishName: string;
  koreanName: string | null;
}

/* Shown in the shopper's own words rather than the code stored. */
const MARKETS: { market: Market; label: string }[] = [
  { market: "US", label: "US" },
  { market: "KR", label: "Korea" },
  { market: "JP", label: "Japan" },
];

const BRAND_PREVIEW_LIMIT = 10;

interface SidebarProps {
  open: boolean;
  market: Market;
  selectedBrands: BrandSlug[];
  selectedCategory: CategorySlug;
  onClose: () => void;
  onBrandToggle: (brand: BrandSlug) => void;
  onCategoryChange: (category: CategorySlug) => void;
  onClearFilters: () => void;
  onMarketChange: (market: Market) => void;
}

export function Sidebar({
  open,
  market,
  selectedBrands,
  selectedCategory,
  onClose,
  onBrandToggle,
  onCategoryChange,
  onClearFilters,
  onMarketChange,
}: SidebarProps) {
  const [showAllBrands, setShowAllBrands] = useState(false);

  /*
   * Brands are managed in the admin, so read the live list; the shipped
   * constant is the fallback while it loads or if the request fails.
   */
  /*
   * Re-read on the same schedule as the catalogue.
   *
   * Fetched once on mount, a brand added in the admin was invisible to
   * anyone already on the page — the grid picked up its products five
   * minutes later while the filter that finds them stayed missing until
   * a reload. The list and the products it filters should never be from
   * different moments.
   */
  const { data } = useSWR<{ brands?: BrandOption[] }>(
    "/api/catalog/brands",
    (url: string) => fetch(url).then((response) => response.json()),
    {
      refreshInterval: 5 * 60 * 1000,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30 * 1000,
      keepPreviousData: true,
    },
  );

  /*
   * The shipped constant stands in until the first answer arrives, and
   * stays if the request fails — a menu with no brands in it looks like
   * the shop has none.
   */
  const brands: BrandOption[] =
    data?.brands?.length
      ? data.brands
      : BRANDS.map((brand) => ({
          slug: brand.slug,
          englishName: brand.englishName,
          koreanName: brand.koreanName,
        }));

  const visibleBrands = showAllBrands
    ? brands
    : brands.slice(0, BRAND_PREVIEW_LIMIT);

  const hasMoreBrands = brands.length > BRAND_PREVIEW_LIMIT;

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu overlay"
        className={`fixed inset-0 z-40 bg-black/40 transition ${
          open
            ? "visible opacity-100"
            : "invisible opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[340px] max-w-[90vw] overflow-y-auto bg-[#f5f2ea] px-7 py-6 shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-10 flex items-center justify-between">
          <h2 className="font-diploma text-3xl">Menu</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-10 items-center justify-center rounded-full hover:bg-black/5"
          >
            <X size={22} />
          </button>
        </div>

        {/*
          Country first, because it decides what every other control in
          here means: a brand filter and a category are both scoped to
          one storefront, so choosing the shop before the shelf is the
          order the menu should read in.

          Moved out of the header for room. Two countries already made
          that the tightest row on the page; three would not fit beside
          a wordmark and the account controls on a phone.
        */}
        <section className="border-b border-black/15 pb-8">
          <h3 className="mb-5 text-xs font-semibold tracking-[0.2em] text-black/50 uppercase">
            Country
          </h3>

          <div className="grid grid-cols-3 gap-2">
            {MARKETS.map((entry) => (
              <button
                key={entry.market}
                type="button"
                onClick={() => onMarketChange(entry.market)}
                aria-pressed={market === entry.market}
                className={`min-h-11 rounded-full border px-3 text-sm font-semibold transition ${
                  market === entry.market
                    ? "border-black bg-black text-white"
                    : "border-black/15 bg-white hover:bg-black/5"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </section>

        <section className="border-b border-black/15 py-8">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-[0.2em] text-black/50 uppercase">
              Brands
            </h3>

            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs text-black/50 underline"
            >
              Clear
            </button>
          </div>

          <div className="space-y-3">
            {visibleBrands.map((brand) => (
              <label
                key={brand.slug}
                className="flex cursor-pointer items-center justify-between gap-4 text-sm"
              >
                <span>
                  {brand.englishName}

                  {market === "KR" && (
                    <span className="ml-2 text-black/45">
                      {brand.koreanName}
                    </span>
                  )}
                </span>

                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.slug)}
                  onChange={() => onBrandToggle(brand.slug)}
                  className="size-4 accent-black"
                />
              </label>
            ))}
          </div>

          {hasMoreBrands ? (
            <button
              type="button"
              onClick={() => setShowAllBrands((current) => !current)}
              className="mt-5 w-full rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-black hover:text-white"
            >
              {showAllBrands
                ? "Show first 10"
                : `Show all ${brands.length} brands`}
            </button>
          ) : null}
        </section>

        <section className="pt-8">
          <h3 className="mb-5 text-xs font-semibold tracking-[0.2em] text-black/50 uppercase">
            Categories
          </h3>

          <div className="space-y-1">
            {CATEGORIES.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => {
                  onCategoryChange(category.slug);
                  onClose();
                }}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  selectedCategory === category.slug
                    ? "bg-black text-white"
                    : "hover:bg-black/5"
                }`}
              >
                {market === "KR"
                  ? category.koreanName
                  : category.englishName}
              </button>
            ))}
          </div>
        </section>
      </aside>
    </>
  );
}
