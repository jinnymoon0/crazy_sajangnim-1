import type { BlogPost } from "@/types/blog";

export type PostLanguage = "en" | "ko" | "ja" | "zh" | "es";
export type LanguageFilter = "all" | PostLanguage;

/* An address is not prose in any language. */
const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/gi;

const HANGUL = /[가-힣ㄱ-ㆎ]/g;
/* Hiragana and katakana. Only Japanese uses them. */
const KANA = /[ぁ-ゖァ-ヺー]/g;
/* Han characters, shared between Japanese and Chinese. */
const HAN = /[一-鿿㐀-䶿]/g;
const LATIN = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g;

/*
 * Spanish, told apart from English, which is the only pair here sharing
 * an alphabet. Two signals: letters English does not have, and the
 * small words that carry a Spanish sentence. One stopword is a
 * coincidence — "no" and "me" are English too — so two are required.
 */
const SPANISH_LETTERS = /[áéíóúüñ¿¡]/i;
const SPANISH_WORDS =
  /\b(?:el|la|los|las|un|una|unos|unas|de|del|que|qué|y|o|en|con|por|para|es|son|está|están|muy|más|pero|como|esto|esta|este|estos|estas|me|te|se|lo|mi|tu|su|gusta|quiero|tengo|hay|bien|también|cuando|donde|dónde|porque|todo|todos|nada|algo|ser|estar|hacer|puede|sí)\b/gi;

/*
 * Which language a post is written in, judged on the description alone.
 *
 * Not the title: a post's title is usually the product's name, written
 * by the shop that sells it. "Human Made Dog Overalls Work Shirt" is
 * English no matter who is talking about it, and reading the language
 * off it filed Korean posts as English.
 *
 * Not the link either. A post carries the item's address in its body,
 * and a hostname is fifty Latin letters that nobody reads as prose.
 *
 * Null when the description has no letters at all — a post that is a
 * photograph and a link belongs to no language, and claiming one for it
 * would put it in front of a reader who cannot use it.
 */
export function postLanguage(post: { content: string }): PostLanguage | null {
  const text = post.content.replace(URL_IN_TEXT, " ");

  const hangul = text.match(HANGUL)?.length ?? 0;
  const kana = text.match(KANA)?.length ?? 0;
  const han = text.match(HAN)?.length ?? 0;
  const latin = text.match(LATIN)?.length ?? 0;

  if (hangul + kana + han + latin === 0) {
    return null;
  }

  /*
   * A character block is denser than a letter — a syllable or an
   * ideograph is a whole word where English spends five letters — so an
   * even count is already a mostly-CJK post. Below a quarter, a stray
   * brand name in the original script does not move an English post.
   */
  const dominates = (count: number) => count > 0 && count * 4 >= latin;

  /* Kana appear only in Japanese, so they settle it against Han. */
  if (dominates(kana + han) && kana > 0) {
    return "ja";
  }

  if (dominates(hangul)) {
    return "ko";
  }

  /* Han with no kana and no Hangul is Chinese. */
  if (dominates(han)) {
    return "zh";
  }

  if (latin === 0) {
    return null;
  }

  const spanishWords = text.match(SPANISH_WORDS)?.length ?? 0;

  if (SPANISH_LETTERS.test(text) || spanishWords >= 2) {
    return "es";
  }

  return "en";
}

export function countByLanguage(
  posts: BlogPost[],
): Record<PostLanguage, number> {
  const counts: Record<PostLanguage, number> = {
    en: 0,
    ko: 0,
    ja: 0,
    zh: 0,
    es: 0,
  };

  for (const post of posts) {
    const language = postLanguage(post);

    if (language) {
      counts[language] += 1;
    }
  }

  return counts;
}

/* Each named in its own language, which is how a reader finds theirs. */
export const LANGUAGE_LABELS: Record<LanguageFilter, string> = {
  all: "All languages",
  en: "English",
  ko: "한국어",
  ja: "日本語",
  zh: "中文",
  es: "Español",
};

export const LANGUAGE_ORDER: PostLanguage[] = ["en", "ko", "ja", "zh", "es"];
