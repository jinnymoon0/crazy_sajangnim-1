import type { BrandSlug } from "@/constants/brands";

interface SupportedBrand {
  slug: BrandSlug;
  name: string;
  aliases: string[];
}

const SUPPORTED_BRANDS: SupportedBrand[] = [
  {
    slug: "auralee",
    name: "AURALEE",
    aliases: ["auralee", "오라리"],
  },
  {
    slug: "beams-plus",
    name: "BEAMS PLUS",
    aliases: ["beams plus", "빔즈 플러스", "빔즈플러스"],
  },
  {
    slug: "comoli",
    name: "COMOLI",
    aliases: ["comoli", "코모리"],
  },
  {
    slug: "danton",
    name: "DANTON",
    aliases: ["danton", "단톤"],
  },
  {
    slug: "kamiya",
    name: "KAMIYA",
    aliases: ["kamiya", "카미야"],
  },
  {
    slug: "kapital",
    name: "KAPITAL",
    aliases: ["kapital", "캐피탈"],
  },
  {
    slug: "lemaire",
    name: "LEMAIRE",
    aliases: ["lemaire", "르메르"],
  },
  {
    slug: "needles",
    name: "NEEDLES",
    aliases: ["needles", "니들스"],
  },
];

export function inferBrand(
  productName: string,
): SupportedBrand | null {
  const normalized = productName.toLowerCase();

  return (
    SUPPORTED_BRANDS.find((brand) =>
      brand.aliases.some((alias) =>
        normalized.includes(alias.toLowerCase()),
      ),
    ) ?? null
  );
}
