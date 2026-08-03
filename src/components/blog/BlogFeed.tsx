import Link from "next/link";

import type { BlogPost } from "@/types/blog";

type BlogFeedProps = {
  posts: BlogPost[];
  engagement?: Record<string, { likes: number; comments: number }>;
};

function formatPostDate(dateValue: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateValue));
}

function PostImages({
  title,
  imageUrls,
}: {
  title: string;
  imageUrls: string[];
}) {
  if (imageUrls.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-neutral-100 text-sm text-neutral-500">
        Image unavailable
      </div>
    );
  }

  if (imageUrls.length === 1) {
    return (
      <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrls[0]}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  if (imageUrls.length === 2) {
    return (
      <div className="grid aspect-[4/3] grid-cols-2 gap-1 bg-neutral-100">
        {imageUrls.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${title} image ${index + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          </div>
        ))}
      </div>
    );
  }

  const visibleImages = imageUrls.slice(0, 3);

  return (
    <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-1 bg-neutral-100">
      <div className="row-span-2 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={visibleImages[0]}
          alt={`${title} cover image`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>

      {visibleImages.slice(1).map((url, index) => (
        <div
          key={`${url}-${index}`}
          className="relative overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`${title} image ${index + 2}`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />

          {index === 1 && imageUrls.length > 3 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-bold text-white">
              +{imageUrls.length - 3}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function BlogFeed({ posts, engagement }: BlogFeedProps) {
  if (posts.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
        <h2 className="text-xl font-bold text-neutral-950">
          No posts yet
        </h2>

        <p className="mt-2 text-sm text-neutral-600">
          Be the first person to share a clothing item.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Latest posts
          </p>

          <h2 className="mt-2 text-2xl font-bold text-neutral-950">
            Community clothing feed
          </h2>
        </div>

        <p className="text-sm text-neutral-500">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => {
          const imageUrls =
            post.image_urls?.length > 0
              ? post.image_urls
              : post.image_url
                ? [post.image_url]
                : [];

          const counts = engagement?.[post.id] ?? { likes: 0, comments: 0 };

          return (
            <Link
              key={post.id}
              href={`/blog/${post.id}`}
              className="group block overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2"
            >
              <article>
                <PostImages
                  title={post.title}
                  imageUrls={imageUrls}
                />

                <div className="p-5">
                  <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
                    <span className="truncate font-semibold">
                      {post.author_name}
                    </span>

                    <time dateTime={post.created_at}>
                      {formatPostDate(post.created_at)}
                    </time>
                  </div>

                  <h3 className="mt-3 text-lg font-bold leading-6 text-neutral-950">
                    {post.title}
                  </h3>

                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600">
                    {post.content}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-neutral-500">
                    <span className="flex items-center gap-3">
                      <span
                        title={`${counts.likes} ${counts.likes === 1 ? "like" : "likes"}`}
                      >
                        <span aria-hidden="true">♥</span> {counts.likes}
                      </span>

                      <span
                        title={`${counts.comments} ${counts.comments === 1 ? "comment" : "comments"}`}
                      >
                        <span aria-hidden="true">💬</span> {counts.comments}
                      </span>

                      <span className="text-neutral-400">
                        {imageUrls.length}{" "}
                        {imageUrls.length === 1 ? "photo" : "photos"}
                      </span>
                    </span>

                    <span className="shrink-0 text-neutral-950">
                      View post →
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
