import Link from "next/link";
import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { MobileNav } from "@/components/chrome/MobileNav";
import { ContinueCard } from "@/components/progress/ContinueCard";
import { TRACKS, TRACK_ORDER, TOTAL_NODES } from "@/lib/tracks";

interface DefaultStep {
  href: string;
  eyebrow: string;
  title: string;
  time: string;
  star?: boolean;
}

/**
 * The curated first-time-learner sequence. Goes vocabulary → mechanism →
 * leverage → episode → output. ~ 1h 50m total. Inherited from the v0
 * prototype's home page and updated for the current node set.
 */
const DEFAULT_PATH: DefaultStep[] = [
  { href: "/nodes/A3", eyebrow: "A3 · Money", title: "How banks create money", time: "25 min", star: true },
  { href: "/nodes/C5", eyebrow: "C5 · Macro", title: "Rates as the price of time", time: "20 min" },
  { href: "/regime", eyebrow: "H1 · Leverage", title: "Read the regime now", time: "15 min" },
  { href: "/nodes/F2", eyebrow: "F2 · Crises", title: "Replay the 2008 GFC", time: "30 min" },
  { href: "/playbook", eyebrow: "◇ Output", title: "Build your playbook", time: "15 min" },
];

export default function Home() {
  const totalMinutes = TRACK_ORDER.reduce(
    (sum, l) =>
      sum + TRACKS[l].nodes.reduce((s, n) => s + parseInt(n.time, 10), 0),
    0,
  );
  const readyCount = TRACK_ORDER.reduce(
    (sum, l) =>
      sum + TRACKS[l].nodes.filter((n) => n.status === "ready").length,
    0,
  );

  return (
    <>
      <Topbar
        leftAddon={<MobileNav />}
        right={
          <div
            className="hidden sm:block text-[11px] text-ink-3"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
          >
            v 0.7 · {TOTAL_NODES} nodes scaffolded
          </div>
        }
      />

      <main id="main" tabIndex={-1} className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-9 py-8 sm:py-12 flex-1">
        {/* Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-16 mb-20 pb-16 border-b border-rule">
          <div className="space-y-6">
            <div
              className="text-[11px] uppercase text-ink-3 flex items-center gap-2"
              style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
            >
              Causeway
              <span className="text-gold-deep">●</span>
              <span>A working brief, not a textbook</span>
            </div>
            <h1
              className="text-4xl lg:text-5xl leading-[1.05] tracking-tight"
              style={{ fontFamily: "var(--cw-serif)" }}
            >
              Understand the{" "}
              <em className="text-gold-deep" style={{ fontStyle: "italic" }}>
                economy
              </em>{" "}
              as a machine you can drive.
            </h1>
            <p
              className="text-lg text-ink-2 leading-relaxed max-w-2xl"
              style={{ fontFamily: "var(--cw-serif)" }}
            >
              Every concept comes in three layers — a thirty-second answer, a
              five-minute working model you can manipulate, and a twenty-minute
              deep dive with sources. Every concept ends with the only question
              that matters:{" "}
              <em>so what does this change about a decision you actually make?</em>
            </p>
          </div>

          <aside className="border border-rule rounded-md p-6 self-start space-y-5 bg-paper-2/40">
            <Stat label="Tracks" value={String(TRACK_ORDER.length)}>
              {TRACK_ORDER.map((l) => TRACKS[l].short).join(" · ")}
            </Stat>
            <Stat label="Concept nodes" value={String(TOTAL_NODES)}>
              Each in three layers — pocket, working, full.
            </Stat>
            <Stat label="Ready · total minutes" value={`${readyCount} · ${totalMinutes}`}>
              Built depth-first; new nodes ship complete.
            </Stat>
          </aside>
        </section>

        {/* Continue card (renders only for returning visitors with localStorage progress). */}
        <ContinueCard />

        {/* Default path · the curated first-time-learner sequence */}
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-rule">
            <h2
              className="text-2xl"
              style={{ fontFamily: "var(--cw-serif)" }}
            >
              The default path · for first-time learners
            </h2>
            <span
              className="text-[11px] text-ink-3"
              style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
            >
              ~ 1h 50m total
            </span>
          </div>
          <p
            className="text-sm text-ink-2 leading-relaxed mb-6 max-w-2xl"
            style={{ fontFamily: "var(--cw-serif)" }}
          >
            A guided sequence that builds vocabulary, then mechanism, then
            leverage. Skip any node you already know — every node stands on
            its own.
          </p>
          <ol className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {DEFAULT_PATH.map((step, i) => (
              <li key={step.href}>
                <Link
                  href={step.href}
                  className="block border border-rule rounded-md p-4 h-full hover:border-rule-strong hover:bg-paper-2/40 transition-colors no-underline"
                >
                  <div
                    className="text-[10px] uppercase text-ink-3 mb-2 flex justify-between"
                    style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
                  >
                    <span>
                      {String(i + 1).padStart(2, "0")} · {step.eyebrow}
                    </span>
                    {step.star && <span className="text-gold-deep">★</span>}
                  </div>
                  <h3
                    className="text-base mb-2 leading-snug"
                    style={{ fontFamily: "var(--cw-serif)" }}
                  >
                    {step.title}
                  </h3>
                  <div
                    className="text-[10px] uppercase text-ink-3 mt-3 pt-2 border-t border-rule"
                    style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
                  >
                    {step.time}
                    {i === 0 && (
                      <span className="text-gold-deep ml-2">start here</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* Track grid */}
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-rule">
            <h2
              className="text-2xl"
              style={{ fontFamily: "var(--cw-serif)" }}
            >
              The eight tracks
            </h2>
            <span
              className="text-[11px] text-ink-3"
              style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
            >
              Pick any track · they cross-link
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRACK_ORDER.map((l) => {
              const t = TRACKS[l];
              const ready = t.nodes.filter((n) => n.status === "ready").length;
              const drafted = t.nodes.length - ready;
              const contested = t.nodes.filter((n) => n.topicContested).length;
              return (
                <Link
                  key={l}
                  href={`/tracks/${l}`}
                  className="group block border border-rule rounded-md p-5 hover:border-rule-strong hover:bg-paper-2/40 transition-colors no-underline"
                >
                  <div
                    className="text-[11px] uppercase text-ink-3 flex justify-between mb-3"
                    style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
                  >
                    <span>
                      Track {l} · {t.nodes.length} nodes
                    </span>
                    <span className="text-ink-4 group-hover:text-ink-2">→</span>
                  </div>
                  <h3
                    className="text-lg mb-2 leading-snug"
                    style={{ fontFamily: "var(--cw-serif)" }}
                  >
                    {t.title}
                  </h3>
                  <p className="text-sm text-ink-2 leading-relaxed mb-3">{t.scope}</p>
                  <div
                    className="text-[10px] uppercase text-ink-3 flex justify-between gap-2 pt-3 border-t border-rule"
                    style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
                  >
                    <span>
                      {ready === t.nodes.length
                        ? `${ready} shipped`
                        : ready > 0
                          ? `${ready} ready · ${drafted} drafted`
                          : "queued"}
                    </span>
                    {contested > 0 && (
                      <span
                        className="text-gold-deep"
                        title={`${contested} node${contested === 1 ? "" : "s"} flagged as topically contested`}
                      >
                        {contested} contested
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}

interface StatProps {
  label: string;
  value: string;
  children: React.ReactNode;
}

function Stat({ label, value, children }: StatProps) {
  return (
    <div className="space-y-1">
      <div
        className="text-[10px] uppercase text-ink-3"
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
      <div className="text-xs text-ink-3 leading-relaxed">{children}</div>
    </div>
  );
}
