import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-black/10 bg-[#f5f2ea] px-4 py-8 text-sm text-black/55 md:px-10">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p>Crazy Sajangnim keeps shopping open and account data limited.</p>

        <nav aria-label="Site policies" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terms
          </Link>
          <Link href="/account" className="underline-offset-4 hover:underline">
            Account
          </Link>
        </nav>
      </div>
    </footer>
  );
}
