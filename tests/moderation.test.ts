import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({ auth }));

const viewer = { id: "user-1", username: "pikachu" };

/*
 * The module reads SUPER_ADMIN_EMAIL when it loads, so each case
 * re-imports it after setting the environment it wants.
 */
async function loadModeration(email?: string) {
  vi.resetModules();

  if (email) {
    vi.stubEnv("SUPER_ADMIN_EMAIL", email);
  }

  return import("@/lib/blog/moderation");
}

function signedInAs(email: string | null, googleEmailVerified?: boolean) {
  auth.mockResolvedValue(
    email === null
      ? null
      : { user: { email, ...(googleEmailVerified === undefined ? {} : { googleEmailVerified }) } },
  );
}

beforeEach(() => {
  auth.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("who counts as the super admin", () => {
  it("matches the configured address", async () => {
    const { isSuperAdminEmail } = await loadModeration("boss@example.com");

    expect(isSuperAdminEmail("boss@example.com")).toBe(true);
  });

  it("ignores case, because addresses are not case sensitive", async () => {
    const { isSuperAdminEmail } = await loadModeration("boss@example.com");

    expect(isSuperAdminEmail("BOSS@Example.COM")).toBe(true);
  });

  it("rejects anyone else", async () => {
    const { isSuperAdminEmail } = await loadModeration("boss@example.com");

    expect(isSuperAdminEmail("someone@example.com")).toBe(false);
    expect(isSuperAdminEmail(null)).toBe(false);
    expect(isSuperAdminEmail(undefined)).toBe(false);
    expect(isSuperAdminEmail("")).toBe(false);
  });

  it("is not fooled by an address that merely contains it", async () => {
    const { isSuperAdminEmail } = await loadModeration("boss@example.com");

    expect(isSuperAdminEmail("boss@example.com.attacker.net")).toBe(false);
    expect(isSuperAdminEmail("notboss@example.com")).toBe(false);
  });
});

describe("the signed-in viewer", () => {
  it("is the super admin when their verified address matches", async () => {
    const { isViewerSuperAdmin } = await loadModeration("boss@example.com");

    signedInAs("boss@example.com", true);

    await expect(isViewerSuperAdmin()).resolves.toBe(true);
  });

  it("is not, on an unverified address", async () => {
    /*
     * The address is the whole of the permission, so an unverified one
     * proves nothing about who owns it.
     */
    const { isViewerSuperAdmin } = await loadModeration("boss@example.com");

    signedInAs("boss@example.com", false);

    await expect(isViewerSuperAdmin()).resolves.toBe(false);
  });

  it("is not, when signed out", async () => {
    const { isViewerSuperAdmin } = await loadModeration("boss@example.com");

    signedInAs(null);

    await expect(isViewerSuperAdmin()).resolves.toBe(false);
  });
});

describe("who may change a post or comment", () => {
  it("lets the writer change their own", async () => {
    const { canModerate } = await loadModeration("boss@example.com");

    signedInAs("someone@example.com", true);

    await expect(
      canModerate({ user_id: "user-1", author_name: "pikachu" }, viewer),
    ).resolves.toBe(true);
  });

  it("stops an ordinary reader changing someone else's", async () => {
    const { canModerate } = await loadModeration("boss@example.com");

    signedInAs("someone@example.com", true);

    await expect(
      canModerate({ user_id: "user-2", author_name: "other" }, viewer),
    ).resolves.toBe(false);
  });

  it("lets the super admin change anyone's", async () => {
    const { canModerate } = await loadModeration("boss@example.com");

    signedInAs("boss@example.com", true);

    await expect(
      canModerate({ user_id: "user-2", author_name: "other" }, viewer),
    ).resolves.toBe(true);
  });

  it("stops even the super admin when their address is unverified", async () => {
    const { canModerate } = await loadModeration("boss@example.com");

    signedInAs("boss@example.com", false);

    await expect(
      canModerate({ user_id: "user-2", author_name: "other" }, viewer),
    ).resolves.toBe(false);
  });

  it("does not let a row with no recorded author be claimed", async () => {
    const { canModerate } = await loadModeration("boss@example.com");

    signedInAs("someone@example.com", true);

    await expect(
      canModerate({ user_id: null, author_name: "pikachu" }, viewer),
    ).resolves.toBe(false);
  });
});
