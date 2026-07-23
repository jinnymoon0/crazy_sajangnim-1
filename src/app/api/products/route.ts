import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { calculateDiscountPercentage } from "@/lib/utils";
import { inferCategory } from "@/lib/products/infer-category";
import { inferGender } from "@/lib/products/infer-gender";
import type {
  BrandSlug,
} from "@/constants/brands";
import type {
  Gender,
  Market,
  Product,
} from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ShoppingResult {
  title?: string;
  product_id?: string;

  link?: string;
  product_link?: string;

  source?: string;

  price?: string;
  extracted_price?: number;

  old_price?: string;
  extracted_old_price?: number;

  thumbnail?: string;
  serpapi_thumbnail?: string;

  tag?: string;
  badge?: string;
  extensions?: string[];

  second_hand_condition?: string;
}

interface CategorizedShoppingResult {
  shopping_results?: ShoppingResult[];
}

interface SerpApiResponse {
  shopping_results?: ShoppingResult[];
  inline_shopping_results?: ShoppingResult[];

  categorized_shopping_results?: CategorizedShoppingResult[];

  serpapi_pagination?: {
    next?: string;
  };

  error?: string;
}

interface BrandSearch {
  slug: BrandSlug;
  englishName: string;
  koreanName: string;
}

interface SearchPageResult {
  results: ShoppingResult[];
  nextUrl?: string;
  error?: string;
}

interface BrandSearchResult {
  products: Product[];
  rawCount: number;
  error?: string;
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

function isMarket(
  value: string | null,
): value is Market {
  return value === "US" || value === "KR";
}

function isRequestedGender(
  value: string | null,
): value is Exclude<Gender, "UNISEX"> {
  return value === "MEN" || value === "WOMEN";
}

function parsePrice(
  value?: string,
): number | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "");

  const result = Number.parseFloat(normalized);

  return Number.isFinite(result)
    ? result
    : null;
}

function getDiscountFromText(
  result: ShoppingResult,
): number | null {
  const values = [
    result.tag,
    result.badge,
    ...(result.extensions ?? []),
  ].filter(
    (value): value is string =>
      Boolean(value),
  );

  for (const value of values) {
    const match =
      value.match(
        /(\d{1,2})\s*%\s*(?:off|할인)?/i,
      ) ??
      value.match(
        /(?:할인율\s*)?(\d{1,2})\s*%/i,
      );

    if (!match) {
      continue;
    }

    const percentage =
      Number.parseInt(match[1], 10);

    if (
      percentage > 0 &&
      percentage < 100
    ) {
      return percentage;
    }
  }

  return null;
}

function resolveSalePrices(
  result: ShoppingResult,
): {
  salePrice: number;
  originalPrice: number;
  discountPercentage: number;
} | null {
  const salePrice =
    result.extracted_price ??
    parsePrice(result.price);

  if (
    salePrice === null ||
    !Number.isFinite(salePrice) ||
    salePrice <= 0
  ) {
    return null;
  }

  const oldPrice =
    result.extracted_old_price ??
    parsePrice(result.old_price);

  if (
    oldPrice !== null &&
    Number.isFinite(oldPrice) &&
    oldPrice > salePrice
  ) {
    return {
      salePrice,
      originalPrice: oldPrice,
      discountPercentage:
        calculateDiscountPercentage(
          oldPrice,
          salePrice,
        ),
    };
  }

  const explicitDiscount =
    getDiscountFromText(result);

  if (!explicitDiscount) {
    return null;
  }

  const calculatedOriginalPrice =
    salePrice /
    (1 - explicitDiscount / 100);

  if (
    !Number.isFinite(
      calculatedOriginalPrice,
    ) ||
    calculatedOriginalPrice <= salePrice
  ) {
    return null;
  }

  return {
    salePrice,
    originalPrice:
      Math.round(
        calculatedOriginalPrice / 10,
      ) * 10,
    discountPercentage:
      explicitDiscount,
  };
}

function createProductId(
  result: ShoppingResult,
): string {
  if (result.product_id) {
    return result.product_id;
  }

  return createHash("sha256")
    .update(
      [
        result.title ?? "",
        result.source ?? "",
        result.link ??
          result.product_link ??
          "",
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 24);
}

function collectResultGroups(
  response: SerpApiResponse,
): ShoppingResult[] {
  const categorized =
    response
      .categorized_shopping_results
      ?.flatMap(
        (group) =>
          group.shopping_results ?? [],
      ) ?? [];

  return [
    ...(response.shopping_results ?? []),
    ...(response
      .inline_shopping_results ?? []),
    ...categorized,
  ];
}

function createQuery(
  brand: BrandSearch,
  market: Market,
  gender: Exclude<
    Gender,
    "UNISEX"
  >,
): string {
  if (market === "KR") {
    const genderTerm =
      gender === "MEN"
        ? "남성"
        : "여성";

    /*
     * Do not require both English and Korean
     * brand names. OR increases recall.
     */
    return `("${brand.englishName}" OR "${brand.koreanName}") ${genderTerm}`;
  }

  const genderTerm =
    gender === "MEN"
      ? "men"
      : "women";

  return `"${brand.englishName}" ${genderTerm}`;
}

function normalizeProduct(
  result: ShoppingResult,
  brand: BrandSearch,
  market: Market,
  requestedGender: Exclude<
    Gender,
    "UNISEX"
  >,
): Product | null {
  const title =
    result.title?.trim();

  const sourceName =
    result.source?.trim() ||
    "Online retailer";

  const sourceUrl =
    result.link?.trim() ??
    result.product_link?.trim();

  const imageUrl =
    result.serpapi_thumbnail?.trim() ??
    result.thumbnail?.trim();

  if (
    !title ||
    !sourceUrl ||
    !imageUrl
  ) {
    return null;
  }

  if (result.second_hand_condition) {
    return null;
  }

  const prices =
    resolveSalePrices(result);

  if (!prices) {
    return null;
  }

  return {
    id: createProductId(result),

    sourceName,
    sourceUrl,

    market,
    currency:
      market === "KR"
        ? "KRW"
        : "USD",

    gender: inferGender(
      title,
      requestedGender,
    ),

    /*
     * The search itself is brand-specific,
     * so do not require the title to contain
     * the brand again.
     */
    brandSlug: brand.slug,
    brandName: brand.englishName,

    productName: title,
    categorySlug:
      inferCategory(title),

    imageUrl,

    originalPrice:
      prices.originalPrice,
    salePrice:
      prices.salePrice,
    discountPercentage:
      prices.discountPercentage,

    isAvailable: true,
    collectedAt:
      new Date().toISOString(),
  };
}

async function fetchSearchPage(
  url: string,
): Promise<SearchPageResult> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 3600,
      },
    });

    const body =
      (await response.json()) as SerpApiResponse;

    if (!response.ok || body.error) {
      return {
        results: [],
        error:
          body.error ??
          `HTTP ${response.status}`,
      };
    }

    return {
      results:
        collectResultGroups(body),
      nextUrl:
        body.serpapi_pagination?.next,
    };
  } catch (error) {
    return {
      results: [],
      error:
        error instanceof Error
          ? error.message
          : "Unknown request error",
    };
  }
}

async function searchBrand(
  apiKey: string,
  brand: BrandSearch,
  market: Market,
  gender: Exclude<
    Gender,
    "UNISEX"
  >,
): Promise<BrandSearchResult> {
  const parameters =
    new URLSearchParams({
      engine: "google_shopping",
      q: createQuery(
        brand,
        market,
        gender,
      ),

      api_key: apiKey,

      google_domain:
        market === "KR"
          ? "google.co.kr"
          : "google.com",

      gl:
        market === "KR"
          ? "kr"
          : "us",

      hl:
        market === "KR"
          ? "ko"
          : "en",

      /*
       * City-level location gives the
       * search a Korean user context.
       */
      location:
        market === "KR"
          ? "Seoul,South Korea"
          : "New York,New York,United States",

      /*
       * Ask Google Shopping for sale
       * products before local filtering.
       */
      on_sale: "true",

      device: "desktop",
    });

  const firstUrl =
    `https://serpapi.com/search.json?${parameters.toString()}`;

  const firstPage =
    await fetchSearchPage(firstUrl);

  const allResults = [
    ...firstPage.results,
  ];

  let error = firstPage.error;

  /*
   * Follow one next-page URL when present.
   * This increases coverage while limiting
   * API usage.
   */
  if (
    firstPage.nextUrl &&
    !firstPage.error
  ) {
    const nextUrl = new URL(
      firstPage.nextUrl,
    );

    if (
      !nextUrl.searchParams.has(
        "api_key",
      )
    ) {
      nextUrl.searchParams.set(
        "api_key",
        apiKey,
      );
    }

    const secondPage =
      await fetchSearchPage(
        nextUrl.toString(),
      );

    allResults.push(
      ...secondPage.results,
    );

    if (secondPage.error) {
      error = secondPage.error;
    }
  }

  const products = allResults
    .map((result) =>
      normalizeProduct(
        result,
        brand,
        market,
        gender,
      ),
    )
    .filter(
      (
        product,
      ): product is Product =>
        product !== null,
    );

  return {
    products,
    rawCount:
      allResults.length,
    error,
  };
}

export async function GET(
  request: NextRequest,
) {
  const apiKey =
    process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "SERPAPI_API_KEY is missing.",
      },
      {
        status: 500,
      },
    );
  }

  const marketParameter =
    request.nextUrl.searchParams.get(
      "market",
    );

  const genderParameter =
    request.nextUrl.searchParams.get(
      "gender",
    );

  const debug =
    request.nextUrl.searchParams.get(
      "debug",
    ) === "true";

  const market: Market =
    isMarket(marketParameter)
      ? marketParameter
      : "US";

  const gender: Exclude<
    Gender,
    "UNISEX"
  > = isRequestedGender(
    genderParameter,
  )
    ? genderParameter
    : "MEN";

  const results =
    await Promise.all(
      BRANDS.map((brand) =>
        searchBrand(
          apiKey,
          brand,
          market,
          gender,
        ),
      ),
    );

  const allProducts =
    results.flatMap(
      (result) =>
        result.products,
    );

  const products =
    Array.from(
      new Map(
        allProducts.map(
          (product) => [
            [
              product.sourceName,
              product.productName,
              product.salePrice,
            ].join("|"),
            product,
          ],
        ),
      ).values(),
    );

  return NextResponse.json({
    products,
    count: products.length,
    market,
    gender,
    updatedAt:
      new Date().toISOString(),

    ...(debug
      ? {
          diagnostics: {
            brandSearches:
              BRANDS.length,

            rawResults:
              results.reduce(
                (
                  total,
                  result,
                ) =>
                  total +
                  result.rawCount,
                0,
              ),

            productsBeforeDeduplication:
              allProducts.length,

            productsAfterDeduplication:
              products.length,

            byBrand:
              BRANDS.map(
                (
                  brand,
                  index,
                ) => ({
                  brand:
                    brand.englishName,
                  rawResults:
                    results[index]
                      .rawCount,
                  products:
                    results[index]
                      .products
                      .length,
                  error:
                    results[index]
                      .error,
                }),
              ),
          },
        }
      : {}),
  });
}
