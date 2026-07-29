import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

import type { BrandSlug } from "@/constants/brands";
import { inferBrand } from "@/lib/products/infer-brand";
import { inferCategory } from "@/lib/products/infer-category";
import { parseRetailerProducts } from "@/lib/products/retailers";
import { calculateDiscountPercentage } from "@/lib/utils";
import type { Gender, Market, Product } from "@/types/product";

interface ExtractOptions {
  pageUrl: string;
  market: Market;
  requestedGender: Exclude<Gender, "UNISEX">;
  brandSlug: BrandSlug;
  brandName: string;
  maxProducts?: number;
}

interface JsonLdImage {
  url?: string;
  contentUrl?: string;
}

interface JsonLdPriceSpecification {
  price?: string | number;
  priceType?: string;
}

interface JsonLdOffer {
  price?: string | number;
  lowPrice?: string | number;
  highPrice?: string | number;
  url?: string;
  availability?: string;
  priceCurrency?: string;
  priceSpecification?: JsonLdPriceSpecification | JsonLdPriceSpecification[];
}

interface JsonLdProduct {
  "@type"?: string | string[];
  name?: string;
  description?: string;

  brand?:
    | string
    | {
        name?: string;
      };

  image?: string | JsonLdImage | Array<string | JsonLdImage>;

  sku?: string;
  productID?: string;
  url?: string;

  offers?: JsonLdOffer | JsonLdOffer[];

  priceSpecification?: JsonLdPriceSpecification | JsonLdPriceSpecification[];
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/,/g, "").replace(/[^\d.]/g, "");

  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function flattenJsonLd(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLd);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const object = value as Record<string, unknown>;

  if (Array.isArray(object["@graph"])) {
    return object["@graph"].flatMap(flattenJsonLd);
  }

  if (Array.isArray(object.itemListElement)) {
    return [value, ...object.itemListElement.flatMap(flattenJsonLd)];
  }

  if (object.item && typeof object.item === "object") {
    return [value, ...flattenJsonLd(object.item)];
  }

  return [value];
}

function isProductType(value: JsonLdProduct["@type"]): boolean {
  const types = Array.isArray(value) ? value : [value];

  return types.some(
    (type) => typeof type === "string" && type.toLowerCase() === "product",
  );
}

function collectProducts($: cheerio.CheerioAPI): JsonLdProduct[] {
  const products: JsonLdProduct[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const text = $(element).text().trim();

    if (!text) {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(text);

      for (const item of flattenJsonLd(parsed)) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const product = item as JsonLdProduct;

        if (isProductType(product["@type"])) {
          products.push(product);
        }
      }
    } catch {
      // Ignore malformed JSON-LD.
    }
  });

  return products;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function resolvePrices(product: JsonLdProduct): {
  salePrice: number;
  originalPrice: number;
} | null {
  const activePrices: number[] = [];
  const regularPrices: number[] = [];

  const productSpecifications = asArray(product.priceSpecification);

  for (const offer of asArray(product.offers)) {
    for (const value of [offer.price, offer.lowPrice, offer.highPrice]) {
      const price = parseNumber(value);

      if (price) {
        activePrices.push(price);
      }
    }

    const specifications = [
      ...productSpecifications,
      ...asArray(offer.priceSpecification),
    ];

    for (const specification of specifications) {
      const price = parseNumber(specification.price);

      if (!price) {
        continue;
      }

      const type = specification.priceType?.toLowerCase() ?? "";

      if (
        type.includes("regular") ||
        type.includes("list") ||
        type.includes("original") ||
        type.includes("strikethrough")
      ) {
        regularPrices.push(price);
      } else {
        activePrices.push(price);
      }
    }
  }

  const uniquePrices = Array.from(new Set(activePrices)).sort((a, b) => a - b);

  const salePrice = uniquePrices[0];

  if (!salePrice) {
    return null;
  }

  const possibleOriginalPrices = [
    ...regularPrices,
    ...uniquePrices.filter((price) => price > salePrice),
  ].filter((price) => price > salePrice);

  const originalPrice = Math.max(...possibleOriginalPrices, 0);

  if (!originalPrice || originalPrice <= salePrice) {
    return null;
  }

  return {
    salePrice,
    originalPrice,
  };
}

function collectHtmlPrices($: cheerio.CheerioAPI, html: string): number[] {
  const values: number[] = [];

  const selectors = [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    'meta[name="twitter:data1"]',
    'meta[itemprop="price"]',
    '[itemprop="price"]',
    "[data-price]",
    "[data-sale-price]",
    "[data-current-price]",
    "[data-original-price]",
    "[data-regular-price]",
    "[data-was-price]",
  ];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const node = $(element);

      const candidates = [
        node.attr("content"),
        node.attr("value"),
        node.attr("data-price"),
        node.attr("data-sale-price"),
        node.attr("data-current-price"),
        node.attr("data-original-price"),
        node.attr("data-regular-price"),
        node.attr("data-was-price"),
        node.text(),
      ];

      for (const candidate of candidates) {
        const value = parseNumber(candidate);

        if (value) {
          values.push(value);
        }
      }
    });
  }

  const patterns = [
    /"(?:salePrice|sale_price|currentPrice|current_price|finalPrice|final_price)"\s*:\s*"?([\d,.]+)"?/gi,
    /"(?:regularPrice|regular_price|originalPrice|original_price|listPrice|list_price|wasPrice|was_price)"\s*:\s*"?([\d,.]+)"?/gi,
    /"(?:price|lowPrice|highPrice)"\s*:\s*"?([\d,.]+)"?/gi,
    /(?:US\$|\$)\s*([\d,]+(?:\.\d{1,2})?)/g,
    /(?:₩|KRW)\s*([\d,]+)/gi,
    /([\d,]{4,})\s*원/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = parseNumber(match[1]);

      if (value) {
        values.push(value);
      }
    }
  }

  return Array.from(
    new Set(
      values
        .filter(
          (value) =>
            Number.isFinite(value) && value > 0 && value < 1_000_000_000,
        )
        .map((value) => Math.round(value * 100) / 100),
    ),
  ).sort((first, second) => first - second);
}

function resolveHtmlPrices(
  $: cheerio.CheerioAPI,
  html: string,
): {
  salePrice: number;
  originalPrice: number;
} | null {
  const prices = collectHtmlPrices($, html);

  if (prices.length < 2) {
    return null;
  }

  const salePrice = prices[0];
  const originalPrice = prices[prices.length - 1];

  if (!salePrice || !originalPrice || originalPrice <= salePrice) {
    return null;
  }

  return {
    salePrice,
    originalPrice,
  };
}

function absoluteUrl(
  value: string | undefined,
  baseUrl: string,
): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function getImageValue(
  image: string | JsonLdImage | undefined,
): string | undefined {
  if (typeof image === "string") {
    return image;
  }

  return image?.contentUrl ?? image?.url;
}

function getProductImage(
  product: JsonLdProduct,
  pageUrl: string,
): string | null {
  const firstImage = Array.isArray(product.image)
    ? product.image[0]
    : product.image;

  const imageUrl = absoluteUrl(getImageValue(firstImage), pageUrl);

  if (!imageUrl) {
    return null;
  }

  const normalized = imageUrl.toLowerCase();

  const rejectedTerms = [
    "logo",
    "favicon",
    "wordmark",
    "brandmark",
    "sprite",
    "avatar",
    "banner",
    "header",
    "placeholder",
    "default-image",
    "no-image",
  ];

  if (rejectedTerms.some((term) => normalized.includes(term))) {
    return null;
  }

  return imageUrl;
}

function getProductUrl(product: JsonLdProduct, pageUrl: string): string {
  const offerUrl = asArray(product.offers).find((offer) => offer.url)?.url;

  return (
    absoluteUrl(product.url, pageUrl) ??
    absoluteUrl(offerUrl, pageUrl) ??
    pageUrl
  );
}

function getSourceName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Online retailer";
  }
}

export async function extractProductsFromPage({
  pageUrl,
  market,
  requestedGender,
  brandSlug,
  brandName,
  maxProducts = 12,
}: ExtractOptions): Promise<Product[]> {
  const response = await fetch(pageUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language":
        market === "KR" ? "ko-KR,ko;q=0.9,en;q=0.7" : "en-US,en;q=0.9",
      "User-Agent":
        process.env.COLLECTOR_USER_AGENT ?? "Mozilla/5.0 CrazySajangnim/1.0",
    },
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const products: Product[] = [];

  const retailerProducts = parseRetailerProducts({
    $,
    html,
    pageUrl,
    market,
    requestedGender,
    brandSlug,
    brandName,
    maxProducts,
  });

  products.push(...retailerProducts);

  if (products.length >= maxProducts) {
    return products.slice(0, maxProducts);
  }

  for (const jsonProduct of collectProducts($)) {
    const title = jsonProduct.name?.trim();

    if (!title) {
      continue;
    }

    const jsonBrand =
      typeof jsonProduct.brand === "string"
        ? jsonProduct.brand
        : jsonProduct.brand?.name;

    const detectedBrand = inferBrand(
      [jsonBrand, title]
        .filter((value): value is string => Boolean(value))
        .join(" "),
    );

    if (!detectedBrand || detectedBrand.slug !== brandSlug) {
      continue;
    }

    const imageUrl = getProductImage(jsonProduct, pageUrl);

    if (!imageUrl) {
      continue;
    }

    const prices = resolvePrices(jsonProduct) ?? resolveHtmlPrices($, html);

    if (!prices) {
      continue;
    }

    const discountPercentage = calculateDiscountPercentage(
      prices.originalPrice,
      prices.salePrice,
    );

    if (discountPercentage <= 0 || discountPercentage >= 100) {
      continue;
    }

    const sourceUrl = getProductUrl(jsonProduct, pageUrl);

    const id =
      jsonProduct.sku ??
      jsonProduct.productID ??
      createHash("sha256")
        .update([sourceUrl, title, String(prices.salePrice)].join("|"))
        .digest("hex")
        .slice(0, 24);

    products.push({
      id,

      sourceName: getSourceName(sourceUrl),
      sourceUrl,

      market,
      currency: market === "KR" ? "KRW" : "USD",

      gender: requestedGender,

      brandSlug: detectedBrand.slug,
      brandName: detectedBrand.name || brandName,

      productName: title,
      categorySlug: inferCategory(title),

      imageUrl,

      originalPrice: prices.originalPrice,
      salePrice: prices.salePrice,
      discountPercentage,
      saleVerification: "VERIFIED",

      isAvailable: true,
      collectedAt: new Date().toISOString(),
    });

    if (products.length >= maxProducts) {
      break;
    }
  }

  return Array.from(
    new Map(
      products.map((product) => [
        `${product.sourceUrl}|${product.productName}|${product.salePrice}`,
        product,
      ]),
    ).values(),
  );
}
