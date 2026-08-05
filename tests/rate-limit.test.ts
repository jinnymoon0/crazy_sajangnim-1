import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({ rpc }),
}));

async function loadLimiter() {
  /*
   * The module latches "the table is missing" and keeps in-memory
   * counters, both of which have to start clean for each case.
   */
  vi.resetModules();

  return import("@/lib/rate-limit");
}

beforeEach(() => {
  rpc.mockReset();
});

describe("counting in the database", () => {
  it("allows a caller under the limit", async () => {
    const { checkRateLimit } = await loadLimiter();

    rpc.mockResolvedValue({ data: 3, error: null });

    const result = await checkRateLimit("comment", "user:1");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(7);
  });

  it("refuses once the count passes the limit", async () => {
    const { checkRateLimit } = await loadLimiter();

    rpc.mockResolvedValue({ data: 11, error: null });

    const result = await checkRateLimit("comment", "user:1");

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("allows exactly at the limit, and refuses the next one", async () => {
    const { checkRateLimit } = await loadLimiter();

    rpc.mockResolvedValue({ data: 10, error: null });
    await expect(
      checkRateLimit("comment", "user:1").then((r) => r.allowed),
    ).resolves.toBe(true);

    rpc.mockResolvedValue({ data: 11, error: null });
    await expect(
      checkRateLimit("comment", "user:1").then((r) => r.allowed),
    ).resolves.toBe(false);
  });

  it("counts each action separately", async () => {
    const { checkRateLimit } = await loadLimiter();

    rpc.mockResolvedValue({ data: 1, error: null });

    await checkRateLimit("comment", "user:1");
    await checkRateLimit("like", "user:1");

    const keys = rpc.mock.calls.map((call) => call[1].p_key);

    expect(keys).toEqual(["comment:user:1", "like:user:1"]);
  });
});

describe("when the limiter itself cannot work", () => {
  it("falls back to memory if the function is missing", async () => {
    const { checkRateLimit } = await loadLimiter();

    rpc.mockResolvedValue({
      data: null,
      error: { code: "42883", message: "function does not exist" },
    });

    /* The limit for comments is 10 a minute. */
    for (let i = 0; i < 10; i += 1) {
      await expect(
        checkRateLimit("comment", "user:1").then((r) => r.allowed),
      ).resolves.toBe(true);
    }

    await expect(
      checkRateLimit("comment", "user:1").then((r) => r.allowed),
    ).resolves.toBe(false);
  });

  it("stops asking the database once it knows the function is missing", async () => {
    const { checkRateLimit } = await loadLimiter();

    rpc.mockResolvedValue({
      data: null,
      error: { code: "42P01", message: "relation does not exist" },
    });

    await checkRateLimit("comment", "user:1");
    await checkRateLimit("comment", "user:1");
    await checkRateLimit("comment", "user:1");

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("keeps separate counts per caller when counting in memory", async () => {
    const { checkRateLimit } = await loadLimiter();

    rpc.mockResolvedValue({
      data: null,
      error: { code: "42883", message: "function does not exist" },
    });

    for (let i = 0; i < 11; i += 1) {
      await checkRateLimit("comment", "user:noisy");
    }

    await expect(
      checkRateLimit("comment", "user:noisy").then((r) => r.allowed),
    ).resolves.toBe(false);

    /* Someone else is unaffected. */
    await expect(
      checkRateLimit("comment", "user:quiet").then((r) => r.allowed),
    ).resolves.toBe(true);
  });

  it("allows the request when the check throws", async () => {
    /*
     * A rate limiter whose own failure blocks writing is worse than the
     * abuse it prevents.
     */
    const { checkRateLimit } = await loadLimiter();

    rpc.mockRejectedValue(new Error("the database is down"));

    await expect(
      checkRateLimit("comment", "user:1").then((r) => r.allowed),
    ).resolves.toBe(true);
  });
});

describe("who gets counted", () => {
  it("counts a signed-in person by account, not by address", async () => {
    const { callerKey } = await loadLimiter();

    const request = new Request("https://shop.example/api/blog", {
      headers: { "x-forwarded-for": "203.0.113.9" },
    });

    expect(callerKey(request, "user-1")).toBe("user:user-1");
  });

  it("falls back to the address for a visitor with no account", async () => {
    const { callerKey } = await loadLimiter();

    const request = new Request("https://shop.example/api/visits", {
      headers: { "x-forwarded-for": "203.0.113.9, 70.41.3.18" },
    });

    /* The first entry is the client; the rest are proxies. */
    expect(callerKey(request)).toBe("ip:203.0.113.9");
  });

  it("still returns a key when there is no address at all", async () => {
    const { callerKey } = await loadLimiter();

    expect(callerKey(new Request("https://shop.example/api/visits"))).toBe(
      "ip:unknown",
    );
  });
});

describe("recovering after the migration is run", () => {
  it("tries the database again rather than counting in memory forever", async () => {
    /*
     * Instances stay warm across a migration. A one-way latch meant the
     * counters kept falling back to memory long after the table
     * existed, and the only cure was a redeploy — a silly thing to need
     * after running some SQL.
     */
    vi.useFakeTimers();

    try {
      const { checkRateLimit } = await loadLimiter();

      rpc.mockResolvedValue({
        data: null,
        error: { code: "42883", message: "function does not exist" },
      });

      await checkRateLimit("comment", "user:1");
      expect(rpc).toHaveBeenCalledTimes(1);

      /* Straight away, it does not ask again. */
      await checkRateLimit("comment", "user:1");
      expect(rpc).toHaveBeenCalledTimes(1);

      /* Once the migration has had time to be run, it does. */
      vi.advanceTimersByTime(5 * 60_000 + 1);

      rpc.mockResolvedValue({ data: 1, error: null });

      const result = await checkRateLimit("comment", "user:1");

      expect(rpc).toHaveBeenCalledTimes(2);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    } finally {
      vi.useRealTimers();
    }
  });
});
