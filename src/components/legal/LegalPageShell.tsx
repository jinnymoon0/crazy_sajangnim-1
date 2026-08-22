import Link from "next/link";
import type { ReactNode } from "react";

interface LegalSection {
  title: string;
  body: ReactNode;
}

interface LegalPageShellProps {
  title: string;
  intro: string;
  updatedAt: string;
  sections: LegalSection[];
}

export default function LegalPageShell({
  title,
  intro,
  updatedAt,
  sections,
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-[#f5f2ea] px-4 py-8 text-[#111111] md:px-10 md:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-semibold text-black/55 underline-offset-4 hover:text-black hover:underline"
        >
          Back to shop
        </Link>

        <header className="mt-10 border-b border-black/10 pb-8">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-black/45 uppercase">
            Updated {updatedAt}
          </p>
          <h1 className="text-4xl font-medium tracking-normal md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-base leading-7 text-black/65">{intro}</p>
        </header>

        <div className="divide-y divide-black/10">
          {sections.map((section) => (
            <section key={section.title} className="py-8">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-black/70">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
