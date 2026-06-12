import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar, Crumb } from "@/components/chrome/Topbar";
import { SideNav } from "@/components/chrome/SideNav";
import { MobileNav } from "@/components/chrome/MobileNav";
import { Footer } from "@/components/chrome/Footer";
import { TRACKS, TRACK_ORDER, type TrackLetter } from "@/lib/tracks";

export function generateStaticParams() {
  return TRACK_ORDER.map((letter) => ({ track: letter }));
}

interface PageProps {
  params: Promise<{ track: string }>;
}

export default async function TrackPage({ params }: PageProps) {
  const { track: rawTrack } = await params;
  const letter = rawTrack.toUpperCase() as TrackLetter;

  if (!TRACK_ORDER.includes(letter)) {
    notFound();
  }

  const t = TRACKS[letter];
  const ready = t.nodes.filter((n) => n.status === "ready").length;
  const total = t.nodes.length;
  const pct = (ready / total) * 100;
  const totalMin = t.nodes.reduce((s, n) => s + parseInt(n.time, 10), 0);

  const idx = TRACK_ORDER.indexOf(letter);
  const prev = idx > 0 ? TRACK_ORDER[idx - 1] : null;
  const next = idx < TRACK_ORDER.length - 1 ? TRACK_ORDER[idx + 1] : null;

  return (
    <>
      <Topbar
        leftAddon={<MobileNav currentTrackLetter={letter} />}
        crumb={
          <Crumb
            segments={[
              <Link
                key="map"
                href="/"
                className="hover:text-ink-2 no-underline"
              >
                Track map
              </Link>,
              <span key="now" className="text-ink-2">
                Track {letter} · {t.name}
              </span>,
            ]}
          />
        }
        right={
          <div className="flex items-center gap-2">
            {prev && (
              <Link
                href={`/tracks/${prev}`}
                className="text-[11px] text-ink-3 hover:text-ink no-underline px-2 py-1 border border-rule rounded"
                style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.06em" }}
              >
                ‹ {prev}
              </Link>
            )}
            {next && (
              <Link
                href={`/tracks/${next}`}
                className="text-[11px] text-ink-3 hover:text-ink no-underline px-2 py-1 border border-rule rounded"
                style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.06em" }}
              >
                {next} ›
              </Link>
            )}
          </div>
        }
      />

      <div className="flex-1 flex">
        <SideNav currentTrackLetter={letter} />

        <main id="main" tabIndex={-1} className="flex-1 max-w-4xl mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-9 py-8 lg:py-12">
          {/* Track hero */}
          <section className="grid grid-cols-[auto_1fr] gap-8 mb-12 pb-10 border-b border-rule">
            <div
              className="text-7xl text-gold-deep leading-none"
              style={{ fontFamily: "var(--cw-serif)" }}
              aria-hidden
            >
              {letter}
            </div>
            <div className="space-y-4">
              <div
                className="text-[11px] uppercase text-ink-3 flex items-center gap-2"
                style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
              >
                <span>Track {letter}</span>
                <span className="text-gold-deep">●</span>
                <span>
                  {total} nodes · {totalMin} min total
                </span>
              </div>
              <h1
                className="text-4xl leading-tight"
                style={{ fontFamily: "var(--cw-serif)" }}
              >
                {t.title}
              </h1>
              <p
                className="text-base text-ink-2 leading-relaxed"
                style={{ fontFamily: "var(--cw-serif)" }}
              >
                {t.scope}
              </p>
              <p className="text-sm text-ink-3 leading-relaxed">
                <span
                  className="text-[10px] uppercase mr-2 text-ink-3"
                  style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
                >
                  Why this track exists
                </span>
                {t.why}
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="flex-1 h-1 bg-rule rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold-deep transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span
                  className="text-[11px] text-ink-3 shrink-0"
                  style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.06em" }}
                >
                  {ready} / {total} ready
                </span>
              </div>
            </div>
          </section>

          {/* Node list */}
          <section>
            <div className="flex items-baseline justify-between mb-6">
              <h2
                className="text-xl"
                style={{ fontFamily: "var(--cw-serif)" }}
              >
                The {total}-node arc
              </h2>
              <span
                className="text-[10px] uppercase text-ink-3"
                style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
              >
                § Nodes · in order
              </span>
            </div>
            <ul className="divide-y divide-rule">
              {t.nodes.map((node) => (
                <li key={node.id} className="py-5">
                  <Link
                    href={`/nodes/${node.id}`}
                    className="grid grid-cols-[3rem_1fr_auto] gap-5 items-start no-underline hover:bg-paper-2/40 -mx-2 px-2 py-1 rounded"
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className="text-ink-3 text-sm"
                        style={{ fontFamily: "var(--cw-mono)" }}
                      >
                        {node.id}
                      </span>
                      {node.star && (
                        <span className="text-gold-deep text-xs" title="Start here">
                          ★
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <h3
                        className="text-base leading-snug"
                        style={{ fontFamily: "var(--cw-serif)" }}
                      >
                        {node.title}
                      </h3>
                      <p className="text-sm text-ink-2 leading-relaxed">
                        {node.pocket}
                      </p>
                    </div>
                    <div
                      className="flex flex-col items-end gap-1 text-[10px] uppercase shrink-0"
                      style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
                    >
                      <StatusPip status={node.status} />
                      {node.topicContested && (
                        <span style={{ color: "var(--gold-deep)" }}>◆ contested topic</span>
                      )}
                      <span className="text-ink-3">{node.time}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>

      <Footer />
    </>
  );
}

function StatusPip({ status }: { status: "ready" | "drafted" }) {
  const config = {
    ready: { color: "var(--cw-green)", label: "● ready" },
    drafted: { color: "var(--ink-3)", label: "○ drafted" },
  }[status];
  return <span style={{ color: config.color }}>{config.label}</span>;
}
