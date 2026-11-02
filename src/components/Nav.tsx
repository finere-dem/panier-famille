import Link from "next/link";

export function Nav() {
  return (
    <nav className="mb-6 flex items-center justify-between text-sm">
      <Link href="/" className="font-semibold text-zinc-900">
        Panier Famille
      </Link>
      <div className="flex gap-4 text-zinc-600">
        {/* Plain link on purpose: a full reload starts a fresh conversation, even from the home page. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="hover:text-zinc-900">
          New basket
        </a>
        <Link href="/partner" className="hover:text-zinc-900">
          Partner dashboard
        </Link>
      </div>
    </nav>
  );
}
