import Link from "next/link";
import { Topbar, Crumb } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { getRegimeRead, type AxisRead } from "@/lib/data/regime";
import { classifyLevel } from "@/lib/regime-classification";

export const metadata = {
  title: "Regime dashboard · Causeway",
  description:
    "Four economic indicators with observation dates, source status, and clearly labelled offline illustrations. The entry point for Track H.",
};

// Monthly and quarterly observations are checked for updates every 6h.
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
        <Hero composite={read.composite} sourceSummary={read.sourceSummary} />

        <section className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {read.axes.map((axis) => (
            <Gauge key={axis.key} axis={axis} />
          ))}
        </section>

        <Implications items={read.implications} />

        <Methodology />
      </main>

      <Footer />
    </>
  );
}

/* -------------------------------------------------------------------------- */

interface HeroProps {
  composite: Awaited<ReturnType<typeof getRegimeRead>>["composite"];
  sourceSummary: Awaited<ReturnType<typeof getRegimeRead>>["sourceSummary"];
}

const SOURCE_LABELS = {
  fred: "FRED observations · dates vary by series",
  fallback: "Illustrative offline snapshot",
  mixed: "Mixed sources · check each indicator",
  unavailable: "Data unavailable",
};

function Hero({ composite, sourceSummary }: HeroProps) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 pb-12 border-b border-rule">
      <div className="space-y-5">
        <div
          className="text-[11px] uppercase text-ink-3 flex items-center gap-2"
          style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
        >
          ▣ Cross-cutting
          <span className="text-gold-deep">●</span>
          <span>{SOURCE_LABELS[sourceSummary]}</span>
        </div>
        <h1
          className="text-4xl lg:text-5xl leading-[1.05] tracking-tight"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          Indicator snapshot:{" "}
          <em
            className="block mt-4 text-2xl lg:text-3xl leading-snug text-gold-deep"
            style={{ fontStyle: "italic" }}
          >
            {composite.headline}.
          </em>
        </h1>
        <p
          className="text-lg text-ink-2 leading-relaxed max-w-2xl"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          Inflation, money, labor, and credit in one view. Each card shows its
          source and observation period. Provider data may be cached for six
          hours; a recent retrieval does not make an older observation current.
        </p>
      </div>

      <aside className="border border-rule rounded-md p-6 self-start bg-paper-2/40 space-y-4">
        <StatBlock label="Evidence coverage">
          <div
            className="text-3xl text-gold-deep"
            style={{ fontFamily: "var(--cw-serif)", fontStyle: "italic" }}
          >
            {composite.confirming} of {composite.of}
          </div>
          <div className="text-xs text-ink-3 leading-relaxed">
            {composite.detail}
          </div>
        </StatBlock>
        <div className="border-t border-rule pt-3">
          <StatBlock label="Trend coverage">
            <div className="text-xl text-ink-2" style={{ fontFamily: "var(--cw-serif)" }}>
              {composite.trendCoverage} of {composite.of}
            </div>
            <p className="text-xs text-ink-3 leading-relaxed">
              Recent FRED readings with an exact preceding-period comparison.
              Two periods describe a change, not a forecast.
            </p>
          </StatBlock>
        </div>
        <div className="border-t border-rule pt-3">
          <StatBlock label="Source">
            <div className="text-xs text-ink-2 leading-relaxed">
              {SOURCE_LABELS[sourceSummary]}. Bundled fallbacks are illustrative
              inputs, not verified current readings.
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

const VALUE_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function displayValue(axis: AxisRead): string {
  const { value } = axis;
  if (value === null) return "—";
  if (value !== 0 && VALUE_FORMAT.format(Math.abs(value)) === "0") {
    return value < 0 ? "−<0.01" : "<0.01";
  }
  // Preserve the displayed classification on either side of a boundary.
  for (let digits = 2; digits <= 10; digits += 1) {
    const formatted = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: digits, useGrouping: false,
    }).format(value);
    if (classifyLevel(axis.key, Number(formatted)).level.label === axis.level.label) return formatted;
  }
  return String(value);
}

function Gauge({ axis }: GaugeProps) {
  const fill = TONE_COLORS[axis.tone];
  const sourceLabel = axis.source === "fred" ? "FRED observation"
    : axis.source === "fallback" ? "Illustrative snapshot" : "Unavailable";

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
          className="text-[10px] text-ink-3 leading-relaxed"
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
        {displayValue(axis)}
        <span
          className="text-lg text-ink-3 ml-1"
          style={{ fontFamily: "var(--cw-mono)" }}
        >
          {axis.unit}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-2 rounded-sm bg-paper-3 mt-4">
        {axis.fillPct !== null && <div
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{ width: `${axis.fillPct}%`, background: fill }}
          aria-hidden
        />}
        <div
          className="absolute top-[-3px] bottom-[-3px] w-px bg-ink-3"
          style={{ left: `${axis.markerPct}%` }}
          aria-hidden
        />
      </div>

      <div className="mt-4 flex-1 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-3">Level</p>
          <p className="text-sm text-ink-2 leading-relaxed mt-1">{axis.verdict}</p>
          <p className="text-xs text-ink-3 leading-relaxed mt-2">{axis.level.reference}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-3">Change</p>
          <p className="text-sm text-ink-2 leading-relaxed mt-1">{axis.trend.label}</p>
        </div>
        {axis.selectionNote && (
          <p className="text-xs text-ink-3 leading-relaxed">{axis.selectionNote}</p>
        )}
      </div>
      <p className="text-xs text-ink-3 leading-relaxed mt-3">
        {axis.source === "fallback"
          ? `Bundled illustration, not current provider data. Example period age: ${axis.observationAgeDays} days${axis.freshness === "stale" ? `; exceeds the ${axis.staleAfterDays}-day display threshold` : ""}.`
          : axis.source === "unavailable"
            ? "No usable observation is available."
            : axis.freshness === "stale"
              ? `Older observation: ${axis.observationAgeDays} days since its period began (display threshold: ${axis.staleAfterDays} days).`
              : `Observation period began ${axis.observationAgeDays} days ago.`}
      </p>
      <a href={`https://fred.stlouisfed.org/series/${axis.seriesId}`} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-2">
        View source series
      </a>

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

function Implications({ items }: { items: Awaited<ReturnType<typeof getRegimeRead>>["implications"] }) {
  return (
    <section className="mt-16 pt-10 border-t border-rule">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
        <h2 className="text-2xl" style={{ fontFamily: "var(--cw-serif)" }}>
          What these readings can help you examine
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
        Each question follows its own indicator and data limitations. Use the
        linked lessons to examine the mechanism, your circumstances, and the
        assumptions; no single reading establishes what you should do next.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          Levels use illustrative thresholds to make comparisons legible. These
          are teaching heuristics, not fitted estimates or a diagnosis of one
          economic cycle. Each axis is read independently. Evidence coverage
          counts recent FRED observations that support their own level
          classifications; it is not statistical confidence or agreement among
          indicators. Values normally show up to two decimals, with more precision
          near a boundary so the number and classification remain consistent.
        </p>
        <p
          className="text-base text-ink-2 leading-relaxed"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          Changes compare exact adjacent months, or adjacent quarters for the
          lending survey. A gap leaves the change unknown. CPI uses the newest
          complete annual pair of positive indexes for the same month one year
          apart, stepping back when needed without interpolation. A monthly
          effective-rate change does not by itself identify an FOMC decision.
        </p>
        <ul className="space-y-2 text-sm text-ink-2 leading-relaxed list-disc pl-5">
          <li>
            CPI uses a 2% reference and 2.2% / 3.3% teaching boundaries.
            The Federal Reserve&apos;s{" "}
            <a href="https://www.federalreserve.gov/faqs/economy_14400.htm" target="_blank" rel="noopener noreferrer" className="underline">
              2% longer-run goal uses PCE inflation
            </a>, a different price index.
          </li>
          <li>Money uses an assumed 3% nominal reference with a 2.5–3.5% band, not an observed neutral rate.</li>
          <li>Labor uses an illustrative 4.5–5.5% unemployment band, not an estimate of full employment.</li>
          <li>Credit is net tightening above zero and net easing below zero. That sign and the change since the preceding quarter answer different questions.</li>
        </ul>
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
          . Dates identify observation periods, not release or retrieval dates.
          Bundled fallbacks are illustrative snapshots with no recorded source
          verification date. They are labelled on every affected card.
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
