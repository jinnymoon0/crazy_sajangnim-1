import type { Metadata } from "next";

import {
  BLOG_POST_COLUMNS,
  type BlogPostRow,
  isMissingProductColumn,
  toBlogPost,
} from "@/lib/blog/posts";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/utils";

/*
 * The card a chat app draws when someone pastes a link to an item.
 *
 * Built from the posts themselves rather than the catalogue. Every post
 * about an item carries a copy of it, so this needs one query and works
 * for an item whose sale has since ended — which is exactly the link
 * still sitting in somebody's chat history.
 */
export async function productLinkMetadata(
  productId: string,
): Promise<Metadata | null> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("blog_posts")
      .select(BLOG_POST_COLUMNS)
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (isMissingProductColumn(error) || error) {
      return null;
    }

    const posts = ((data ?? []) as unknown as BlogPostRow[]).map(toBlogPost);
    const product = posts.find((post) => post.product)?.product;

    if (!product) {
      return null;
    }

    const title = product.brand
      ? `${product.brand} ${product.name}`
      : product.name;

    const price =
      product.salePrice === null
        ? null
        : formatPrice(product.salePrice, product.currency);

    const discount =
      product.originalPrice &&
      product.salePrice &&
      product.originalPrice > product.salePrice
        ? Math.round(
            ((product.originalPrice - product.salePrice) /
              product.originalPrice) *
              100,
          )
        : null;

    /*
     * What the preview says has to be worth opening. The count is the
     * part a shop cannot claim: someone is already talking about this.
     */
    const people =
      posts.length === 1
        ? "1 person is talking about this"
        : `${posts.length} people are talking about this`;

    const description = [
      price && discount ? `${price} — ${discount}% off` : price,
      people,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        siteName: "Crazy Sajangnim",
        /* Retailer photographs are absolute https urls already. */
        images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
      },
      twitter: {
        card: product.imageUrl ? "summary_large_image" : "summary",
        title,
        description,
        images: product.imageUrl ? [product.imageUrl] : undefined,
      },
    };
  } catch {
    /* A preview is never worth failing a page load over. */
    return null;
  }
}

/*
 * The item a login link is standing in front of.
 *
 * An unfurler that does not announce itself follows the redirect and
 * asks the login page for its card, so the login page has to be able to
 * answer with the item rather than with "Sign in". This reads the
 * destination it was already given.
 */
export function productIdFromCallback(
  callbackUrl: string | undefined,
): string | null {
  if (!callbackUrl || !callbackUrl.startsWith("/")) {
    return null;
  }

  try {
    const url = new URL(callbackUrl, "https://placeholder.invalid");

    return url.pathname === "/blog" ? url.searchParams.get("product") : null;
  } catch {
    return null;
  }
}
