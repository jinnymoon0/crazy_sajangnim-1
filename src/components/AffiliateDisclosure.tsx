"use client";

import { useEffect, useState } from "react";

import { isAffiliateConfigured } from "@/lib/affiliate";
import type { Market } from "@/types/product";

/*
 * The disclosure the law requires wherever a link may pay us.
 *
 * Not a nicety and not a footer link. The US rule (FTC) asks for it
 * clear and conspicuous near the links themselves; Korea's 추천·보증
 * 심사지침 asks for the economic relationship stated plainly; Japan's
 * 景品表示法 has required advertising to be labelled as such since the
 * stealth-marketing rules of 2023. All three of this shop's storefronts
 * are covered, which is why the wording follows the reader.
 *
 * It renders only when a network is actually configured. A site that
 * announces commissions it does not earn is making a different false
 * statement, and a disclosure nobody can act on trains people to skip
 * the one that matters.
 */
const WORDING: Record<Market, string> = {
  US: "Some links here are affiliate links. If you buy through one, we may earn a commission at no extra cost to you.",
  KR: "이 사이트의 일부 링크는 제휴 링크이며, 이를 통해 구매하시면 수수료를 받을 수 있습니다. 구매 가격은 동일합니다.",
  JP: "当サイトのリンクの一部はアフィリエイトリンクです。リンク経由でご購入いただくと、当サイトが手数料を受け取る場合があります（価格は変わりません）。",
};

function marketFromBrowser(): Market {
  const language = navigator.language.toLowerCase();

  if (language.startsWith("ko")) {
    return "KR";
  }

  if (language.startsWith("ja")) {
    return "JP";
  }

  return "US";
}

export default function AffiliateDisclosure({
  market,
  className = "",
}: {
  /*
   * The storefront being browsed, where the page knows it. The shop
   * does; the blog does not, and must not borrow one from the posts —
   * it was reading the market off whichever post happened to be newest,
   * so a Japanese find at the top of the feed served every reader in
   * the world a Japanese disclosure. Who is reading decides this, not
   * where the item is sold.
   */
  market?: Market;
  className?: string;
}) {
  const [readerMarket, setReaderMarket] = useState<Market>(market ?? "US");

  useEffect(() => {
    if (market) {
      return;
    }

    /* Deferred a tick, as elsewhere: the strict effect lint rejects a
     * state update started synchronously in an effect. English until the
     * browser has been asked, which is also what the server rendered. */
    const timer = window.setTimeout(() => {
      setReaderMarket(marketFromBrowser());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [market]);

  if (!isAffiliateConfigured()) {
    return null;
  }

  return (
    <p
      className={`text-xs leading-5 text-black/55 ${className}`}
      /*
       * Named for what it is, so a screen reader announces it as the
       * disclosure rather than as a stray line of small print.
       */
      aria-label="Affiliate disclosure"
    >
      {WORDING[market ?? readerMarket]}
    </p>
  );
}
