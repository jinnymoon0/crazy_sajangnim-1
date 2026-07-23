"use client";

import { Menu } from "lucide-react";
import type { Market } from "@/types/product";

interface HeaderProps {
  market: Market;
  onMarketChange: (market: Market) => void;
  onMenuOpen: () => void;
}

export function Header({
  market,
  onMarketChange,
  onMenuOpen,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 grid h-20 grid-cols-[1fr_auto_1fr] items-center border-b border-black/10 bg-[#f5f2ea]/95 px-4 backdrop-blur md:px-10">
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

      <div className="flex justify-end">
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
            English
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
            Korean
          </button>
        </div>
      </div>
    </header>
  );
}
