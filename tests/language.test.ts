import { describe, expect, it } from "vitest";

import { countByLanguage, postLanguage } from "@/lib/blog/language";
import type { BlogPost } from "@/types/blog";

const say = (content: string) => postLanguage({ content });

describe("the language of a description", () => {
  it("reads the five languages", () => {
    expect(say("I really like this wallet, what do you guys think?")).toBe("en");
    expect(say("이거 누가 입어줘")).toBe("ko");
    expect(say("これめっちゃ欲しい")).toBe("ja");
    expect(say("这件衣服很好看")).toBe("zh");
    expect(say("Me gusta mucho esta chaqueta")).toBe("es");
  });

  it("ignores the link in the body", () => {
    /*
     * The reason this exists. Every post carries the item's address, and
     * a hostname is fifty Latin letters against three Korean ones — the
     * link was deciding the language.
     */
    expect(
      say(
        "무난쓰\n\nhttps://www.endclothing.com/kr/human-made-dog-overalls-work-shirt",
      ),
    ).toBe("ko");

    expect(
      say("이거 어떰\n\nhttps://www.garmentory.com/sale/nanamica/mens-tops/3269603"),
    ).toBe("ko");
  });

  it("never reads the title", () => {
    /*
     * A title is the product's name, written by the shop that sells it.
     * postLanguage cannot see one — this is the type saying so.
     */
    expect(say("무난쓰")).toBe("ko");
    expect(postLanguage({ content: "무난쓰" })).toBe("ko");
  });

  it("tells Japanese from Chinese by the kana", () => {
    /* Han characters alone are Chinese; kana appear only in Japanese. */
    expect(say("新しいコートを買いました")).toBe("ja");
    expect(say("这个价格很合理")).toBe("zh");
    /* Kanji with kana is still Japanese. */
    expect(say("今日は暑いですね")).toBe("ja");
  });

  it("tells Spanish from English", () => {
    expect(say("Qué bonito, lo quiero")).toBe("es");
    expect(say("Esta camisa es muy bonita y el precio está bien")).toBe("es");
    /* An accented letter alone is enough, without any stopwords. */
    expect(say("Compré una chaqueta añeja")).toBe("es");
    expect(say("¿Dónde compraste eso?")).toBe("es");
  });

  it("does not call English Spanish for one small word", () => {
    /*
     * "no" and "me" are Spanish and English both, so one is a
     * coincidence rather than a language.
     */
    expect(say("No, this is not for me")).toBe("en");
    expect(say("I like this")).toBe("en");
    expect(say("Yo this is fire")).toBe("en");
  });

  it("keeps a mostly-English post English when it names one foreign thing", () => {
    expect(say("I wish I had this 원피스 in my dorm, it looks so good")).toBe(
      "en",
    );
  });

  it("gives no language to a post with no words", () => {
    /*
     * A photograph and a link belong to no language. Claiming one would
     * put the post in front of a reader who cannot use it.
     */
    expect(say("https://shop.example.com/products/thing")).toBeNull();
    expect(say("")).toBeNull();
    expect(say("   \n\n  ")).toBeNull();
  });
});

describe("counting", () => {
  it("counts each language and skips the wordless", () => {
    const posts = [
      { content: "I like this" },
      { content: "Yo this is fire" },
      { content: "이거 내꺼이다" },
      { content: "これ欲しい" },
      { content: "很喜欢" },
      { content: "Me gusta mucho" },
      { content: "https://example.com/only-a-link" },
    ] as BlogPost[];

    expect(countByLanguage(posts)).toEqual({
      en: 2,
      ko: 1,
      ja: 1,
      zh: 1,
      es: 1,
    });
  });
});
