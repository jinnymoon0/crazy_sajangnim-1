export const BRANDS = [
  {
    slug: "auralee",
    englishName: "AURALEE",
    koreanName: "오라리",
  },
  {
    slug: "beams-plus",
    englishName: "BEAMS PLUS",
    koreanName: "빔즈 플러스",
  },
  {
    slug: "comoli",
    englishName: "COMOLI",
    koreanName: "코모리",
  },
  {
    slug: "danton",
    englishName: "DANTON",
    koreanName: "단톤",
  },
  {
    slug: "kamiya",
    englishName: "KAMIYA",
    koreanName: "카미야",
  },
  {
    slug: "kapital",
    englishName: "KAPITAL",
    koreanName: "캐피탈",
  },
  {
    slug: "lemaire",
    englishName: "LEMAIRE",
    koreanName: "르메르",
  },
  {
    slug: "needles",
    englishName: "NEEDLES",
    koreanName: "니들스",
  },
] as const;

export type BrandSlug = (typeof BRANDS)[number]["slug"];
