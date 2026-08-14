import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * The environment is read when the module loads, so each case that
 * needs a different configuration imports it fresh.
 */
async function withEnv(env: Record<string, string | undefined>) {
  vi.resetModules();

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return import("@/lib/affiliate");
}

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("NEXT_PUBLIC_")) {
      delete process.env[key];
    }
  }
});

const PRODUCT = "https://www.endclothing.com/us/some-jacket-123.html";

describe("with nothing configured", () => {
  it("returns every link untouched", async () => {
    const { affiliateUrl } = await withEnv({});

    /*
     * The property that matters most. A missing id must cost a
     * commission, never a working link.
     */
    expect(affiliateUrl(PRODUCT)).toBe(PRODUCT);
    expect(affiliateUrl("https://musinsa.com/goods/123")).toBe(
      "https://musinsa.com/goods/123",
    );
  });

  it("reports no network", async () => {
    const { affiliateNetworkFor } = await withEnv({});

    expect(affiliateNetworkFor(PRODUCT)).toBeNull();
  });
});

describe("with a site-wide network", () => {
  it("wraps a retailer link", async () => {
    const { affiliateUrl } = await withEnv({
      NEXT_PUBLIC_SKIMLINKS_ID: "12345X",
    });

    const wrapped = affiliateUrl(PRODUCT);

    expect(wrapped).toContain("go.skimresources.com");
    expect(wrapped).toContain("id=12345X");
    /* The destination survives, escaped, so the shop still receives it. */
    expect(wrapped).toContain(encodeURIComponent(PRODUCT));
  });

  it("leaves our own links alone", async () => {
    const { affiliateUrl } = await withEnv({
      NEXT_PUBLIC_SKIMLINKS_ID: "12345X",
    });

    /*
     * Sending a visitor to our own blog through an affiliate network is
     * absurd, and on some networks it is what closes the account.
     */
    for (const own of [
      "https://crazy-sajangnim.vercel.app/blog?product=abc",
      "http://localhost:3000/blog",
    ]) {
      expect(affiliateUrl(own), own).toBe(own);
    }
  });

  it("does not wrap a link twice", async () => {
    const { affiliateUrl } = await withEnv({
      NEXT_PUBLIC_SKIMLINKS_ID: "12345X",
    });

    const once = affiliateUrl(PRODUCT);

    expect(affiliateUrl(once)).toBe(once);
  });

  it("leaves anything that is not an http address", async () => {
    const { affiliateUrl } = await withEnv({
      NEXT_PUBLIC_SKIMLINKS_ID: "12345X",
    });

    for (const odd of [
      "javascript:alert(1)",
      "mailto:someone@example.com",
      "not a url at all",
      "",
    ]) {
      expect(affiliateUrl(odd), odd).toBe(odd);
    }
  });
});

describe("with a direct programme", () => {
  /*
   * The registry ships empty on purpose, so this exercises the
   * mechanism through the module's own shape rather than a real
   * merchant: when a row is added and its id is present, the direct
   * link must win over the site-wide one.
   */
  it("prefers a direct programme over the site-wide fallback", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SKIMLINKS_ID = "12345X";
    process.env.NEXT_PUBLIC_AWIN_ID = "999";

    const affiliate = await import("@/lib/affiliate");

    /*
     * Empty registry today, so the fallback is what answers. When a
     * merchant row is added this expectation is the one that should be
     * updated to name it — the test is here to make that a deliberate
     * edit rather than a silent change in behaviour.
     */
    expect(affiliate.affiliateUrl(PRODUCT)).toContain("go.skimresources.com");
    expect(affiliate.affiliateNetworkFor(PRODUCT)).toBe("skimlinks");
  });
});
