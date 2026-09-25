import type { Gender, Market, Product } from "@/types/product";

export interface ProductResponse {
  products: Product[];

  page: number;
  size: number;
  total: number;
  hasMore: boolean;

  market: Market;
  gender: Exclude<Gender, "UNISEX">;

  updatedAt: string;
}

interface ErrorResponse {
  error?: string;
}

const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);

function parseResponseBody(response: Response, text: string) {
  if (!text.trim()) {
    throw new Error(
      response.ok
        ? "The catalog service returned an empty response."
        : `The catalog service is temporarily unavailable (${response.status}).`,
    );
  }

  try {
    return JSON.parse(text) as ProductResponse | ErrorResponse;
  } catch {
    throw new Error(
      response.ok
        ? "The catalog service returned an invalid response."
        : `The catalog service is temporarily unavailable (${response.status}).`,
    );
  }
}

export async function fetchProducts(url: string): Promise<ProductResponse> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Unable to load product listings.");

      if (attempt === 0) continue;

      break;
    }

    let body: ProductResponse | ErrorResponse;

    try {
      body = parseResponseBody(response, await response.text());
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Unable to load product listings.");

      if (
        attempt === 0 &&
        (response.ok || TRANSIENT_STATUSES.has(response.status))
      ) {
        continue;
      }

      throw lastError;
    }

    if (!response.ok) {
      const error = new Error(
        "error" in body && body.error
          ? body.error
          : `The catalog service is temporarily unavailable (${response.status}).`,
      );

      if (attempt === 0 && TRANSIENT_STATUSES.has(response.status)) {
        lastError = error;
        continue;
      }

      throw error;
    }

    return body as ProductResponse;
  }

  throw new Error(
    lastError?.message ||
      "The catalog service could not be reached. Please try again.",
  );
}
