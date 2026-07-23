import { KOREAN_RETAILERS } from "./korean-retailers";

interface OrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
  source?: string;
  displayed_link?: string;
  thumbnail?: string;
}

interface GoogleSearchResponse {
  organic_results?: OrganicResult[];

  serpapi_pagination?: {
    next?: string;
  };

  error?: string;
}

export interface RetailerDiscoveryResult {
  retailerName: string;
  title: string;
  url: string;
  snippet: string;
  thumbnail?: string;
}

interface DiscoverOptions {
  apiKey: string;
  englishBrandName: string;
  koreanBrandName: string;
  gender: "MEN" | "WOMEN";
  maxRetailers?: number;
}

function buildRetailerQuery(
  domain: string,
  englishBrandName: string,
  koreanBrandName: string,
  gender: "MEN" | "WOMEN",
): string {
  const genderTerms =
    gender === "MEN"
      ? "(남성 OR 남자 OR 맨즈)"
      : "(여성 OR 여자 OR 우먼)";

  return [
    `site:${domain}`,
    `("${englishBrandName}" OR "${koreanBrandName}")`,
    genderTerms,
    "(세일 OR 할인 OR 시즌오프 OR 아울렛)",
    "-중고",
    "-리셀",
  ].join(" ");
}

async function fetchGoogleSearch(
  apiKey: string,
  query: string,
): Promise<OrganicResult[]> {
  const params = new URLSearchParams({
    engine: "google",
    q: query,
    api_key: apiKey,
    google_domain: "google.co.kr",
    gl: "kr",
    hl: "ko",
    location: "Seoul,South Korea",
    num: "20",
    device: "desktop",
  });

  const response = await fetch(
    `https://serpapi.com/search.json?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 21_600,
      },
    },
  );

  const body = (await response.json()) as GoogleSearchResponse;

  if (!response.ok || body.error) {
    throw new Error(
      body.error ?? `Google retailer search returned HTTP ${response.status}`,
    );
  }

  return body.organic_results ?? [];
}

function looksLikeProductPage(result: OrganicResult): boolean {
  if (!result.link || !result.title) {
    return false;
  }

  const text = [
    result.title,
    result.snippet,
    result.link,
    result.displayed_link,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const excludedTerms = [
    "고객센터",
    "이용약관",
    "개인정보",
    "브랜드관",
    "검색결과",
    "기획전 전체",
    "로그인",
    "회원가입",
  ];

  return !excludedTerms.some((term) => text.includes(term));
}

export async function discoverKoreanRetailerPages({
  apiKey,
  englishBrandName,
  koreanBrandName,
  gender,
  maxRetailers = 6,
}: DiscoverOptions): Promise<RetailerDiscoveryResult[]> {
  /*
   * Limit the number of retailer-specific searches to control SerpApi usage.
   * Increase this only after checking your monthly quota.
   */
  const retailers = KOREAN_RETAILERS.slice(0, maxRetailers);

  const settled = await Promise.allSettled(
    retailers.flatMap((retailer) =>
      retailer.domains.slice(0, 1).map(async (domain) => {
        const query = buildRetailerQuery(
          domain,
          englishBrandName,
          koreanBrandName,
          gender,
        );

        const results = await fetchGoogleSearch(apiKey, query);

        return results
          .filter(looksLikeProductPage)
          .map((result) => ({
            retailerName: retailer.name,
            title: result.title!,
            url: result.link!,
            snippet: result.snippet ?? "",
            thumbnail: result.thumbnail,
          }));
      }),
    ),
  );

  const results = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  return Array.from(
    new Map(results.map((result) => [result.url, result])).values(),
  );
}
