import type { BlogPost } from "@/types/blog";

type BlogFeedProps = {
  posts: BlogPost[];
};

function formatPostDate(dateValue: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

export default function BlogFeed({ posts }: BlogFeedProps) {
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
        {posts.map((post) => (
          <article
            key={post.id}
            className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm"
          >
            <div className="aspect-[4/5] overflow-hidden bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image_url}
                alt={post.title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
              />
            </div>

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

              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600">
                {post.content}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
