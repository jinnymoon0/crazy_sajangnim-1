/*
 * Shown while a post is fetched, so opening one from the feed — or from
 * a shared link — reacts at once instead of sitting on the old page.
 */
export default function BlogPostLoading() {
  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />

        <article className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          <div className="aspect-[16/9] animate-pulse bg-neutral-200" />

          <div className="p-6 sm:p-8">
            <div className="h-3 w-32 animate-pulse rounded bg-neutral-200" />

            <div className="mt-5 h-8 w-3/4 animate-pulse rounded bg-neutral-200" />

            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3].map((line) => (
                <div
                  key={line}
                  className="h-4 animate-pulse rounded bg-neutral-200"
                  style={{ width: `${100 - line * 8}%` }}
                />
              ))}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
