export interface SearxngResult {
  title: string;
  url: string;
  content?: string;
  thumbnail?: string;
  img_src?: string;
  engine?: string;
  engines?: string[];
  score?: number;
}

interface SearxngResponse {
  query?: string;
  results?: SearxngResult[];
  unresponsive_engines?: Array<[string, string]>;
}

export interface SearxngSearchResponse {
  results: SearxngResult[];
  unresponsiveEngines: Array<[string, string]>;
}

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

function getSearxngUrl(): string {
  const value = process.env.SEARXNG_URL?.trim();

  if (!value) {
    throw new Error("SEARXNG_URL is missing.");
  }

  return value.replace(/\/+$/, "");
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function requestSearxng(
  url: URL,
): Promise<SearxngSearchResponse> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "crazy-sajangnim/1.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(
      REQUEST_TIMEOUT_MS,
    ),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `SearXNG request failed with status ${response.status}: ${responseText.slice(0, 200)}`,
    );
  }

  let data: SearxngResponse;

  try {
    data = JSON.parse(
      responseText,
    ) as SearxngResponse;
  } catch {
    throw new Error(
      "SearXNG returned invalid JSON.",
    );
  }

  const results = (
    data.results ?? []
  ).filter((result) => {
    return (
      typeof result.title === "string" &&
      result.title.trim().length > 0 &&
      typeof result.url === "string" &&
      /^https?:\/\//i.test(result.url)
    );
  });

  return {
    results,
    unresponsiveEngines:
      data.unresponsive_engines ?? [],
  };
}

export async function searchSearxng(
  query: string,
  options?: {
    language?: string;
    page?: number;
  },
): Promise<SearxngSearchResponse> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return {
      results: [],
      unresponsiveEngines: [],
    };
  }

  const url = new URL(
    `${getSearxngUrl()}/search`,
  );

  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("format", "json");
  url.searchParams.set(
    "language",
    options?.language ?? "en-US",
  );
  url.searchParams.set(
    "pageno",
    String(options?.page ?? 1),
  );
  url.searchParams.set("safesearch", "0");

  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await requestSearxng(url);
    } catch (error) {
      lastError = error;

      console.warn(
        `SearXNG attempt ${attempt} failed:`,
        error,
      );

      if (attempt < MAX_ATTEMPTS) {
        await wait(1_000);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("SearXNG search failed.");
}
