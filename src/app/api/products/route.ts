import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import type { BrandSlug } from "@/constants/brands";
import { inferBrand } from "@/lib/products/infer-brand";
import { inferCategory } from "@/lib/products/infer-category";
import { inferGender } from "@/lib/products/infer-gender";
import { searchSearxng, type SearxngResult } from "@/lib/search/searxng";
import { calculateDiscountPercentage } from "@/lib/utils";
import type { Gender, Market, Product } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BrandSearch {
  slug: BrandSlug;
  englishName: string;
  koreanName: string;
}

interface BrandSearchResult {
  products: Product[];
  rawCount: number;
  unresponsiveEngines: Array<[string, string]>;
  error?: string;
}

interface ParsedPrices {
  salePrice: number;
  originalPrice: number;
  discountPercentage: number;
}

const BRANDS: BrandSearch[] = [
  {
    slug: "auralee",
    englishName: "AURALEE",
    koreanName: "오라리",
  },
  {
    slug: "beams-plus",
    englishName: "BEAMS PLUS",
    koreanName: "빔즈 플러스",
  },
  {
    slug: "comoli",
    englishName: "COMOLI",
    koreanName: "코모리",
  },
  {
    slug: "danton",
    englishName: "DANTON",
    koreanName: "단톤",
  },
  {
    slug: "kamiya",
    englishName: "KAMIYA",
    koreanName: "카미야",
  },
  {
    slug: "kapital",
    englishName: "KAPITAL",
    koreanName: "캐피탈",
  },
  {
    slug: "lemaire",
    englishName: "LEMAIRE",
    koreanName: "르메르",
  },
  {
    slug: "needles",
    englishName: "NEEDLES",
    koreanName: "니들스",
  },
];

const SECOND_HAND_TERMS = [
  "used",
  "pre-owned",
  "preowned",
  "second hand",
  "second-hand",
  "resale",
  "poshmark",
  "therealreal",
  "grailed",
  "ebay",
  "중고",
  "리셀",
  "번개장터",
  "당근",
];

const SALE_TERMS = [
  "sale",
  "clearance",
  "discount",
  "off",
  "outlet",
  "markdown",
  "세일",
  "할인",
  "시즌오프",
  "아울렛",
  "특가",
];

function isMarket(value: string | null): value is Market {
  return value === "US" || value === "KR";
}

function isRequestedGender(
  value: string | null,
): value is Exclude<Gender, "UNISEX"> {
  return value === "MEN" || value === "WOMEN";
}

function createQuery(
  brand: BrandSearch,
  market: Market,
  gender: Exclude<Gender, "UNISEX">,
): string {
  if (market === "KR") {
    const genderTerms =
      gender === "MEN" ? "(남성 OR 남자 OR 맨즈)" : "(여성 OR 여자 OR 우먼)";

    return [
      `("${brand.englishName}" OR "${brand.koreanName}")`,
      genderTerms,
      "(세일 OR 할인 OR 시즌오프 OR 아울렛)",
      "(의류 OR 자켓 OR 팬츠 OR 셔츠 OR 니트 OR 신발 OR 가방)",
      "-중고",
      "-리셀",
    ].join(" ");
  }

  const genderTerms = gender === "MEN" ? "(men OR mens)" : "(women OR womens)";

  return [
    `"${brand.englishName}"`,
    genderTerms,
    "(sale OR clearance OR discount OR outlet)",
    "(clothing OR jacket OR pants OR shirt OR knitwear OR shoes OR bag)",
    "-used",
    "-resale",
    "-preowned",
  ].join(" ");
}

function getResultText(result: SearxngResult): string {
  return [result.title, result.content, result.url]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function containsSaleTerm(text: string): boolean {
  const normalized = text.toLowerCase();

  return SALE_TERMS.some((term) => normalized.includes(term));
}

function isSecondHandResult(text: string): boolean {
  const normalized = text.toLowerCase();

  return SECOND_HAND_TERMS.some((term) => normalized.includes(term));
}

function extractDiscountPercentage(text: string): number | null {
  const patterns = [
    /(\d{1,2})\s*%\s*(?:off|discount|할인)/i,
    /(?:up to|최대)\s*(\d{1,2})\s*%/i,
    /(?:할인율\s*)?(\d{1,2})\s*%/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    const percentage = Number.parseInt(match[1], 10);

    if (percentage > 0 && percentage < 100) {
      return percentage;
    }
  }

  return null;
}

function extractUsdPrices(text: string): number[] {
  const matches = Array.from(text.matchAll(/\$\s*([\d,]+(?:\.\d{1,2})?)/g));

  return matches
    .map((match) => Number.parseFloat(match[1].replace(/,/g, "")))
    .filter(
      (value) => Number.isFinite(value) && value > 0 && value < 1_000_000,
    );
}

function extractKrwPrices(text: string): number[] {
  const wonSuffixMatches = Array.from(text.matchAll(/([\d,]{3,})\s*원/g)).map(
    (match) => Number.parseInt(match[1].replace(/,/g, ""), 10),
  );

  const wonPrefixMatches = Array.from(
    text.matchAll(/(?:₩|KRW)\s*([\d,]+)/gi),
  ).map((match) => Number.parseInt(match[1].replace(/,/g, ""), 10));

  return [...wonSuffixMatches, ...wonPrefixMatches].filter(
    (value) =>
      Number.isFinite(value) && value >= 1_000 && value < 1_000_000_000,
  );
}

function uniqueSortedPrices(prices: number[]): number[] {
  return Array.from(
    new Set(prices.map((price) => Math.round(price * 100) / 100)),
  ).sort((a, b) => a - b);
}

function resolveSalePrices(text: string, market: Market): ParsedPrices | null {
  const prices = uniqueSortedPrices(
    market === "KR" ? extractKrwPrices(text) : extractUsdPrices(text),
  );

  const explicitDiscount = extractDiscountPercentage(text);

  if (prices.length >= 2) {
    const salePrice = prices[0];
    const originalPrice = prices[prices.length - 1];

    if (originalPrice > salePrice) {
      return {
        salePrice,
        originalPrice,
        discountPercentage: calculateDiscountPercentage(
          originalPrice,
          salePrice,
        ),
      };
    }
  }

  if (prices.length >= 1 && explicitDiscount) {
    const salePrice = prices[0];
    const originalPrice = salePrice / (1 - explicitDiscount / 100);

    if (Number.isFinite(originalPrice) && originalPrice > salePrice) {
      return {
        salePrice,
        originalPrice:
          market === "KR"
            ? Math.round(originalPrice / 10) * 10
            : Math.round(originalPrice * 100) / 100,
        discountPercentage: explicitDiscount,
      };
    }
  }

  return null;
}

function getSourceName(result: SearxngResult): string {
  try {
    return new URL(result.url).hostname.replace(/^www\./, "");
  } catch {
    return result.engine?.trim() || "Online retailer";
  }
}

function getImageUrl(result: SearxngResult): string | null {
  const image = result.thumbnail?.trim() || result.img_src?.trim();

  if (!image || !/^https?:\/\//i.test(image)) {
    return null;
  }

  return image;
}

function createProductId(result: SearxngResult): string {
  return createHash("sha256")
    .update([result.title, result.url, result.engine ?? ""].join("|"))
    .digest("hex")
    .slice(0, 24);
}

function normalizeProduct(
  result: SearxngResult,
  brand: BrandSearch,
  market: Market,
  requestedGender: Exclude<Gender, "UNISEX">,
): Product | null {
  const title = result.title.trim();
  const sourceUrl = result.url.trim();
  const imageUrl = getImageUrl(result);
  const text = getResultText(result);

  if (!title || !sourceUrl || !imageUrl) {
    return null;
  }

  if (!containsSaleTerm(text) || isSecondHandResult(text)) {
    return null;
  }

  const detectedBrand = inferBrand(text);

  if (!detectedBrand || detectedBrand.slug !== brand.slug) {
    return null;
  }

  const prices = resolveSalePrices(text, market);

  if (!prices) {
    return null;
  }

  return {
    id: createProductId(result),

    sourceName: getSourceName(result),
    sourceUrl,

    market,
    currency: market === "KR" ? "KRW" : "USD",

    gender: inferGender(text, requestedGender),

    brandSlug: detectedBrand.slug,
    brandName: detectedBrand.name,

    productName: title,
    categorySlug: inferCategory(text),

    imageUrl,

    originalPrice: prices.originalPrice,
    salePrice: prices.salePrice,
    discountPercentage: prices.discountPercentage,
    saleVerification: "VERIFIED",

    isAvailable: true,
    collectedAt: new Date().toISOString(),
  };
}

async function searchBrand(
  brand: BrandSearch,
  market: Market,
  gender: Exclude<Gender, "UNISEX">,
): Promise<BrandSearchResult> {
  try {
    const response = await searchSearxng(createQuery(brand, market, gender), {
      language: market === "KR" ? "ko-KR" : "en-US",
      page: 1,
    });

    const products = response.results
      .map((result) => normalizeProduct(result, brand, market, gender))
      .filter((product): product is Product => product !== null);

    return {
      products,
      rawCount: response.results.length,
      unresponsiveEngines: response.unresponsiveEngines,
    };
  } catch (error) {
    return {
      products: [],
      rawCount: 0,
      unresponsiveEngines: [],
      error: error instanceof Error ? error.message : "Unknown SearXNG error",
    };
  }
}

export async function GET(request: NextRequest) {
  if (!process.env.SEARXNG_URL?.trim()) {
    return NextResponse.json(
      {
        error: "SEARXNG_URL is missing.",
      },
      {
        status: 500,
      },
    );
  }

  const marketParameter = request.nextUrl.searchParams.get("market");

  const genderParameter = request.nextUrl.searchParams.get("gender");

  const debug = request.nextUrl.searchParams.get("debug") === "true";

  const market: Market = isMarket(marketParameter) ? marketParameter : "US";

  const gender: Exclude<Gender, "UNISEX"> = isRequestedGender(genderParameter)
    ? genderParameter
    : "MEN";

  const results = await Promise.all(
    BRANDS.map((brand) => searchBrand(brand, market, gender)),
  );

  const allProducts = results.flatMap((result) => result.products);

  const products = Array.from(
    new Map(
      allProducts.map((product) => [
        [product.sourceName, product.productName, product.salePrice].join("|"),
        product,
      ]),
    ).values(),
  );

  const errors = results
    .map((result) => result.error)
    .filter((error): error is string => Boolean(error));

  if (products.length === 0 && errors.length === results.length) {
    return NextResponse.json(
      {
        error: errors[0] ?? "Unable to retrieve sale listings.",
      },
      {
        status: 502,
      },
    );
  }

  return NextResponse.json({
    products,
    count: products.length,
    market,
    gender,
    updatedAt: new Date().toISOString(),

    ...(debug
      ? {
          diagnostics: {
            provider: "searxng",

            brandSearches: BRANDS.length,

            rawResults: results.reduce(
              (total, result) => total + result.rawCount,
              0,
            ),

            productsBeforeDeduplication: allProducts.length,

            productsAfterDeduplication: products.length,

            byBrand: BRANDS.map((brand, index) => ({
              brand: brand.englishName,
              rawResults: results[index].rawCount,
              products: results[index].products.length,
              error: results[index].error,
              unresponsiveEngines: results[index].unresponsiveEngines,
            })),
          },
        }
      : {}),
  });
}
