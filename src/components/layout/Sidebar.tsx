"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { BRANDS, type BrandSlug } from "@/constants/brands";
import {
  CATEGORIES,
  type CategorySlug,
} from "@/constants/categories";
import type { Market } from "@/types/product";

interface SidebarProps {
  open: boolean;
  market: Market;
  selectedBrands: BrandSlug[];
  selectedCategory: CategorySlug;
  onClose: () => void;
  onBrandToggle: (brand: BrandSlug) => void;
  onCategoryChange: (category: CategorySlug) => void;
  onClearFilters: () => void;
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
}: SidebarProps) {
  /*
   * Brands are managed in the admin, so read the live list; the shipped
   * constant is the fallback while it loads or if the request fails.
   */
  const [brands, setBrands] = useState<
    { slug: string; englishName: string; koreanName: string | null }[]
  >(() =>
    BRANDS.map((brand) => ({
      slug: brand.slug,
      englishName: brand.englishName,
      koreanName: brand.koreanName,
    })),
  );

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/catalog/brands");
        const body = (await response.json()) as {
          brands?: {
            slug: string;
            englishName: string;
            koreanName: string | null;
          }[];
        };

        if (!cancelled && body.brands?.length) {
          setBrands(body.brands);
        }
      } catch {
        // Keep the shipped list.
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

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

        <section className="border-b border-black/15 pb-8">
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
            {brands.map((brand) => (
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
