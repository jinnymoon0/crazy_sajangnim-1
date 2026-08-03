"use client";

import { Menu } from "lucide-react";

import AccountMenu from "@/components/auth/AccountMenu";
import ContactUs from "@/components/contact/ContactUs";
import type { Gender, Market } from "@/types/product";

interface HeaderProps {
  market: Market;
  gender: Exclude<Gender, "UNISEX">;
  onMarketChange: (market: Market) => void;
  onGenderChange: (gender: Exclude<Gender, "UNISEX">) => void;
  onMenuOpen: () => void;
}

export function Header({
  market,
  gender,
  onMarketChange,
  onGenderChange,
  onMenuOpen,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f5f2ea]/95 backdrop-blur">
      <div className="grid min-h-20 grid-cols-[1fr_auto_1fr] items-center px-4 md:px-10">
        <div>
          <button
            type="button"
            onClick={onMenuOpen}
            aria-label="Open menu"
            className="flex size-11 items-center justify-center rounded-full transition hover:bg-black/5"
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>
        </div>

        <h1 className="font-diploma whitespace-nowrap text-center text-2xl md:text-5xl">
          Crazy Sajangnim
        </h1>

        <div className="flex items-center justify-end gap-2 md:gap-3">
          <ContactUs />

          <AccountMenu />

          <div className="flex rounded-full border border-black/15 bg-white p-1">
            <button
              type="button"
              onClick={() => onMarketChange("US")}
              className={`rounded-full px-3 py-2 text-xs transition md:px-4 md:text-sm ${
                market === "US"
                  ? "bg-black text-white"
                  : "hover:bg-black/5"
              }`}
            >
              US
            </button>

            <button
              type="button"
              onClick={() => onMarketChange("KR")}
              className={`rounded-full px-3 py-2 text-xs transition md:px-4 md:text-sm ${
                market === "KR"
                  ? "bg-black text-white"
                  : "hover:bg-black/5"
              }`}
            >
              Korea
            </button>
          </div>
        </div>
      </div>

      <nav
        aria-label="Gender"
        className="flex h-12 items-center justify-center border-t border-black/5"
      >
        <div className="flex gap-8 text-sm font-medium tracking-[0.12em]">
          <button
            type="button"
            onClick={() => onGenderChange("MEN")}
            className={`border-b-2 py-3 transition ${
              gender === "MEN"
                ? "border-black text-black"
                : "border-transparent text-black/40 hover:text-black"
            }`}
          >
            MEN
          </button>

          <button
            type="button"
            onClick={() => onGenderChange("WOMEN")}
            className={`border-b-2 py-3 transition ${
              gender === "WOMEN"
                ? "border-black text-black"
                : "border-transparent text-black/40 hover:text-black"
            }`}
          >
            WOMEN
          </button>
        </div>
      </nav>
    </header>
  );
}
