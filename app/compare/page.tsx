import Link from "next/link";
import { Topbar, Crumb } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { fetchWbSeries, type WbSeries } from "@/lib/data/worldbank";
import { getFallback } from "@/lib/data/worldbank-fallback";
import {
  type Country,
} from "@/lib/data/worldbank-countries";
import {
  type Indicator,
} from "@/lib/data/worldbank-indicators";
import { CompareControls } from "./CompareControls";
import { parseCountries, parseIndicators } from "./parse";
import styles from "./compare.module.css";

export const metadata = {
  title: "Compare countries · Causeway",
  description:
    "Put two to four countries next to each other on the macro indicators that matter. Live from the World Bank.",
};

export const revalidate = 21600; // 6h

interface PageProps {
  searchParams: Promise<{ c?: string; i?: string }>;
}

// Up to 4 distinct colors per country line.
const COUNTRY_COLORS = [
  "var(--cw-red)",
  "var(--cw-blue)",
  "var(--gold-deep)",
  "var(--cw-green)",
];

export default async function ComparePage({ searchParams }: PageProps) {
  const { c, i } = await searchParams;
  const countries = parseCountries(c);
  const indicators = parseIndicators(i);

  // Fan out (country × indicator) fetches in parallel. Each call is
  // separately cached by Next's fetch cache.
  const matrix = await Promise.all(
    indicators.map(async (ind) => ({
      indicator: ind,
      series: await Promise.all(
        countries.map((country) =>
          fetchWbSeries(
            ind.code,
            country.iso3,
            getFallback({ indicator: ind.code, country: country.iso3 }),
            30,
          ),
        ),
      ),
    })),
  );

  const anyLive = matrix.some((row) =>
    row.series.some((s) => s.source === "worldbank"),
  );

  return (
    <>
      <Topbar
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
                Compare countries
              </span>,
            ]}
          />
        }
      />

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 mx-auto max-w-[1100px] w-full px-4 sm:px-6 lg:px-9 py-12"
      >
        <Hero countries={countries} indicators={indicators} liveAny={anyLive} />

        <CompareControls
          selectedCountries={countries}
          selectedIndicators={indicators}
        />

        <section className="mt-4">
          {matrix.map((row) => (
            <IndicatorPanel
              key={row.indicator.code}
              indicator={row.indicator}
              countries={countries}
              series={row.series}
            />
          ))}
        </section>

        <Methodology />
      </main>

      <Footer />
    </>
  );
}

interface HeroProps {
  countries: Country[];
  indicators: Indicator[];
  liveAny: boolean;
}

function Hero({ countries, indicators, liveAny }: HeroProps) {
  const cNames = countries.map((c) => c.name).join(" · ");
  return (
    <section className="pb-8 border-b border-rule space-y-4">
      <div
        className="text-[11px] uppercase text-ink-3 flex items-center gap-2"
        style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
      >
        ◇ Compare
        <span className="text-gold-deep">●</span>
        <span>{liveAny ? "live · World Bank" : "snapshot · upstream unavailable"}</span>
      </div>
      <h1
        className="text-3xl lg:text-4xl leading-[1.05] tracking-tight"
        style={{ fontFamily: "var(--cw-serif)" }}
      >
        {cNames}
        <em className="text-gold-deep ml-2" style={{ fontStyle: "italic" }}>
          side-by-side
        </em>
      </h1>
      <p
        className="text-base text-ink-2 leading-relaxed max-w-2xl"
        style={{ fontFamily: "var(--cw-serif)" }}
      >
        {indicators.length} indicator{indicators.length === 1 ? "" : "s"} across {countries.length} countr{countries.length === 1 ? "y" : "ies"}.
        Pick from the chip rows below; the URL updates so you can share the comparison.
      </p>
    </section>
  );
}

interface IndicatorPanelProps {
  indicator: Indicator;
  countries: Country[];
  series: WbSeries[];
}

function IndicatorPanel({ indicator, countries, series }: IndicatorPanelProps) {
  return (
    <div className={styles.indicatorRow}>
      <div className={styles.indicatorHead}>
        <h2 className={styles.indicatorTitle}>{indicator.label}</h2>
        <div className={styles.indicatorMeta}>
          {indicator.code}
          {series.every((s) => s.source === "fallback") && (
            <span className={styles.snapshotBadge}>snapshot</span>
          )}
        </div>
      </div>
      <p className={styles.indicatorBlurb}>{indicator.blurb}</p>
      <IndicatorChart indicator={indicator} countries={countries} series={series} />
      <SeriesTable countries={countries} series={series} indicator={indicator} />
    </div>
  );
}

interface ChartProps {
  indicator: Indicator;
  countries: Country[];
  series: WbSeries[];
}

const W = 720;
const H = 200;
const PAD_L = 70;
const PAD_R = 16;
const PAD_T = 12;
const PAD_B = 30;

function IndicatorChart({ indicator, countries, series }: ChartProps) {
  // Gather all (year, value) points across all countries to compute bounds.
  const allPoints: { year: number; value: number }[] = [];
  series.forEach((s) => {
    s.observations.forEach((o) => {
      if (o.value === null) return;
      const yr = parseInt(o.date, 10);
      if (!Number.isFinite(yr)) return;
      allPoints.push({ year: yr, value: o.value });
    });
  });

  if (allPoints.length === 0) {
    return <div className={styles.empty}>No data available for this indicator across the selected countries.</div>;
  }

  const xMin = Math.min(...allPoints.map((p) => p.year));
  const xMax = Math.max(...allPoints.map((p) => p.year));
  const xRange = Math.max(xMax - xMin, 1);

  // Y: linear or log depending on indicator
  const transform =
    indicator.kind === "log"
      ? (v: number) => Math.log10(Math.max(v, 1))
      : (v: number) => v;
  const yTransformed = allPoints.map((p) => transform(p.value));
  const yMin = Math.min(...yTransformed);
  const yMax = Math.max(...yTransformed);
  const yRange = Math.max(yMax - yMin, 0.0001);

  const xFor = (year: number) =>
    PAD_L + ((year - xMin) / xRange) * (W - PAD_L - PAD_R);
  const yFor = (value: number) =>
    H - PAD_B - ((transform(value) - yMin) / yRange) * (H - PAD_T - PAD_B);

  // Five y-ticks evenly spaced
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const tv = yMin + t * yRange;
    const display = indicator.kind === "log" ? Math.pow(10, tv) : tv;
    return { y: yFor(display), label: formatValue(display, indicator) };
  });

  // Three x-ticks
  const xTicks = [xMin, Math.round((xMin + xMax) / 2), xMax];

  return (
    <div className={styles.chartFrame}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${indicator.label} across ${countries.map((c) => c.name).join(", ")}`}
        className={styles.chartSvg}
      >
        {/* axes */}
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--ink-2)" />
        <line x1={PAD_L} y1={H - PAD_B} x2={PAD_L} y2={PAD_T} stroke="var(--ink-2)" />

        {/* y-grid + labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={t.y} y2={t.y} stroke="var(--rule)" strokeDasharray="2 3" />
            <text
              x={PAD_L - 6}
              y={t.y + 3}
              textAnchor="end"
              fontSize="9"
              fontFamily="var(--cw-mono)"
              fill="var(--ink-3)"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* x-ticks */}
        {xTicks.map((yr) => (
          <g key={yr}>
            <line x1={xFor(yr)} y1={H - PAD_B} x2={xFor(yr)} y2={H - PAD_B + 4} stroke="var(--ink-3)" />
            <text
              x={xFor(yr)}
              y={H - 10}
              textAnchor="middle"
              fontSize="9"
              fontFamily="var(--cw-mono)"
              fill="var(--ink-3)"
            >
              {yr}
            </text>
          </g>
        ))}

        {/* country lines */}
        {series.map((s, i) => {
          const color = COUNTRY_COLORS[i % COUNTRY_COLORS.length];
          const pts = s.observations
            .filter((o): o is { date: string; value: number } => o.value !== null)
            .map((o) => ({ year: parseInt(o.date, 10), value: o.value }))
            .filter((p) => Number.isFinite(p.year))
            .sort((a, b) => a.year - b.year);
          if (pts.length === 0) return null;
          const d = pts
            .map((p, j) => `${j === 0 ? "M" : "L"} ${xFor(p.year)} ${yFor(p.value)}`)
            .join(" ");
          return (
            <g key={s.country}>
              <path d={d} stroke={color} strokeWidth="2" fill="none" />
              {pts.length === 1 && (
                <circle cx={xFor(pts[0].year)} cy={yFor(pts[0].value)} r="3" fill={color} />
              )}
            </g>
          );
        })}
      </svg>

      <div className={styles.legend}>
        {countries.map((c, i) => (
          <span key={c.iso3}>
            <span
              className={styles.legendDot}
              style={{ background: COUNTRY_COLORS[i % COUNTRY_COLORS.length] }}
              aria-hidden
            />
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}

interface SeriesTableProps {
  countries: Country[];
  series: WbSeries[];
  indicator: Indicator;
}

function SeriesTable({ countries, series, indicator }: SeriesTableProps) {
  // Build a tidy table — latest five years, one column per country.
  const yearsSet = new Set<number>();
  series.forEach((s) => {
    s.observations.forEach((o) => {
      const yr = parseInt(o.date, 10);
      if (Number.isFinite(yr) && o.value !== null) yearsSet.add(yr);
    });
  });
  const years = Array.from(yearsSet).sort((a, b) => b - a).slice(0, 5);

  if (years.length === 0) return null;

  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Year</th>
            {countries.map((c) => (
              <th key={c.iso3}>{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((yr) => (
            <tr key={yr}>
              <td>{yr}</td>
              {countries.map((c, ci) => {
                const s = series[ci];
                const o = s?.observations.find((x) => parseInt(x.date, 10) === yr);
                return (
                  <td key={c.iso3}>
                    {o?.value !== null && o?.value !== undefined
                      ? formatValue(o.value, indicator)
                      : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(v: number, ind: Indicator): string {
  if (ind.unit === "USD") {
    const abs = Math.abs(v);
    if (abs >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
    return `${v.toFixed(0)}`;
  }
  if (ind.unit === "%") {
    return `${v >= 0 ? "" : ""}${v.toFixed(1)}%`;
  }
  return v.toFixed(2);
}

function Methodology() {
  return (
    <section className="mt-12 pt-8 border-t border-rule space-y-3">
      <h3 className="text-lg" style={{ fontFamily: "var(--cw-serif)" }}>
        About this comparison
      </h3>
      <p
        className="text-sm text-ink-2 leading-relaxed max-w-3xl"
        style={{ fontFamily: "var(--cw-serif)" }}
      >
        Data comes from the public{" "}
        <a
          href="https://api.worldbank.org/v2"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-rule-2 hover:text-ink-2"
        >
          World Bank API
        </a>
        . No API key required. Each (country × indicator) cell is fetched
        independently and cached for six hours. If the upstream is briefly
        unavailable, a snapshot from the fallback dataset is shown and labelled
        as such.
      </p>
      <p
        className="text-sm text-ink-2 leading-relaxed max-w-3xl"
        style={{ fontFamily: "var(--cw-serif)" }}
      >
        GDP and GDP-per-capita panels use a log axis so countries of very
        different size remain comparable on one chart. National definitions
        and revisions vary — treat single-year differences as approximate.
      </p>
    </section>
  );
}
