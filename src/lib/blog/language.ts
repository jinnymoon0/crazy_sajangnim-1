import type { BlogPost } from "@/types/blog";

export type PostLanguage = "en" | "ko";
export type LanguageFilter = "all" | PostLanguage;

/* Hangul syllables, plus the standalone jamo used in casual writing. */
const HANGUL = /[가-힣ㄱ-ㆎ]/g;
const LATIN = /[A-Za-z]/g;

/* An address is not prose in any language. */
const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/gi;

/*
 * Which language a post is written in, worked out from the writing
 * itself.
 *
 * Nothing records this, and the posts that exist were written before
 * anyone was asked. Counting the letters classifies the whole history
 * without a migration and without making anyone label their own post.
 *
 * A ratio rather than the mere presence of Hangul: an English post
 * naming a Korean shop is still an English post, and a reader who
 * filtered it out would lose it for one word.
 */
export function postLanguage(post: {
  title: string;
  content: string;
}): PostLanguage {
  /*
   * Judged on what the person wrote, with two things taken out first.
   *
   * The link, because a post now carries the item's address in its
   * body: "무난쓰" followed by an endclothing.com url is fifty Latin
   * letters against three Korean ones, and a Korean post was being
   * filed as English by the strength of a hostname nobody reads.
   *
   * And the title, because it is usually the product's name rather than
   * the writer's language — "Human Made Dog Overalls Work Shirt" is
   * what the shop calls it, not what the poster speaks. It is used only
   * when the body has no letters at all, which is a post that is just a
   * link and a photograph.
   */
  const body = post.content.replace(URL_IN_TEXT, " ");

  const hasLetters = HANGUL.test(body) || LATIN.test(body);

  /* .test with /g advances lastIndex; reset before the counting below. */
  HANGUL.lastIndex = 0;
  LATIN.lastIndex = 0;

  const text = hasLetters ? body : `${post.title} ${body}`;

  const hangul = text.match(HANGUL)?.length ?? 0;

  if (hangul === 0) {
    return "en";
  }

  const latin = text.match(LATIN)?.length ?? 0;

  /*
   * Hangul is denser than the Latin alphabet — a syllable is a whole
   * block where English spends four or five letters — so an even split
   * of letters is already a mostly-Korean post. A quarter is about
   * where a post stops being readable to someone who has no Korean.
   */
  return hangul * 4 >= latin ? "ko" : "en";
}

export function countByLanguage(posts: BlogPost[]): Record<PostLanguage, number> {
  return posts.reduce(
    (counts, post) => {
      counts[postLanguage(post)] += 1;

      return counts;
    },
    { en: 0, ko: 0 },
  );
}

export const LANGUAGE_STORAGE_KEY = "blog-language-filter";

export const LANGUAGE_LABELS: Record<LanguageFilter, string> = {
  all: "All",
  en: "English",
  ko: "한국어",
};
