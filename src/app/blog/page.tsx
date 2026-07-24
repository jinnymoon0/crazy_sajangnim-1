import BlogFeed from "@/components/blog/BlogFeed";
import BlogPostForm from "@/components/blog/BlogPostForm";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BlogPost } from "@/types/blog";

export const dynamic = "force-dynamic";

async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, title, content, author_name, image_url, image_path, created_at",
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
  const posts = await getBlogPosts();

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-neutral-500">
            Crazy Sajangnim
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-neutral-950 sm:text-5xl">
            Clothing Blog
          </h1>

          <p className="mt-4 text-base leading-7 text-neutral-600">
            Share clothing finds, styling ideas, reviews, and sale
            discoveries without creating an account.
          </p>
        </header>

        <div className="grid items-start gap-10 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-6">
            <BlogPostForm />
          </div>

          <BlogFeed posts={posts} />
        </div>
      </div>
    </main>
  );
}
