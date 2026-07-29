export type BlogPost = {
  id: string;
  title: string;
  content: string;
  author_name: string;
  image_url: string;
  image_path: string;
  image_urls: string[];
  image_paths: string[];
  created_at: string;
};

export type BlogComment = {
  id: string;
  post_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

/*
 * Draft passed from a product card's "Share on blog" button to the blog
 * post form via sessionStorage.
 */
export const BLOG_SHARE_DRAFT_KEY = "blog-share-draft";

export type BlogShareDraft = {
  brandName: string;
  productName: string;
  salePrice: number;
  originalPrice: number | null;
  discountPercentage: number | null;
  currency: "USD" | "KRW";
  sourceName: string;
  sourceUrl: string;
  imageUrl: string;
};
