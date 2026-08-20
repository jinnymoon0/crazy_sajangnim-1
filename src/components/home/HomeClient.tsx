"use client";

import Link from "next/link";

import { useEffect, useMemo, useRef, useState } from "react";
import AffiliateDisclosure from "@/components/AffiliateDisclosure";
import CommunityBanner from "@/components/layout/CommunityBanner";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProductGrid } from "@/components/products/ProductGrid";
import { recordView } from "@/components/VisitRecorder";
import { useProducts } from "@/hooks/use-products";
import type { BrandSlug } from "@/constants/brands";
import type { CategorySlug } from "@/constants/categories";
import type { Gender, Market, ProductSort } from "@/types/product";
import { reportSearch } from "@/lib/analytics/report";

type SelectableGender = Exclude<Gender, "UNISEX">;

/* Reads as a place, not a country code. */
const STOREFRONT_LABEL: Record<Market, string> = {
  US: "United States",
  KR: "Korean",
  JP: "Japanese",
};

export default function HomeClient({
  isSignedIn,
}: {
  isSignedIn: boolean;
}) {
  const [market, setMarket] = useState<Market>("US");
  const [gender, setGender] = useState<SelectableGender>("MEN");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedBrands, setSelectedBrands] = useState<BrandSlug[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<CategorySlug>("all");

  /*
   * There is no search box: choosing brands and a category is how
   * someone searches here, so that is what gets recorded. Reported
   * after the filters settle, because picking four brands is one
   * search, not four.
   *
   * The empty default is skipped — arriving on the page is already a
   * page view, and counting it again as a search would drown the real
   * ones.
   */
  useEffect(() => {
    if (selectedBrands.length === 0 && selectedCategory === "all") {
      return;
    }

    reportSearch({
      market,
      gender,
      metadata: {
        brands: selectedBrands.join(","),
        category: selectedCategory,
        brandCount: selectedBrands.length,
      },
    });
  }, [selectedBrands, selectedCategory, market, gender]);

  /*
   * Newest first. The catalogue collects itself every hour and the
   * point of that is for people to see what has just landed, which the
   * biggest-discount order buried: a fresh arrival is rarely also the
   * deepest reduction in the shop, so it sat pages down.
   */
  const [sort, setSort] = useState<ProductSort>("newest");

  /*
   * Changing storefront is this shop's equivalent of turning to another
   * page, so report it. The first render is already reported by the
   * recorder in the layout; this picks up the switches after it.
   */
  const reportedFirst = useRef(false);

  useEffect(() => {
    if (!reportedFirst.current) {
      reportedFirst.current = true;

      return;
    }

    recordView({ market, gender });
  }, [market, gender]);

  const { data, error, isLoading } = useProducts(
    market,
    gender,
    sort,
  );

  const products = useMemo(() => {
    const filtered = (data?.products ?? []).filter((product) => {
      const matchesBrand =
        selectedBrands.length === 0 ||
        selectedBrands.includes(product.brandSlug);

      const matchesCategory =
        selectedCategory === "all" || product.categorySlug === selectedCategory;

      return (
        matchesBrand &&
        matchesCategory &&
        product.isAvailable &&
        product.salePrice > 0
      );
    });

    return [...filtered].sort((first, second) => {
      switch (sort) {
        case "price-asc":
          return first.salePrice - second.salePrice;

        case "price-desc":
          return second.salePrice - first.salePrice;

        /*
         * firstSeenAt, not collectedAt. Every refresh rewrites
         * collectedAt for everything still in stock, so ordering by it
         * ranked the whole shop by when we last looked rather than by
         * when anything arrived — after a run, nearly every item shared
         * one timestamp and the order was effectively arbitrary.
         */
        case "newest": {
          const firstArrived = new Date(
            first.firstSeenAt ?? first.collectedAt,
          ).getTime();

          const secondArrived = new Date(
            second.firstSeenAt ?? second.collectedAt,
          ).getTime();

          if (secondArrived !== firstArrived) {
            return secondArrived - firstArrived;
          }

          /* A whole collection shares a timestamp; keep the order stable. */
          return first.id.localeCompare(second.id);
        }

        case "discount-desc":
        default: {
          const verificationDifference =
            Number(second.saleVerification === "VERIFIED") -
            Number(first.saleVerification === "VERIFIED");

          if (verificationDifference !== 0) {
            return verificationDifference;
          }

          return (
            (second.discountPercentage ?? 0) - (first.discountPercentage ?? 0)
          );
        }
      }
    });
  }, [data, selectedBrands, selectedCategory, sort]);

  function toggleBrand(brand: BrandSlug) {
    setSelectedBrands((currentBrands) =>
      currentBrands.includes(brand)
        ? currentBrands.filter((currentBrand) => currentBrand !== brand)
        : [...currentBrands, brand],
    );
  }

  function clearFilters() {
    setSelectedBrands([]);
    setSelectedCategory("all");
  }

  return (
    <main className="min-h-screen bg-[#f5f2ea] text-[#111111]">
      {/*
        The banner and the header travel as one pinned block, so what
        this site is stays on screen for the whole scroll rather than
        being a claim made once at the top and then gone.

        z-30, not higher: the sidebar's backdrop is z-40 and has to be
        able to dim this the way it already dimmed the header, and the
        floating blog button at z-50 stays above both.
      */}
      <div className="sticky top-0 z-30">
        <CommunityBanner />

        <Header
          gender={gender}
          onGenderChange={setGender}
          onMenuOpen={() => setSidebarOpen(true)}
        />
      </div>

      {/*
        The one route off the grid, so it has to survive whatever it is
        sitting on: the page scrolls under it and a black pill on a dark
        product photo disappears. The ring keeps an edge against both the
        cream page and a dark image, and the dot is the part the eye
        catches first — it reads as something waiting rather than another
        piece of furniture.

        Deliberately outside the sticky block above. A fixed element
        nested in it would be stacked inside that block's z-30 context,
        which puts this button under the sidebar rather than over it —
        the one thing its z-50 exists to prevent.
      */}
      <Link
        href="/blog"
        aria-label="Open the clothing blog"
        className="blog-red-strip group/blog fixed right-6 bottom-6 z-50 inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full px-7 py-4 text-sm font-bold !text-white shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 transition-transform group-hover/blog:scale-110"
        >
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
        </svg>

        Clothing Blog

        {/*
          Decorative. It is not a count of anything, so it is hidden from
          screen readers rather than announced as information that does
          not exist.
        */}
        <span
          aria-hidden="true"
          className="absolute -top-2 -right-2 rounded-full bg-[#ff2a13] px-2 py-0.5 text-[10px] leading-none font-black tracking-[0.12em] text-white ring-2 ring-white"
        >
          LIVE
        </span>
      </Link>

      <Sidebar
        open={sidebarOpen}
        market={market}
        selectedBrands={selectedBrands}
        selectedCategory={selectedCategory}
        onClose={() => setSidebarOpen(false)}
        onBrandToggle={toggleBrand}
        onCategoryChange={setSelectedCategory}
        onClearFilters={clearFilters}
        onMarketChange={(nextMarket) => {
          setMarket(nextMarket);
          setSidebarOpen(false);
        }}
      />

      <section className="mx-auto max-w-[1600px] px-4 py-10 md:px-10">
        <div className="mb-9 flex flex-col justify-between gap-5 border-b border-black/10 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-medium tracking-[0.2em] text-black/45 uppercase">
              {STOREFRONT_LABEL[market]}{" "}
              {gender === "MEN" ? "Menswear" : "Womenswear"} Sale
            </p>

            <h2 className="text-2xl font-medium md:text-3xl">
              Designer Sale Archive
            </h2>

            <p className="mt-2 text-sm text-black/50">
              {isLoading
                ? "Loading sale listings..."
                : `${
                    selectedBrands.length === 0 && selectedCategory === "all"
                      ? (data?.total ?? products.length)
                      : products.length
                  } sale ${
                    (selectedBrands.length === 0 && selectedCategory === "all"
                      ? (data?.total ?? products.length)
                      : products.length) === 1
                      ? "listing"
                      : "listings"
                  }`}
            </p>

            {/*
              Beside the listings rather than in a footer nobody opens:
              the rule in all three of these markets is that it be near
              the links it is about. Renders as nothing until a network
              is actually configured.
            */}
            <AffiliateDisclosure market={market} className="mt-3 max-w-xl" />
          </div>

          {/*
            No reload button. The catalogue refreshes itself every five
            minutes, on returning to the tab, and on reconnecting, so
            the button asked people to do by hand a job already done for
            them — and pressing it on a cached response returned the same
            listings, which reads as the site being broken rather than
            already current.
          */}
          <div className="flex flex-wrap gap-3">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as ProductSort)}
              aria-label="Sort products"
              className="h-11 min-w-48 border border-black/15 bg-transparent px-3 text-sm outline-none"
            >
              <option value="discount-desc">Verified sales first</option>
              <option value="price-asc">Lowest price</option>
              <option value="price-desc">Highest price</option>
              <option value="newest">Recently added</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="border border-red-300 bg-red-50 p-6">
            <p className="font-medium">Unable to retrieve sale listings</p>

            <p className="mt-2 text-sm text-red-700">{error.message}</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index}>
                <div className="aspect-[4/5] animate-pulse bg-black/10" />
                <div className="mt-4 h-3 w-20 animate-pulse bg-black/10" />
                <div className="mt-3 h-3 w-3/4 animate-pulse bg-black/10" />
              </div>
            ))}
          </div>
        ) : (
          <ProductGrid products={products} isSignedIn={isSignedIn} />
        )}
      </section>
    </main>
  );
}
