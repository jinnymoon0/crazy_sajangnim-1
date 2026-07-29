export type SearxngSearchResult = {
  title: string;
  url: string;
  content?: string;
  thumbnail?: string;
  img_src?: string;
  engine?: string;
  engines?: string[];
  score?: number;
};

type SearxngResponse = {
  query?: string;
  results?: SearxngSearchResult[];
  unresponsive_engines?: Array<[string, string]>;
};

function getSearxngBaseUrl(): string {
  const baseUrl = process.env.SEARXNG_URL?.trim();

  if (!baseUrl) {
    throw new Error("SEARXNG_URL is not configured.");
  }

  return baseUrl.replace(/\/+$/, "");
}

export async function searchSearxng({
  query,
  language = "en-US",
  page = 1,
}: {
  query: string;
  language?: string;
  page?: number;
}): Promise<SearxngSearchResult[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const url = new URL(`${getSearxngBaseUrl()}/search`);

  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", language);
  url.searchParams.set("pageno", String(page));
  url.searchParams.set("safesearch", "0");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "crazy-sajangnim/1.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `SearXNG request failed with ${response.status}: ${responseText.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as SearxngResponse;

  return (data.results ?? []).filter((result) => {
    return (
      typeof result.title === "string" &&
      result.title.trim().length > 0 &&
      typeof result.url === "string" &&
      result.url.startsWith("http")
    );
  });
}
