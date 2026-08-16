import { afterEach, describe, expect, it, vi } from "vitest";

async function loadConfig(env: Record<string, string | undefined>) {
  vi.resetModules();

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return import("@/lib/catalog-backend");
}

afterEach(() => {
  delete process.env.BACKEND_URL;
  delete process.env.VERCEL;
});

describe("catalog backend configuration", () => {
  it("accepts a deployed domain without an explicit protocol", async () => {
    const { getCatalogBackendConfig } = await loadConfig({
      BACKEND_URL: "crazy-sajangnim-backend.vercel.app",
      VERCEL: "1",
    });

    const config = getCatalogBackendConfig();

    expect(config.url?.toString()).toBe(
      "https://crazy-sajangnim-backend.vercel.app/",
    );
  });

  it("allows localhost during local development", async () => {
    const { getCatalogBackendConfig } = await loadConfig({
      BACKEND_URL: "http://127.0.0.1:3002",
      VERCEL: undefined,
    });

    const config = getCatalogBackendConfig();

    expect(config.url?.toString()).toBe("http://127.0.0.1:3002/");
  });

  it("rejects localhost in Vercel", async () => {
    const { getCatalogBackendConfig } = await loadConfig({
      BACKEND_URL: "http://127.0.0.1:3002",
      VERCEL: "1",
    });

    const config = getCatalogBackendConfig();

    expect(config.url).toBeUndefined();
    expect(config.error).toContain("localhost");
  });
});
