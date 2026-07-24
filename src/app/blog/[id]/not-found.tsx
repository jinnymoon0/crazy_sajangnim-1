import Link from "next/link";

export default function BlogPostNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-500">
          Post unavailable
        </p>

        <h1 className="mt-3 text-3xl font-black text-neutral-950">
          This clothing post could not be found.
        </h1>

        <p className="mt-4 text-sm leading-6 text-neutral-600">
          The post may have been removed, or the address may be
          incorrect.
        </p>

        <Link
          href="/blog"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-neutral-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-neutral-700"
        >
          Return to clothing blog
        </Link>
      </section>
    </main>
  );
}
