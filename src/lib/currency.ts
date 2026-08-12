import type { Currency, Market } from "@/types/product";

/* What each storefront banks in. */
export const CURRENCY_BY_MARKET: Record<Market, Currency> = {
  US: "USD",
  KR: "KRW",
  JP: "JPY",
};

export const MARKET_LABEL: Record<Market, string> = {
  US: "United States",
  KR: "Korea",
  JP: "Japan",
};

/*
 * Won and yen have no minor unit — there is no such thing as half a
 * yen — so a price shown with decimals is a price that looks like it
 * came from a converter rather than a shop.
 */
const FRACTION_DIGITS: Record<Currency, number> = {
  USD: 2,
  KRW: 0,
  JPY: 0,
};

const LOCALE: Record<Currency, string> = {
  USD: "en-US",
  KRW: "ko-KR",
  JPY: "ja-JP",
};

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALE[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: FRACTION_DIGITS[currency],
    maximumFractionDigits: FRACTION_DIGITS[currency],
  }).format(amount);
}

export interface RateTable {
  base: "USD";
  rates: Record<string, number>;
}

/*
 * Everything is quoted against the dollar, so a conversion between two
 * non-dollar currencies goes through it. Doing it in one step keeps the
 * rounding to the end — converting won to dollars, rounding, then
 * dollars to yen would show a price that is wrong by more than the
 * rounding it is meant to hide.
 */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  table: RateTable | null | undefined,
): number | null {
  if (from === to) {
    return amount;
  }

  const fromRate = table?.rates?.[from];
  const toRate = table?.rates?.[to];

  if (!fromRate || !toRate || !Number.isFinite(amount)) {
    return null;
  }

  return (amount / fromRate) * toRate;
}

/*
 * The two currencies a shopper is not already looking at.
 *
 * Someone on the Korean storefront is being shown won; what they cannot
 * work out unaided is whether that is a good price in the money they
 * think in. Both of the others are given rather than a guess at which
 * one they want.
 */
export function otherCurrencies(currency: Currency): Currency[] {
  return (["USD", "KRW", "JPY"] as Currency[]).filter(
    (code) => code !== currency,
  );
}
