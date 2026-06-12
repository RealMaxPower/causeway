import Link from "next/link";
import { Topbar, Crumb } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";

export const metadata = {
  title: "About · Causeway",
  description:
    "What Causeway is, why it exists, the three-layer pedagogy, the live data sources, and the license.",
};

export default function AboutPage() {
  return (
    <>
      <Topbar
        crumb={
          <Crumb
            segments={[
              <Link key="map" href="/" className="hover:text-ink-2 no-underline">
                Track map
              </Link>,
              <span key="now" className="text-ink-2">About</span>,
            ]}
          />
        }
      />

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 mx-auto max-w-3xl w-full px-4 sm:px-6 lg:px-9 py-12"
        style={{ fontFamily: "var(--cw-serif)" }}
      >
        <header className="space-y-4 pb-10 mb-10 border-b border-rule">
          <div
            className="text-[11px] uppercase text-ink-3"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.18em" }}
          >
            Colophon · what this is
          </div>
          <h1 className="text-4xl lg:text-5xl leading-[1.05] tracking-tight">
            Understand the{" "}
            <em className="text-gold-deep" style={{ fontStyle: "italic" }}>
              economy
            </em>{" "}
            as a machine you can drive.
          </h1>
          <p className="text-lg text-ink-2 leading-relaxed">
            Causeway is an interactive learning environment for global
            economics. Most explainer sites give you a fixed depth — a 600-word
            blog post or a 4-hour video. Causeway gives every concept{" "}
            <strong>three depths</strong>, and lets you pick.
          </p>
        </header>

        <section className="space-y-4 mb-12">
          <h2 className="text-2xl">The three-layer scaffold</h2>
          <ul className="space-y-3 text-base text-ink-2 leading-relaxed">
            <li>
              <strong className="text-ink">Layer 1 · Pocket (~30 s)</strong> —
              one sentence on what it is, one on why care, one animated visual
              of the core mechanic.
            </li>
            <li>
              <strong className="text-ink">Layer 2 · Working model (~5 min)</strong>{" "}
              — an interactive widget the user manipulates, interleaved with
              short prose and an &quot;in your life&quot; callout that links
              the abstract to a real decision.
            </li>
            <li>
              <strong className="text-ink">Layer 3 · Full picture (~25 min)</strong>{" "}
              — historical context, debates, primary sources, edge cases. The
              kind of treatment that respects the reader.
            </li>
          </ul>
          <p className="text-sm text-ink-3 leading-relaxed pt-2">
            Each layer is complete on its own. A reader can stop at any of the
            three without feeling pushed.
          </p>
        </section>

        <section className="space-y-4 mb-12">
          <h2 className="text-2xl">The eight tracks</h2>
          <p className="text-base text-ink-2 leading-relaxed">
            Forty-four concept nodes organised into eight tracks: Money,
            Markets, Macro, Trade, Institutions, Crises, Frontier, and Leverage.
            The first seven build vocabulary and intuition; the eighth — Track
            H — applies all of it to actual decisions (saving, housing, career,
            big-ticket purchases, currency, debt, portfolio).
          </p>
          <p className="text-base text-ink-2 leading-relaxed">
            <strong className="text-ink">Track H is the differentiator.</strong>{" "}
            Most econ content explains. Causeway explains and then asks{" "}
            <em>so what does this change about a decision you actually make?</em>
          </p>
        </section>

        <section className="space-y-4 mb-12">
          <h2 className="text-2xl">Tools you can drive</h2>
          <p className="text-base text-ink-2 leading-relaxed">
            Concepts are taught through manipulable models, not static diagrams.
            Eleven interactive widgets ship today:
          </p>
          <ul className="text-sm text-ink-2 leading-relaxed space-y-1 pl-5 list-disc">
            <li><Link href="/nodes/A3?l=2" className="text-gold-deep">Bank balance sheet sandbox</Link> (A3)</li>
            <li><Link href="/nodes/A4?l=2" className="text-gold-deep">Two-issuer CB ledger</Link> (A4)</li>
            <li><Link href="/nodes/A6?l=2" className="text-gold-deep">Dollar-smile classifier</Link> (A6)</li>
            <li><Link href="/nodes/C2?l=2" className="text-gold-deep">Business-cycle phase clock</Link> (C2)</li>
            <li><Link href="/nodes/C4?l=2" className="text-gold-deep">Inflation-regime quadrant</Link> (C4)</li>
            <li><Link href="/nodes/C5?l=2" className="text-gold-deep">Rate-transmission simulator</Link> (C5)</li>
            <li><Link href="/nodes/D4?l=2" className="text-gold-deep">Sudden-stop crisis playback</Link> (D4)</li>
            <li><Link href="/nodes/F2?l=2" className="text-gold-deep">2008 / 1997 / 1929 crisis scrubber</Link> (F2)</li>
            <li><Link href="/nodes/G1?l=2" className="text-gold-deep">Lorenz curve / Gini</Link> (G1)</li>
            <li><Link href="/nodes/H3?l=2" className="text-gold-deep">Rent vs own calculator</Link> (H3)</li>
            <li><Link href="/regime" className="text-gold-deep">Live regime dashboard</Link> (FRED-backed)</li>
          </ul>
        </section>

        <section className="space-y-4 mb-12">
          <h2 className="text-2xl">Data sources</h2>
          <p className="text-base text-ink-2 leading-relaxed">
            The regime dashboard pulls live data from the{" "}
            <a
              href="https://fred.stlouisfed.org"
              className="text-gold-deep"
              target="_blank"
              rel="noopener noreferrer"
            >
              St. Louis Fed&apos;s FRED API
            </a>
            : CPIAUCSL for inflation, DFF for monetary stance, UNRATE for
            labor. Fourth axis (credit cycle, SLOOS) is acknowledged as
            pending. Widgets that don&apos;t need live data use illustrative
            historical snapshots and label them as such.
          </p>
        </section>

        <section className="space-y-4 mb-12">
          <h2 className="text-2xl">Tutor mode</h2>
          <p className="text-base text-ink-2 leading-relaxed">
            Every node has an &quot;Ask the tutor&quot; floating button.
            Questions are answered by Anthropic Haiku scoped to the current
            node, with a daily cost-budget kill switch so the bill stays
            bounded. The system prompt is{" "}
            <a href="/docs/brief" className="text-gold-deep">
              intellectually honest by design
            </a>
            : short answers, named source organisations, &quot;this is
            contested&quot; when it is.
          </p>
        </section>

        <section className="space-y-4 mb-12">
          <h2 className="text-2xl">License &amp; lineage</h2>
          <p className="text-base text-ink-2 leading-relaxed">
            Causeway is{" "}
            <Link href="/license" className="text-gold-deep">
              MIT-licensed
            </Link>{" "}
            and built by Marshall Cahill in 2026.
            It started as a Babel-in-browser prototype seeded by the{" "}
            <Link href="/docs/brief" className="text-gold-deep">
              product brief
            </Link>
            , then was rebuilt as the Next.js production version you&apos;re using now.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl">Status</h2>
          <p className="text-base text-ink-2 leading-relaxed">
            44 of 44 nodes shipped. 31 interactive widgets, including three
            personal-calculator widgets that ship inline (inflation impact at
            A5, career resilience at H4, currency planner at H6). The Personal
            Macro Playbook generator ships at <Link href="/playbook" className="text-gold-deep">/playbook</Link> with
            shareable-URL state. The regime dashboard at <Link href="/regime" className="text-gold-deep">/regime</Link> wires
            four live FRED axes — inflation, money, labor, and credit (SLOOS
            net-tightening) — refreshed every 6 hours. Every node ends with a
            comprehension check at L3. A full evaluation harness (A/B test
            framework, per-track outcomes) is the remaining Phase-4 work.
          </p>
          <p className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-rule-strong rounded text-sm hover:bg-paper-2 no-underline"
              style={{ fontFamily: "var(--cw-mono)" }}
            >
              ← Back to the track map
            </Link>
          </p>
        </section>
      </main>

      <Footer />
    </>
  );
}
