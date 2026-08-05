/*
 * Shown the instant someone heads for the blog, while the posts are
 * fetched. Without it the tap looked like it had failed and people
 * pressed again.
 */
export default function BlogLoading() {
  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="h-4 w-28 animate-pulse rounded bg-neutral-200" />

        <div className="mt-6 h-10 w-64 animate-pulse rounded bg-neutral-200" />

        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-neutral-200" />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((card) => (
            <div
              key={card}
              className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm"
            >
              <div className="aspect-[4/3] animate-pulse bg-neutral-200" />

              <div className="p-5">
                <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />

                <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-neutral-200" />

                <div className="mt-3 h-3 w-full animate-pulse rounded bg-neutral-200" />

                <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-neutral-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
