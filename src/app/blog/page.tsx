import Link from "next/link";

import AccountMenu from "@/components/auth/AccountMenu";
import BlogFeed from "@/components/blog/BlogFeed";
import { displayName } from "@/lib/blog/authorship";
import { getCurrentUsernames } from "@/lib/blog/current-names";
import { getEngagementByPost } from "@/lib/blog/engagement";
import BlogPostForm from "@/components/blog/BlogPostForm";
import {
  BLOG_POST_COLUMNS,
  BLOG_POST_COLUMNS_WITHOUT_PRODUCT,
  type BlogPostRow,
  isMissingProductColumn,
  toBlogPost,
} from "@/lib/blog/posts";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import ProductConversationHeader from "@/components/blog/ProductConversationHeader";
import type { BlogPost } from "@/types/blog";

export const dynamic = "force-dynamic";

/*
 * `productId` narrows this to the conversation about one item, which is
 * what the page shows when it was opened from a product card.
 */
async function getBlogPosts(productId?: string): Promise<BlogPost[]> {
  try {
    const supabase = getSupabaseAdmin();

    const read = (columns: string) => {
      const query = supabase
        .from("blog_posts")
        .select(columns)
        .order("created_at", { ascending: false })
        .limit(100);

      return productId ? query.eq("product_id", productId) : query;
    };

    let { data, error } = await read(BLOG_POST_COLUMNS);

    /*
     * Before blog-product-context.sql has been run there is no item on
     * any post, so a request for one item's conversation can only be
     * empty — but the blog itself still has to open.
     */
    if (isMissingProductColumn(error)) {
      if (productId) {
        return [];
      }

      ({ data, error } = await read(BLOG_POST_COLUMNS_WITHOUT_PRODUCT));
    }

    if (error) {
      console.error("Failed to load blog posts:", error);
      return [];
    }

    const posts = ((data ?? []) as unknown as BlogPostRow[]).map(toBlogPost);

    /*
     * Show what each writer is called now rather than the name stored
     * when they posted, so a rename carries across their whole history.
     */
    const names = await getCurrentUsernames(posts.map((p) => p.user_id ?? null));

    return posts.map((post) => ({
      ...post,
      author_name: displayName(
        { user_id: post.user_id ?? null, author_name: post.author_name },
        names,
      ),
    }));
  } catch (error) {
    console.error("Blog configuration error:", error);
    return [];
  }
}

interface BlogPageProps {
  searchParams: Promise<{ product?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  /*
   * Readable signed out. Someone following a link here should see what
   * is being written about before being asked for anything; the account
   * is wanted at the point of taking part, not at the door.
   *
   * getSessionUser rather than requireOnboardedUser: it answers null
   * for a visitor and for a half-finished sign-up alike, and neither
   * should be shown a form they cannot post with.
   */
  const [user, params] = await Promise.all([
    getSessionUser(),
    searchParams,
  ]);

  /*
   * Arriving from a product card means arriving with a question about
   * that item, and this page used to answer a different one: it opened
   * on every post ever written, none of which was about the thing just
   * clicked. The item in the address is what the page is about.
   */
  const productId = params.product?.trim() || undefined;

  /*
   * Together, not one after the other. The counts do not depend on the
   * posts, and waiting for each in turn was most of the delay before
   * this page appeared.
   */
  const [posts, engagement] = await Promise.all([
    getBlogPosts(productId),
    getEngagementByPost(),
  ]);

  /*
   * The item as its own posts recorded it. Copied onto every post, so
   * any of them can describe it — the newest is used because it is the
   * most recently observed price.
   */
  const product = posts.find((post) => post.product)?.product ?? null;

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/*
          * Compact when the page is about an item: the item's own card
          * is the heading in that case, and a second full-height masthead
          * above it would push the thing the reader came for below the
          * fold on a phone.
          */}
        <header className={productId ? "mb-6" : "mb-10"}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-neutral-500">
                Crazy Sajangnim
              </p>

              {productId ? (
                <p className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
                  What people are saying
                </p>
              ) : (
                <>
                  <h1 className="mt-3 text-4xl font-black tracking-tight text-neutral-950 sm:text-5xl">
                    Clothing Blog
                  </h1>

                  <p className="mt-4 text-base leading-7 text-neutral-600">
                    Share clothing finds, styling ideas, reviews, and sale
                    discoveries with the community.
                  </p>
                </>
              )}
            </div>

            <div className="flex w-fit shrink-0 flex-col items-start gap-3 sm:items-end">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-bold !text-white transition hover:bg-neutral-700 hover:!text-white focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2"
              >
                <span aria-hidden="true">←</span>
                Back to shopping
              </Link>

              <AccountMenu />
            </div>
          </div>
        </header>

        {productId ? (
          <ProductConversationHeader
            productId={productId}
            product={product}
            postCount={posts.length}
          />
        ) : null}

        {/*
          * Two shapes for two errands.
          *
          * Writing about an item is one thing after another — look at
          * it, say something, read what others said — so in that mode
          * this is a single column and the compose box sits directly
          * under the item, where the person's attention already is. The
          * side-by-side layout is for the blog's own front page, where
          * browsing is the point and a permanent compose box is useful.
          */}
        <div
          className={
            productId
              ? "mx-auto max-w-3xl"
              : "grid items-start gap-10 lg:grid-cols-[380px_minmax(0,1fr)]"
          }
        >
          <div className={productId ? "mb-8" : "lg:sticky lg:top-6"}>
            {user ? (
              <BlogPostForm
                username={user.username}
                productId={productId}
                product={product}
              />
            ) : (
              <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-neutral-500">
                  {productId ? "Say something about this" : "Write a post"}
                </h2>

                <p className="mt-3 text-base leading-7 text-neutral-600">
                  Posts are published under your account name, so writing
                  one, opening a post, or leaving a comment needs an
                  account. Reading along does not.
                </p>

                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(
                    productId ? `/blog?product=${productId}` : "/blog",
                  )}`}
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-bold !text-white transition hover:bg-neutral-700 hover:!text-white"
                >
                  Sign in with Google
                </Link>
              </section>
            )}
          </div>

          <BlogFeed
            posts={posts}
            engagement={Object.fromEntries(engagement)}
            heading={productId ? "About this item" : undefined}
            emptyMessage={
              productId
                ? "No posts about this item yet. Yours would be the first."
                : undefined
            }
          />

          {/*
            * The whole blog, offered rather than imposed. It was the main
            * panel on this page, which meant somebody who arrived to talk
            * about one jacket was given a feed of posts about everything
            * else — more space than the thing they came to do.
            */}
          {productId ? (
            <div className="mt-10 text-center">
              <Link
                href="/blog"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
              >
                Read the rest of the blog
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
