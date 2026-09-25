import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchProducts, type ProductResponse } from "@/lib/catalog-client";

const catalog: ProductResponse = {
  products: [],
  page: 1,
  size: 300,
  total: 0,
  hasMore: false,
  market: "US",
  gender: "MEN",
  updatedAt: "2026-09-25T12:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("catalog client", () => {
  it("retries a malformed successful response once", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("<html>Temporary gateway response</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
      )
      .mockResolvedValueOnce(Response.json(catalog));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchProducts("/api/catalog/products")).resolves.toEqual(
      catalog,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a transient service error once", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ error: "Temporary failure" }, { status: 503 }),
      )
      .mockResolvedValueOnce(Response.json(catalog));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchProducts("/api/catalog/products")).resolves.toEqual(
      catalog,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("replaces Safari's JSON syntax error with a useful message", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      async () =>
        new Response("", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchProducts("/api/catalog/products")).rejects.toThrow(
      "The catalog service returned an empty response.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("preserves a non-transient API error without retrying", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ error: "Invalid market." }, { status: 400 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchProducts("/api/catalog/products")).rejects.toThrow(
      "Invalid market.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
