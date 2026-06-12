import Link from "next/link";

export function Footer() {
  return (
    <footer
      id="page-footer"
      className="mt-20 pt-6 pb-12 border-t border-rule mx-auto max-w-[1320px] w-full min-w-0 px-4 sm:px-6 lg:px-9 flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-ink-3"
      style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.06em" }}
    >
      <span>Causeway · explorable economics · v0.7</span>
      <span className="flex items-center gap-3">
        <Link href="/about" className="hover:text-ink no-underline">
          About
        </Link>
        <span aria-hidden>·</span>
        <Link href="/license" className="hover:text-ink no-underline">
          MIT
        </Link>
      </span>
    </footer>
  );
}
