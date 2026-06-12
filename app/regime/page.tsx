import Link from "next/link";
import { Topbar, Crumb } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { getRegimeRead, type AxisRead } from "@/lib/data/regime";

export const metadata = {
  title: "Regime dashboard · Causeway",
  description:
    "Four live FRED axes — inflation, money, labor, credit — combined into a single regime read. The entry point for Track H.",
};

// FRED data refreshes on a monthly cadence; rebuild the static read every 6h.
// Note: Next.js 16 requires `revalidate` to be statically analyzable —
// literal number, not a computed expression.
export const revalidate = 21600; // 60 * 60 * 6

export default async function RegimePage() {
  const read = await getRegimeRead();

  return (
    <>
      <Topbar
        crumb={
          <Crumb
            segments={[
              <Link key="map" href="/" className="hover:text-ink-2 no-underline">
                Track map
              </Link>,
              <Link
                key="track"
                href="/tracks/H"
                className="hover:text-ink-2 no-underline"
              >
                Track H · Leverage
              </Link>,
              <span key="now" className="text-ink-2">
                Regime dashboard
              </span>,
            ]}
          />
        }
        right={
          <Link
            href="/nodes/H1"
            className="text-[11px] text-ink-2 hover:text-ink no-underline"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
          >
            Open H1 · Reading the regime →
          </Link>
        }
      />

      <main id="main" tabIndex={-1} className="flex-1 mx-auto max-w-[1320px] w-full px-4 sm:px-6 lg:px-9 py-12">
        <Hero composite={read.composite} liveAny={read.liveAny} />

        <section className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {read.axes.map((axis) => (
            <Gauge key={axis.key} axis={axis} />
          ))}
        </section>

        <Implications />

        <Methodology />
      </main>

      <Footer />
    </>
  );
}

/* -------------------------------------------------------------------------- */

interface HeroProps {
  composite: Awaited<ReturnType<typeof getRegimeRead>>["composite"];
  liveAny: boolean;
}

function Hero({ composite, liveAny }: HeroProps) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 pb-12 border-b border-rule">
      <div className="space-y-5">
        <div
          className="text-[11px] uppercase text-ink-3 flex items-center gap-2"
          style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
        >
          ▣ Cross-cutting
          <span className="text-gold-deep">●</span>
          <span>{liveAny ? "live · FRED" : "snapshot · upstream unavailable"}</span>
        </div>
        <h1
          className="text-4xl lg:text-5xl leading-[1.05] tracking-tight"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          Right now you are in a{" "}
          <em
            className="text-gold-deep"
            style={{ fontStyle: "italic" }}
          >
            {composite.headline}
          </em>{" "}
          regime.
        </h1>
        <p
          className="text-lg text-ink-2 leading-relaxed max-w-2xl"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          A single screen telling you the macro environment across orthogonal
          axes — and what it implies for the decisions you actually make. All
          four axes are wired live; the read updates with each new FRED release.
        </p>
      </div>

      <aside className="border border-rule rounded-md p-6 self-start bg-paper-2/40 space-y-4">
        <StatBlock label="Confirming axes">
          <div
            className="text-3xl text-gold-deep"
            style={{ fontFamily: "var(--cw-serif)", fontStyle: "italic" }}
          >
            {composite.confirming} of {composite.of}
          </div>
          <div className="text-xs text-ink-3 leading-relaxed">
            Three or more is a clear regime read. Fewer means a turning point.
          </div>
        </StatBlock>
        <div className="border-t border-rule pt-3">
          <StatBlock label="Source">
            <div className="text-xs text-ink-2 leading-relaxed">
              FRED · St. Louis Fed. Cached 6h.
            </div>
          </StatBlock>
        </div>
      </aside>
    </section>
  );
}

interface StatBlockProps {
  label: string;
  children: React.ReactNode;
}

function StatBlock({ label, children }: StatBlockProps) {
  return (
    <div className="space-y-1.5">
      <div
        className="text-[10px] uppercase text-ink-3"
        style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface GaugeProps {
  axis: AxisRead;
}

const TONE_COLORS: Record<AxisRead["tone"], string> = {
  red: "var(--cw-red)",
  blue: "var(--cw-blue)",
  green: "var(--cw-green)",
  gold: "var(--gold-deep)",
};

function Gauge({ axis }: GaugeProps) {
  const fill = TONE_COLORS[axis.tone];
  const sourceLabel = axis.source === "fred" ? "live" : "snapshot";

  return (
    <div className="border border-rule rounded-md p-5 bg-paper-2/30 flex flex-col h-full">
      {/* Header — stacked so neither row competes for width. */}
      <div className="space-y-1">
        <div
          className="text-[11px] uppercase text-ink-3 truncate"
          style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
        >
          ⊕ {axis.label}
        </div>
        <div
          className="text-[10px] text-ink-3 truncate"
          style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
          title={`FRED series ${axis.seriesId} · ${axis.asOf}`}
        >
          {sourceLabel} · {axis.seriesLabel}
        </div>
      </div>

      {/* Big number — fixed line-height so it lands at the same y in every card. */}
      <div
        className="text-4xl leading-none mt-4 tabular-nums"
        style={{ fontFamily: "var(--cw-serif)" }}
      >
        {axis.value.toFixed(1)}
        <span
          className="text-lg text-ink-3 ml-1"
          style={{ fontFamily: "var(--cw-mono)" }}
        >
          {axis.unit}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-2 rounded-sm bg-paper-3 mt-4">
        <div
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{ width: `${axis.fillPct}%`, background: fill }}
          aria-hidden
        />
        <div
          className="absolute top-[-3px] bottom-[-3px] w-px bg-ink-3"
          style={{ left: `${axis.markerPct}%` }}
          aria-hidden
        />
      </div>

      {/* Verdict — flex-1 pushes the footer to the bottom so all cards align. */}
      <p className="text-sm text-ink-2 leading-relaxed mt-4 flex-1">
        {axis.verdict}
      </p>

      {/* Footer — anchored bottom via flex layout. */}
      <div
        className="text-[10px] uppercase text-ink-3 pt-3 mt-3 border-t border-rule flex justify-between gap-2"
        style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
      >
        <span className="truncate">{axis.seriesId}</span>
        <span className="shrink-0">as of {axis.asOf}</span>
      </div>
    </div>
  );
}

function Implications() {
  const items: { axis: string; href: string; title: string; line: string }[] = [
    {
      axis: "H2 · Saving",
      href: "/nodes/H2",
      title: "Cash still earns; lock some in.",
      line: "Short-duration Treasuries pay real yield for the first time in a generation. Laddering preserves it without committing to a bottom.",
    },
    {
      axis: "H3 · Housing",
      href: "/nodes/H3",
      title: "Don't chase the rate; watch the spread.",
      line: "Mortgage rates lag policy. The 10y–30y mortgage spread is the leading indicator, not the headline number.",
    },
    {
      axis: "H8 · Portfolio",
      href: "/nodes/H8",
      title: "Stagger duration; don't pile in.",
      line: "Extending duration into a cuts cycle is canonical; doing it all at once is the canonical mistake.",
    },
  ];

  return (
    <section className="mt-16 pt-10 border-t border-rule">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-2xl" style={{ fontFamily: "var(--cw-serif)" }}>
          What this regime implies for your decisions
        </h2>
        <Link
          href="/tracks/H"
          className="text-[11px] text-ink-3 hover:text-ink-2 no-underline"
          style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
        >
          All of Track H →
        </Link>
      </div>

      <p
        className="text-base text-ink-2 leading-relaxed max-w-3xl mb-6"
        style={{ fontFamily: "var(--cw-serif)" }}
      >
        These are <em>directional defaults</em>, not advice. They flip when the
        regime flips. The point is to know which way the wind is blowing before
        you decide.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((it) => (
          <Link
            key={it.axis}
            href={it.href}
            className="block border border-rule rounded-md p-5 hover:border-rule-strong hover:bg-paper-2/40 transition-colors no-underline"
          >
            <div
              className="text-[10px] uppercase text-ink-3 mb-3"
              style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
            >
              {it.axis}
            </div>
            <h3
              className="text-lg mb-2 leading-snug"
              style={{ fontFamily: "var(--cw-serif)" }}
            >
              {it.title}
            </h3>
            <p className="text-sm text-ink-2 leading-relaxed">{it.line}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Methodology() {
  return (
    <section className="mt-16 pt-10 border-t border-rule grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12">
      <div className="space-y-3">
        <h3
          className="text-xl"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          How the read is calculated
        </h3>
        <p
          className="text-base text-ink-2 leading-relaxed"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          Causeway scores each axis against simple thresholds calibrated to the
          post-1990 sample: Fed target for inflation, neutral rate for monetary
          stance, long-run average for labor. The composite is the count of
          axes confirming a single thematic read — we report it transparently
          rather than blending into a single number that hides disagreement.
        </p>
        <p
          className="text-base text-ink-2 leading-relaxed"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          When axes disagree — common at turning points — the dashboard says
          so. The point is not to pretend the future is knowable; it&apos;s to
          make today&apos;s read legible.
        </p>
      </div>
      <div className="border-t-2 border-ink pt-3 self-start">
        <div
          className="text-[11px] uppercase text-ink-3 mb-3"
          style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
        >
          Indicator sources
        </div>
        <SourceRow code="CPIAUCSL" label="CPI · All Urban Consumers" />
        <SourceRow code="FEDFUNDS" label="Effective Fed Funds Rate" />
        <SourceRow code="UNRATE" label="Civilian Unemployment Rate · U-3" />
        <SourceRow code="DRTSCILM" label="SLOOS · net % tightening C&I" />
        <p className="text-xs text-ink-3 mt-4 leading-relaxed">
          All series via the public{" "}
          <a
            href="https://fred.stlouisfed.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-rule-2 hover:text-ink-2"
          >
            FRED API
          </a>
          . Snapshot fallbacks are used when the upstream is unavailable and
          labelled inline.
        </p>
      </div>
    </section>
  );
}

function SourceRow({
  code,
  label,
  muted,
}: {
  code: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <div className="py-2 border-b border-dashed border-rule last:border-0">
      <div
        className="text-[10px] uppercase tracking-wider"
        style={{
          fontFamily: "var(--cw-mono)",
          color: muted ? "var(--ink-4)" : "var(--ink-3)",
          letterSpacing: "0.06em",
        }}
      >
        {code}
      </div>
      <div
        className="text-sm leading-tight"
        style={{
          fontFamily: "var(--cw-serif)",
          color: muted ? "var(--ink-3)" : "var(--ink)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
