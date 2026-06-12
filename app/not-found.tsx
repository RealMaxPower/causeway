import Link from "next/link";
import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";

export default function NotFound() {
  return (
    <>
      <Topbar />

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 mx-auto max-w-2xl w-full px-4 sm:px-6 lg:px-9 py-24 flex flex-col gap-6"
      >
        <div
          className="text-[11px] uppercase text-ink-3"
          style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.18em" }}
        >
          404 · not found
        </div>

        <h1
          className="text-4xl lg:text-5xl leading-tight tracking-tight"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          That page isn&apos;t on the map.
        </h1>

        <p
          className="text-lg text-ink-2 leading-relaxed"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          You may be looking for a node id that doesn&apos;t exist, a typo of
          one that does, or a page that&apos;s been moved or renamed during
          the migration. Try the track map.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-rule-strong rounded text-sm hover:bg-paper-2 no-underline"
            style={{ fontFamily: "var(--cw-mono)" }}
          >
            ← Track map
          </Link>
          <Link
            href="/nodes/A3"
            className="inline-flex items-center px-4 py-2 border border-rule-strong rounded text-sm hover:bg-paper-2 no-underline"
            style={{ fontFamily: "var(--cw-mono)" }}
          >
            Start here · A3 How banks create money
          </Link>
          <Link
            href="/regime"
            className="inline-flex items-center px-4 py-2 border border-rule-strong rounded text-sm hover:bg-paper-2 no-underline"
            style={{ fontFamily: "var(--cw-mono)" }}
          >
            Read the regime →
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
