import Link from "next/link";

export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="var(--color-clay)" />
      <path d="M8 14h16l-2 9a2 2 0 0 1-2 1.6h-8A2 2 0 0 1 10 23z" fill="var(--color-cream)" />
      <path d="M12 14l3-6M20 14l-3-6" stroke="var(--color-cream)" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18.5h8M12.5 21.5h7" stroke="var(--color-clay)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Nav() {
  return (
    <header className="mb-8">
      <div className="bogolan-band -mx-4 mb-5" />
      <nav className="flex items-center justify-between gap-3 text-sm">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Logo />
          Panier Famille
        </Link>
        <div className="flex gap-4 text-muted">
          {/* Plain link on purpose: a full reload starts a fresh conversation, even from the home page. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="hover:text-clay">
            New basket
          </a>
          <Link href="/partner" className="hover:text-clay">
            Partner
          </Link>
        </div>
      </nav>
    </header>
  );
}
