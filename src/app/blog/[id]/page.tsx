import Link from "next/link";
import { notFound } from "next/navigation";

import BlogImageGallery from "@/components/blog/BlogImageGallery";
import BlogPostManagement from "@/components/blog/BlogPostManagement";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BlogPost } from "@/types/blog";

export const dynamic = "force-dynamic";

type BlogPostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type BlogPostRow = {
  id: string;
  title: string;
  content: string;
  author_name: string;
  image_url: string | null;
  image_path: string | null;
  image_urls: string[] | null;
  image_paths: string[] | null;
  created_at: string;
};


function formatPostDate(dateValue: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

async function getBlogPost(id: string): Promise<BlogPost | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, title, content, author_name, image_url, image_path, image_urls, image_paths, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load blog post:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return null;
  }

  if (!data) {
    return null;
  }

  const row = data as BlogPostRow;

  return {
    ...row,
    image_url: row.image_url ?? "",
    image_path: row.image_path ?? "",
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
  } satisfies BlogPost;
}

export default async function BlogPostPage({
  params,
}: BlogPostPageProps) {
  const { id } = await params;
  const post = await getBlogPost(id);

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition hover:text-neutral-950"
        >
          <span aria-hidden="true">←</span>
          Back to clothing blog
        </Link>

        <article className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          <div className="grid items-start lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <div className="border-b border-neutral-200 p-4 sm:p-6 lg:border-b-0 lg:border-r">
              <BlogImageGallery
                title={post.title}
                imageUrls={post.image_urls}
              />
            </div>

            <div className="p-6 sm:p-8 lg:sticky lg:top-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-neutral-500">
                <span className="font-semibold text-neutral-700">
                  {post.author_name}
                </span>

                <span aria-hidden="true">•</span>

                <time dateTime={post.created_at}>
                  {formatPostDate(post.created_at)}
                </time>
              </div>

              <h1 className="mt-5 break-words text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
                {post.title}
              </h1>

              <div className="mt-6 border-t border-neutral-200 pt-6">
                <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-neutral-500">
                  Description
                </h2>

                <p className="mt-4 whitespace-pre-wrap break-words text-base leading-8 text-neutral-700">
                  {post.content}
                </p>
              </div>

              <div className="mt-8 rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
                {post.image_urls.length}{" "}
                {post.image_urls.length === 1 ? "photo" : "photos"}
              </div>

              <BlogPostManagement
                postId={post.id}
                initialTitle={post.title}
                initialContent={post.content}
              />
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
