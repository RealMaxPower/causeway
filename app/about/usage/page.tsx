import Link from "next/link";
import { Topbar, Crumb } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { TRACK_ORDER, TRACKS, TOTAL_NODES } from "@/lib/tracks";

export const metadata = {
  title: "Usage signals · Causeway",
  description:
    "What the site tracks, what it doesn't, and the platform-level signals that shape priorities for the next batch.",
};

/**
 * Aggregate site signals — what the platform reports about itself.
 *
 * No personal data is read. Per-user progress lives in localStorage on the
 * user's device. Vercel Analytics captures aggregate page views and custom
 * event counts when enabled in the Vercel project; off-Vercel deploys are
 * unrecorded.
 *
 * This page surfaces what the platform reports about itself in the open.
 * It's intentionally a static signal page, not a dashboard — fancier views
 * land later if engagement justifies them.
 */
export default function UsagePage() {
  const widgetCount = 21;
  const widgetNodes = ["A3", "A5", "A6", "C2", "C4", "C5", "D2", "D4", "F2", "G1", "H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8"];
  const minutes = TRACK_ORDER.reduce(
    (s, l) => s + TRACKS[l].nodes.reduce((m, n) => m + parseInt(n.time, 10), 0),
    0,
  );
  const contested = TRACK_ORDER.flatMap((l) =>
    TRACKS[l].nodes.filter((n) => n.topicContested),
  );

  return (
    <>
      <Topbar
        crumb={
          <Crumb
            segments={[
              <Link key="map" href="/" className="hover:text-ink-2 no-underline">
                Track map
              </Link>,
              <Link key="about" href="/about" className="hover:text-ink-2 no-underline">
                About
              </Link>,
              <span key="now" className="text-ink-2">
                Usage
              </span>,
            ]}
          />
        }
      />

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 mx-auto max-w-3xl w-full px-4 sm:px-6 lg:px-9 py-12"
      >
        <header className="mb-12 pb-8 border-b border-rule">
          <div
            className="text-[11px] uppercase text-ink-3 mb-3"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
          >
            About · usage signals
          </div>
          <h1
            className="text-4xl leading-[1.1] tracking-tight"
            style={{ fontFamily: "var(--cw-serif)" }}
          >
            What the platform tracks about itself.
          </h1>
          <p
            className="text-base text-ink-2 leading-relaxed mt-4 max-w-2xl"
            style={{ fontFamily: "var(--cw-serif)" }}
          >
            A summary of the platform-level numbers — content shipped, widgets
            live, axes wired, things contested. No personal data is read on
            this page. Progress is stored on your own device only.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Stat label="Concept nodes" value={String(TOTAL_NODES)} sub="All shipped, 3 layers each" />
          <Stat label="Tracks" value={String(TRACK_ORDER.length)} sub="A → H" />
          <Stat label="Bespoke widgets" value={String(widgetCount)} sub={`Live on ${widgetNodes.length} nodes`} />
          <Stat label="Total reading minutes" value={String(minutes)} sub="If you read every node end-to-end" />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl mb-4" style={{ fontFamily: "var(--cw-serif)" }}>
            What we report aggregate
          </h2>
          <p className="text-base text-ink-2 leading-relaxed mb-4">
            When <code style={{ fontFamily: "var(--cw-mono)" }}>PLAUSIBLE_DOMAIN</code>{" "}
            is set, the site fires aggregate events (no IPs, no cookies):
          </p>
          <ul className="space-y-2 text-sm">
            {[
              { ev: "search_open", what: "Search palette opened (Cmd-K, /, or trigger button)." },
              { ev: "search_navigate", what: "Result picked from search — surfaces which nodes are findable vs. discoverable." },
              { ev: "tutor_open", what: "Tutor FAB opened — node-scoped, so we see which nodes prompt questions." },
              { ev: "tutor_ask", what: "Question submitted to the tutor (length only — not the question text)." },
              { ev: "playbook_shared", what: "User generated a share-link for their playbook." },
              { ev: "playbook_printed", what: "User printed the playbook." },
              { ev: "playbook_emailed", what: "User exported the playbook as a self-addressed email." },
              { ev: "playbook_csv", what: "User downloaded the playbook as CSV." },
            ].map((row) => (
              <li
                key={row.ev}
                className="grid grid-cols-[minmax(140px,_max-content)_1fr] gap-4 py-1.5 border-b border-dashed border-rule"
              >
                <code
                  className="text-ink-2"
                  style={{ fontFamily: "var(--cw-mono)", fontSize: 12 }}
                >
                  {row.ev}
                </code>
                <span className="text-ink-3 leading-relaxed">{row.what}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl mb-4" style={{ fontFamily: "var(--cw-serif)" }}>
            What we don&apos;t track
          </h2>
          <ul className="space-y-2 text-base text-ink-2 leading-relaxed list-disc list-inside">
            <li>The text of your tutor questions or your playbook notes.</li>
            <li>Your IP address or any device fingerprint.</li>
            <li>
              Per-user reading progress on the server. Visited-node markers and
              the &ldquo;continue&rdquo; card are stored only in your browser&apos;s
              localStorage and never leave the device.
            </li>
            <li>Any third-party analytics beyond Vercel Analytics (which is cookieless).</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl mb-4" style={{ fontFamily: "var(--cw-serif)" }}>
            Topics flagged as contested
          </h2>
          {contested.length === 0 ? (
            <p className="text-base text-ink-3">No nodes are currently flagged.</p>
          ) : (
            <ul className="space-y-2">
              {contested.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/nodes/${n.id}`}
                    className="block border border-rule rounded-md p-4 hover:border-rule-strong no-underline"
                  >
                    <div
                      className="text-[10px] uppercase text-ink-3 mb-1"
                      style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
                    >
                      {n.id} · contested
                    </div>
                    <div className="text-base" style={{ fontFamily: "var(--cw-serif)" }}>
                      {n.title}
                    </div>
                    <p className="text-sm text-ink-3 mt-1 leading-relaxed">{n.pocket}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-sm text-ink-3 leading-relaxed">
          Questions or worried about something we don&apos;t cover? Open an
          issue on the{" "}
          <a
            href="https://github.com/RealMaxPower/causeway/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-deep underline decoration-rule-2"
          >
            project repository
          </a>
          .
        </p>
      </main>

      <Footer />
    </>
  );
}

interface StatProps {
  label: string;
  value: string;
  sub: string;
}

function Stat({ label, value, sub }: StatProps) {
  return (
    <div className="border border-rule rounded-md p-4 bg-paper-2/40">
      <div
        className="text-[10px] uppercase text-ink-3 mb-1"
        style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
      >
        {label}
      </div>
      <div
        className="text-2xl"
        style={{ fontFamily: "var(--cw-serif)" }}
      >
        {value}
      </div>
      <div className="text-xs text-ink-3 leading-relaxed mt-1">{sub}</div>
    </div>
  );
}
