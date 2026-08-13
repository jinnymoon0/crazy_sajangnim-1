import type { BlogPost, PostProduct } from "@/types/blog";
import type { Currency, Market } from "@/types/product";

/*
 * One list of columns and one way of shaping a row into a post, used by
 * the blog page and by the API that serves the same posts to the
 * browser. They were separate copies of the same select, and a column
 * added to one was simply missing from the other.
 */
export const BLOG_POST_COLUMNS =
  "id, title, content, author_name, user_id, image_url, image_path, " +
  "image_urls, image_paths, created_at, product_id, product_url, " +
  "product_brand, product_name, product_image_url, product_market, " +
  "product_currency, product_sale_price, product_original_price";

/*
 * The same select without the item, for a database that has not had
 * blog-product-context.sql run against it yet.
 *
 * The code and the migration land at different moments however careful
 * the order, and in between, a select naming a column that does not
 * exist fails the whole query — the blog would go blank and posting
 * would break, over a card. Asking for less and losing the card is the
 * survivable half of that.
 */
export const BLOG_POST_COLUMNS_WITHOUT_PRODUCT =
  "id, title, content, author_name, user_id, image_url, image_path, " +
  "image_urls, image_paths, created_at";

/* Postgres says 42703 for a column that is not there. */
export function isMissingProductColumn(error: {
  code?: string;
  message?: string;
} | null): boolean {
  return (
    error?.code === "42703" && /product_/i.test(error.message ?? "")
  );
}

export type BlogPostRow = {
  id: string;
  title: string;
  content: string;
  author_name: string;
  user_id?: string | null;
  image_url: string | null;
  image_path: string | null;
  image_urls: string[] | null;
  image_paths: string[] | null;
  created_at: string;
  product_id?: string | null;
  product_url?: string | null;
  product_brand?: string | null;
  product_name?: string | null;
  product_image_url?: string | null;
  product_market?: string | null;
  product_currency?: string | null;
  product_sale_price?: number | string | null;
  product_original_price?: number | string | null;
};

/* Postgres numerics arrive as strings once they are wide enough. */
function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

/*
 * A post is only treated as being about an item when it has the two
 * fields a card cannot be drawn without. Everything else can be missing
 * — an item whose picture has gone still deserves its conversation.
 */
function toProduct(row: BlogPostRow): PostProduct | null {
  if (!row.product_id || !row.product_name) {
    return null;
  }

  return {
    id: row.product_id,
    url: row.product_url ?? "",
    brand: row.product_brand ?? "",
    name: row.product_name,
    imageUrl: row.product_image_url ?? "",
    market: (row.product_market as Market) ?? "US",
    currency: (row.product_currency as Currency) ?? "USD",
    salePrice: toNumber(row.product_sale_price),
    originalPrice: toNumber(row.product_original_price),
  };
}

export function toBlogPost(row: BlogPostRow): BlogPost {
  return {
    ...row,
    user_id: row.user_id ?? null,
    image_url: row.image_url ?? "",
    image_path: row.image_path ?? "",
    /* Older posts predate the multi-image columns and carry a single url. */
    image_urls:
      row.image_urls && row.image_urls.length > 0
        ? row.image_urls
        : row.image_url
          ? [row.image_url]
          : [],
    image_paths:
      row.image_paths && row.image_paths.length > 0
        ? row.image_paths
        : row.image_path
          ? [row.image_path]
          : [],
    product: toProduct(row),
  };
}

/*
 * The columns to write for a post about an item, keyed the way the table
 * is. Null throughout when a post is about nothing in particular.
 */
export function productColumns(product: PostProduct | null) {
  return {
    product_id: product?.id ?? null,
    product_url: product?.url ?? null,
    product_brand: product?.brand ?? null,
    product_name: product?.name ?? null,
    product_image_url: product?.imageUrl || null,
    product_market: product?.market ?? null,
    product_currency: product?.currency ?? null,
    product_sale_price: product?.salePrice ?? null,
    product_original_price: product?.originalPrice ?? null,
  };
}
