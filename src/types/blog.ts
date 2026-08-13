import type { Currency, Market } from "@/types/product";

/*
 * The item a post is about, copied onto the post rather than looked up.
 *
 * A sale listing leaves the catalogue within weeks and the conversation
 * outlives it, so a post that pointed at a row instead of carrying its
 * own copy would turn into a blank card the moment the sale ended.
 */
export type PostProduct = {
  id: string;
  url: string;
  brand: string;
  name: string;
  imageUrl: string;
  market: Market;
  currency: Currency;
  salePrice: number | null;
  originalPrice: number | null;
};

export type BlogPost = {
  id: string;
  title: string;
  content: string;
  author_name: string;
  user_id?: string | null;
  image_url: string;
  image_path: string;
  image_urls: string[];
  image_paths: string[];
  created_at: string;
  /* Null for a post written from the blog rather than from an item. */
  product: PostProduct | null;
};

export type BlogComment = {
  id: string;
  post_id: string;
  author_name: string;
  user_id?: string | null;
  /** The comment this answers. Null for a top-level comment. */
  parent_id?: string | null;
  content: string;
  created_at: string;
};

/*
 * Draft passed from a product card's "Share on blog" button to the blog
 * post form via sessionStorage.
 */
export const BLOG_SHARE_DRAFT_KEY = "blog-share-draft";

export type BlogShareDraft = {
  /*
   * Which item this is, so the post can be filed against it and the
   * next person arriving from the same product finds this one.
   */
  productId: string;
  market: Market;
  brandName: string;
  productName: string;
  salePrice: number;
  originalPrice: number | null;
  discountPercentage: number | null;
  currency: Currency;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string;
};
