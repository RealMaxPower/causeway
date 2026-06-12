import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { Topbar, Crumb } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";

export const metadata = {
  title: "License · Causeway",
  description: "Causeway is MIT-licensed. Full licence text.",
};

// Read the LICENSE file at build time. Single source of truth lives at
// repo-root /LICENSE; this page renders it verbatim so /license stays in
// sync without manual copy-paste.
const LICENSE_TEXT = readFileSync(
  join(process.cwd(), "LICENSE"),
  "utf8",
).trim();

export default function LicensePage() {
  return (
    <>
      <Topbar
        crumb={
          <Crumb
            segments={[
              <Link key="home" href="/" className="hover:text-ink-2 no-underline">
                Track map
              </Link>,
              <span key="now" className="text-ink-2">
                License
              </span>,
            ]}
          />
        }
        right={
          <Link
            href="https://opensource.org/licenses/MIT"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-ink-2 hover:text-ink no-underline"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
          >
            About the MIT licence →
          </Link>
        }
      />

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 mx-auto max-w-3xl w-full px-4 sm:px-6 lg:px-9 py-12"
      >
        <header className="mb-8">
          <div
            className="text-[11px] uppercase text-ink-3 mb-3"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
          >
            Causeway · License
          </div>
          <h1
            className="text-4xl leading-tight tracking-tight"
            style={{ fontFamily: "var(--cw-serif)" }}
          >
            MIT License
          </h1>
        </header>

        <pre
          className="text-sm text-ink leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "var(--cw-mono)" }}
        >
          {LICENSE_TEXT}
        </pre>

        <p
          className="text-sm text-ink-3 leading-relaxed mt-10 pt-6 border-t border-rule"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          The licence above is rendered verbatim from the{" "}
          <code style={{ fontFamily: "var(--cw-mono)" }}>LICENSE</code> file at
          the repository root.
        </p>
      </main>

      <Footer />
    </>
  );
}
