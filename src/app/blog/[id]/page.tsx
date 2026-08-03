import Link from "next/link";
import { notFound } from "next/navigation";

import AccountMenu from "@/components/auth/AccountMenu";
import BlogComments from "@/components/blog/BlogComments";
import BlogImageGallery from "@/components/blog/BlogImageGallery";
import BlogLikeButton from "@/components/blog/BlogLikeButton";
import BlogPostManagement from "@/components/blog/BlogPostManagement";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getPostEngagement } from "@/lib/blog/engagement";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BlogComment, BlogPost } from "@/types/blog";

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

type CommentsResult = {
  comments: BlogComment[];
  ready: boolean;
};

async function getBlogComments(postId: string): Promise<CommentsResult> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("blog_comments")
    .select("id, post_id, author_name, content, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    // 42P01 / PGRST205: the table has not been created yet — render
    // without comments instead of failing the page.
    if (error.code !== "42P01" && error.code !== "PGRST205") {
      console.error("Failed to load blog comments:", {
        code: error.code,
        message: error.message,
      });
    }

    return { comments: [], ready: false };
  }

  return { comments: (data ?? []) as BlogComment[], ready: true };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const user = await requireOnboardedUser();

  const { id } = await params;
  const post = await getBlogPost(id);

  if (!post) {
    notFound();
  }

  const { comments, ready: commentsReady } = await getBlogComments(post.id);

  const engagement = await getPostEngagement(post.id, user.id);

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <nav
          aria-label="Blog navigation"
          className="flex flex-wrap items-center gap-3"
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition hover:text-neutral-950"
          >
            <span aria-hidden="true">←</span>
            Back to clothing blog
          </Link>

          <span
            aria-hidden="true"
            className="hidden text-neutral-300 sm:inline"
          >
            |
          </span>

          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-neutral-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2"
          >
            Go to shopping
          </Link>

          <div className="ml-auto">
            <AccountMenu />
          </div>
        </nav>

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

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <BlogLikeButton
                  postId={post.id}
                  initialLiked={engagement.likedByViewer}
                  initialCount={engagement.likes}
                />

                <span className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
                  {engagement.comments}{" "}
                  {engagement.comments === 1 ? "comment" : "comments"}
                </span>

                <span className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
                  {post.image_urls.length}{" "}
                  {post.image_urls.length === 1 ? "photo" : "photos"}
                </span>
              </div>

              {/*
                Only the writer sees the edit and delete controls. The
                route checks this too — hiding the button would leave it
                open to anyone calling the API directly.
              */}
              {post.author_name === user.username ? (
                <BlogPostManagement
                  postId={post.id}
                  initialTitle={post.title}
                  initialContent={post.content}
                />
              ) : null}
            </div>
          </div>
        </article>

        <BlogComments
          postId={post.id}
          initialComments={comments}
          commentsReady={commentsReady}
          username={user.username}
        />
      </div>
    </main>
  );
}
