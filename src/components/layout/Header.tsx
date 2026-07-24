import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-black tracking-tight text-neutral-950"
        >
          Crazy Sajangnim
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/blog"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-neutral-950 px-5 py-2 text-sm font-bold text-white transition hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2"
          >
            Clothing Blog
          </Link>
        </nav>
      </div>
    </header>
  );
}
