import type { BlogPost } from "@/types/blog";

export type PostLanguage = "en" | "ko";
export type LanguageFilter = "all" | PostLanguage;

/* Hangul syllables, plus the standalone jamo used in casual writing. */
const HANGUL = /[가-힣ㄱ-ㆎ]/g;
const LATIN = /[A-Za-z]/g;

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
  const text = `${post.title} ${post.content}`;

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
