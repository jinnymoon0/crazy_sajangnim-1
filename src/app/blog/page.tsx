import Link from "next/link";

import AccountMenu from "@/components/auth/AccountMenu";
import BlogFeed from "@/components/blog/BlogFeed";
import BlogPostForm from "@/components/blog/BlogPostForm";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BlogPost } from "@/types/blog";

export const dynamic = "force-dynamic";

async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, title, content, author_name, image_url, image_path, image_urls, image_paths, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to load blog posts:", error);
      return [];
    }

    return (data ?? []) as BlogPost[];
  } catch (error) {
    console.error("Blog configuration error:", error);
    return [];
  }
}

export default async function BlogPage() {
  const user = await requireOnboardedUser();

  const posts = await getBlogPosts();

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-neutral-500">
                Crazy Sajangnim
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-neutral-950 sm:text-5xl">
                Clothing Blog
              </h1>

              <p className="mt-4 text-base leading-7 text-neutral-600">
                Share clothing finds, styling ideas, reviews, and sale
                discoveries with the community.
              </p>
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

        <div className="grid items-start gap-10 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-6">
            <BlogPostForm username={user.username} />
          </div>

          <BlogFeed posts={posts} />
        </div>
      </div>
    </main>
  );
}
