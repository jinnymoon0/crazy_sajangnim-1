import type { BrandSlug } from "@/constants/brands";

export interface InferredBrand {
  slug: BrandSlug;
  name: string;
}

interface BrandMatcher extends InferredBrand {
  aliases: string[];
}

/*
 * Keep aliases specific. Generic words can create false matches.
 *
 * NEEDLES is especially risky because "needles" is an ordinary English
 * word. We therefore require an explicit brand-like occurrence rather
 * than treating every appearance of the word as sufficient.
 */
const BRAND_MATCHERS: BrandMatcher[] = [
  {
    slug: "auralee",
    name: "AURALEE",
    aliases: ["AURALEE", "오라리"],
  },
  {
    slug: "beams-plus",
    name: "BEAMS PLUS",
    aliases: [
      "BEAMS PLUS",
      "BEAMS+",
      "빔즈 플러스",
      "빔스 플러스",
    ],
  },
  {
    slug: "comoli",
    name: "COMOLI",
    aliases: ["COMOLI", "코모리"],
  },
  {
    slug: "danton",
    name: "DANTON",
    aliases: ["DANTON", "단톤"],
  },
  {
    slug: "kamiya",
    name: "KAMIYA",
    aliases: ["KAMIYA", "카미야"],
  },
  {
    slug: "kapital",
    name: "KAPITAL",
    aliases: ["KAPITAL", "캐피탈"],
  },
  {
    slug: "lemaire",
    name: "LEMAIRE",
    aliases: [
      "LEMAIRE",
      "CHRISTOPHE LEMAIRE",
      "르메르",
    ],
  },
  {
    slug: "needles",
    name: "NEEDLES",
    aliases: [
      "NEEDLES",
      "NEPENTHES NEEDLES",
      "ニードルズ",
      "니들스",
    ],
  },
];

const KNOWN_FOREIGN_BRANDS = [
  "DKNY",
  "DONNA KARAN",
  "NIKE",
  "ADIDAS",
  "NEW BALANCE",
  "POLO RALPH LAUREN",
  "RALPH LAUREN",
  "TOMMY HILFIGER",
  "CALVIN KLEIN",
  "THE NORTH FACE",
  "MONCLER",
  "STONE ISLAND",
  "AMI PARIS",
  "MAISON KITSUNE",
  "MAISON MARGIELA",
  "ACNE STUDIOS",
  "BURBERRY",
  "GUCCI",
  "PRADA",
  "BALENCIAGA",
  "SAINT LAURENT",
  "BOTTEGA VENETA",
];

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/&amp;/gi, "&")
    .replace(/[‐-‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsLatinAlias(
  normalizedText: string,
  normalizedAlias: string,
): boolean {
  /*
   * Avoid substring errors such as matching a brand inside another word.
   * Spaces and punctuation around the brand are accepted.
   */
  const pattern = new RegExp(
    `(^|[^A-Z0-9])${escapeRegExp(normalizedAlias)}([^A-Z0-9]|$)`,
    "i",
  );

  return pattern.test(normalizedText);
}

function containsAlias(
  normalizedText: string,
  alias: string,
): boolean {
  const normalizedAlias = normalizeText(alias);

  if (!normalizedAlias) {
    return false;
  }

  const containsLatinCharacters =
    /[A-Z]/.test(normalizedAlias);

  return containsLatinCharacters
    ? containsLatinAlias(
        normalizedText,
        normalizedAlias,
      )
    : normalizedText.includes(normalizedAlias);
}

export function inferBrand(
  value: string,
): InferredBrand | null {
  const normalizedText = normalizeText(value);

  if (!normalizedText) {
    return null;
  }

  /*
   * When a known unrelated brand is explicitly present, do not allow a
   * generic word elsewhere in the listing to misclassify the product.
   */
  const foreignBrandPresent =
    KNOWN_FOREIGN_BRANDS.some((brand) =>
      containsAlias(normalizedText, brand),
    );

  const matches = BRAND_MATCHERS.filter(
    (brand) =>
      brand.aliases.some((alias) =>
        containsAlias(normalizedText, alias),
      ),
  );

  if (matches.length !== 1) {
    return null;
  }

  const matchedBrand = matches[0];

  /*
   * Example: "DKNY sewing needles" must not become NEEDLES.
   */
  if (
    foreignBrandPresent &&
    matchedBrand.slug === "needles"
  ) {
    return null;
  }

  return {
    slug: matchedBrand.slug,
    name: matchedBrand.name,
  };
}

export function matchesExpectedBrand(
  value: string,
  expectedBrandSlug: BrandSlug,
): boolean {
  return inferBrand(value)?.slug === expectedBrandSlug;
}
