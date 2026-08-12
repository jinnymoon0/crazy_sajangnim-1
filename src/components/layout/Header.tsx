"use client";

import { Menu } from "lucide-react";

import AccountMenu from "@/components/auth/AccountMenu";
import ContactUs from "@/components/contact/ContactUs";
import type { Gender, Market } from "@/types/product";

interface HeaderProps {
  gender: Exclude<Gender, "UNISEX">;
  onGenderChange: (gender: Exclude<Gender, "UNISEX">) => void;
  onMenuOpen: () => void;
}

export function Header({
  gender,
  onGenderChange,
  onMenuOpen,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f5f2ea]/95 backdrop-blur">
      {/*
        Two rows until lg, one above it.

        A menu, a wordmark and 268px of controls do not fit across
        375px, and every way of forcing them into one row failed
        differently: left alone the row pushed the page wider than the
        screen and the fixed blog button went off the right edge;
        allowed to wrap it stacked into three ragged lines; allowed to
        shrink it slid under the wordmark. Giving the controls their own
        row costs a little height below lg and nothing at all above it.
        The switch is lg rather than md because at 800px the wordmark and
        the controls still met in the middle.
      */}
      <div className="grid min-h-20 grid-cols-[1fr_auto_1fr] items-center gap-y-3 px-4 py-3 lg:gap-y-0 lg:px-10 lg:py-0">
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

        <h1 className="font-diploma col-start-2 whitespace-nowrap text-center text-2xl md:text-4xl lg:text-5xl">
          Crazy Sajangnim
        </h1>

        {/*
          Allowed to wrap, and allowed to shrink.

          A grid item will not go narrower than its contents unless it is
          told it may, so this column held its full width and pushed the
          page wider than the screen: on a 375px phone the controls alone
          wanted 268px and the whole site scrolled sideways, taking the
          fixed blog button off the right edge with it.
        */}
        <div className="col-span-3 flex flex-wrap items-center justify-center gap-2 lg:col-span-1 lg:col-start-3 lg:flex-nowrap lg:justify-end lg:gap-3">
          <ContactUs />

          <AccountMenu />

          {/*
            The country lives in the menu now. Two of them already made
            this the tightest row on the page; three would not fit beside
            a wordmark and the account controls on a phone, and the menu
            is where the other scoping controls — brand and category —
            already are.
          */}
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
