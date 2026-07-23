"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProductGrid } from "@/components/products/ProductGrid";
import { DEMO_PRODUCTS } from "@/data/demo-products";
import type { BrandSlug } from "@/constants/brands";
import type { CategorySlug } from "@/constants/categories";
import type {
  Gender,
  Market,
  ProductSort,
} from "@/types/product";

export default function HomePage() {
  const [market, setMarket] = useState<Market>("US");
  const [gender, setGender] = useState<Gender>("MEN");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedBrands, setSelectedBrands] = useState<
    BrandSlug[]
  >([]);

  const [selectedCategory, setSelectedCategory] =
    useState<CategorySlug>("all");

  const [sort, setSort] =
    useState<ProductSort>("discount-desc");

  const products = useMemo(() => {
    const filtered = DEMO_PRODUCTS.filter((product) => {
      const matchesMarket = product.market === market;
      const matchesGender = product.gender === gender;

      const matchesBrand =
        selectedBrands.length === 0 ||
        selectedBrands.includes(product.brandSlug);

      const matchesCategory =
        selectedCategory === "all" ||
        product.categorySlug === selectedCategory;

      return (
        matchesMarket &&
        matchesGender &&
        matchesBrand &&
        matchesCategory &&
        product.isAvailable &&
        product.salePrice < product.originalPrice
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
        default:
          return (
            second.discountPercentage -
            first.discountPercentage
          );
      }
    });
  }, [
    market,
    gender,
    selectedBrands,
    selectedCategory,
    sort,
  ]);

  function toggleBrand(brand: BrandSlug) {
    setSelectedBrands((currentBrands) =>
      currentBrands.includes(brand)
        ? currentBrands.filter(
            (currentBrand) => currentBrand !== brand,
          )
        : [...currentBrands, brand],
    );
  }

  function clearFilters() {
    setSelectedBrands([]);
    setSelectedCategory("all");
  }

  return (
    <main className="min-h-screen bg-[#f5f2ea] text-[#111111]">
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
              {market === "US"
                ? "United States"
                : "Korean"}{" "}
              {gender === "MEN" ? "Menswear" : "Womenswear"} Sale
            </p>

            <h2 className="text-2xl font-medium md:text-3xl">
              Designer Sale Archive
            </h2>

            <p className="mt-2 text-sm text-black/50">
              {products.length} discounted{" "}
              {products.length === 1 ? "item" : "items"}
            </p>
          </div>

          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as ProductSort)
            }
            aria-label="Sort products"
            className="h-11 min-w-48 border border-black/15 bg-transparent px-3 text-sm outline-none"
          >
            <option value="discount-desc">
              Highest discount
            </option>
            <option value="price-asc">
              Lowest price
            </option>
            <option value="price-desc">
              Highest price
            </option>
            <option value="newest">
              Recently added
            </option>
          </select>
        </div>

        <ProductGrid products={products} />
      </section>
    </main>
  );
}
