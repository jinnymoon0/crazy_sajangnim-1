import { describe, expect, it } from "vitest";

import { displayName, isAuthor } from "@/lib/blog/authorship";

const viewer = { id: "user-1", username: "pikachu" };

describe("who wrote it", () => {
  it("recognises the writer by account id", () => {
    expect(isAuthor({ user_id: "user-1", author_name: "pikachu" }, viewer)).toBe(
      true,
    );
  });

  it("does not recognise a different account", () => {
    expect(isAuthor({ user_id: "user-2", author_name: "someone" }, viewer)).toBe(
      false,
    );
  });

  it("refuses a row whose author cannot be established", () => {
    /*
     * Written before the id was recorded, and the account is gone. No
     * one should be trusted as them.
     */
    expect(isAuthor({ user_id: null, author_name: "pikachu" }, viewer)).toBe(
      false,
    );
  });

  it("never accepts a matching name as proof", () => {
    /*
     * This is the whole reason authorship moved to the id. A username is
     * unique among accounts that exist, not across time: deleting an
     * account frees its name for anyone else to claim, and reading the
     * name as proof would hand that person everything the first one
     * ever wrote.
     */
    expect(
      isAuthor({ user_id: "someone-else", author_name: "pikachu" }, viewer),
    ).toBe(false);
  });

  it("is unmoved by an empty id", () => {
    expect(isAuthor({ user_id: "", author_name: "pikachu" }, viewer)).toBe(
      false,
    );
  });
});

describe("the name to show", () => {
  it("prefers what the account is called now, so a rename carries", () => {
    const names = new Map([["user-1", "raichu"]]);

    expect(
      displayName({ user_id: "user-1", author_name: "pikachu" }, names),
    ).toBe("raichu");
  });

  it("falls back to the name recorded at the time", () => {
    expect(
      displayName({ user_id: "user-9", author_name: "pikachu" }, new Map()),
    ).toBe("pikachu");
  });

  it("says Anonymous when there is nothing to go on", () => {
    expect(displayName({ user_id: null, author_name: null }, new Map())).toBe(
      "Anonymous",
    );
  });
});
