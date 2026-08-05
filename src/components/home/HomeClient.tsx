"use client";

import Link from "next/link";

import { useEffect, useMemo, useRef, useState } from "react";
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

  const [sort, setSort] = useState<ProductSort>("discount-desc");

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

  const { data, error, isLoading, isValidating, mutate } = useProducts(
    market,
    gender,
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

        case "newest":
          return (
            new Date(second.collectedAt).getTime() -
            new Date(first.collectedAt).getTime()
          );

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
      <Link
        href="/blog"
        className="fixed bottom-6 right-6 z-50 inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-bold !text-white shadow-lg transition hover:bg-neutral-700"
      >
        Clothing Blog
      </Link>
      <Header
        market={market}
        gender={gender}
        onMarketChange={(nextMarket) => {
          setMarket(nextMarket);
          clearFilters();
        }}
        onGenderChange={(nextGender) => {
          setGender(nextGender);
          clearFilters();
        }}
        onMenuOpen={() => setSidebarOpen(true)}
      />

      <Sidebar
        open={sidebarOpen}
        market={market}
        selectedBrands={selectedBrands}
        selectedCategory={selectedCategory}
        onClose={() => setSidebarOpen(false)}
        onBrandToggle={toggleBrand}
        onCategoryChange={setSelectedCategory}
        onClearFilters={clearFilters}
      />

      <section className="mx-auto max-w-[1600px] px-4 py-10 md:px-10">
        <div className="mb-9 flex flex-col justify-between gap-5 border-b border-black/10 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-medium tracking-[0.2em] text-black/45 uppercase">
              {market === "US" ? "United States" : "Korean"}{" "}
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
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => mutate()}
              disabled={isValidating}
              className="h-11 border border-black/15 px-4 text-sm transition hover:bg-black hover:text-white disabled:opacity-40"
            >
              {isValidating ? "Reloading..." : "Reload catalog"}
            </button>

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
