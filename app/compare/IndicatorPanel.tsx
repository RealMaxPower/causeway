import type { WbFallbackReason, WbSeries } from "@/lib/data/worldbank";
import type { Country } from "@/lib/data/worldbank-countries";
import type { Indicator } from "@/lib/data/worldbank-indicators";
import styles from "./compare.module.css";
import { sourceSummary } from "./presentation";

// Up to 4 distinct colors per country line.
const COUNTRY_COLORS = [
  "var(--cw-red)",
  "var(--cw-blue)",
  "var(--gold-deep)",
  "var(--cw-green)",
];

interface IndicatorPanelProps {
  indicator: Indicator;
  countries: Country[];
  series: WbSeries[];
}

export function IndicatorPanel({ indicator, countries, series }: IndicatorPanelProps) {
  return (
    <div className={styles.indicatorRow}>
      <div className={styles.indicatorHead}>
        <h2 className={styles.indicatorTitle}>{indicator.label}</h2>
        <div className={styles.indicatorMeta}>
          {indicator.code}
          <span className={styles.snapshotBadge}>{sourceSummary(series)}</span>
        </div>
      </div>
      <p className={styles.indicatorBlurb}>{indicator.blurb}</p>
      <SeriesProvenance countries={countries} series={series} />
      <IndicatorChart indicator={indicator} countries={countries} series={series} />
      <SeriesTable countries={countries} series={series} indicator={indicator} />
    </div>
  );
}

const FALLBACK_LABELS: Record<WbFallbackReason, string> = {
  offline: "Offline mode",
  timeout: "API request timed out",
  "upstream-error": "API unavailable",
  "invalid-response": "API response failed validation",
  "no-data": "API returned no usable values",
};

function SeriesProvenance({ countries, series }: Pick<IndicatorPanelProps, "countries" | "series">) {
  return (
    <ul className={styles.provenance} aria-label="Sources and freshness by country">
      {series.map((entry) => {
        const name = countries.find((country) => country.iso3 === entry.country)?.name ?? entry.country;
        const forecasts = entry.observations.filter((observation) => observation.status === "forecast").length;
        const flagged = entry.observations.some((observation) => observation.status === "flagged");
        return (
          <li key={entry.country}>
            <strong>{name}</strong>
            <span>{entry.source === "worldbank" ? "World Bank API" : entry.source === "fallback" ? "Illustrative snapshot" : "Unavailable"}</span>
            <span>Latest value year: {entry.latestObservationDate ?? "none"}</span>
            {entry.source === "worldbank" && <span>Source dataset updated: {entry.providerUpdatedAt ?? "not provided"}</span>}
            {entry.source === "fallback" && <span>Snapshot update date: {entry.snapshotUpdatedAt ?? "unrecorded"}</span>}
            {entry.fallbackReason && <span>{FALLBACK_LABELS[entry.fallbackReason]}{entry.source === "unavailable" ? "; no usable snapshot" : ""}.</span>}
            {entry.hasGaps && <span>Partial series: missing, invalid or unsampled years.</span>}
            {forecasts > 0 && <span>Includes {forecasts} forecast value{forecasts === 1 ? "" : "s"} (F).</span>}
            {flagged && <span>Includes other provider-flagged values (*).</span>}
            <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">World Bank source data</a>
          </li>
        );
      })}
    </ul>
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
  const plottable = (value: number | null): value is number =>
    value !== null && Number.isFinite(value) && (indicator.kind !== "log" || value > 0);
  // Gather all (year, value) points across all countries to compute bounds.
  const allPoints: { year: number; value: number }[] = [];
  series.forEach((s) => {
    s.observations.forEach((o) => {
      if (!plottable(o.value)) return;
      const yr = Number(o.date);
      if (!Number.isFinite(yr)) return;
      allPoints.push({ year: yr, value: o.value });
    });
  });

  if (allPoints.length === 0) {
    return <div className={styles.empty}>No values can be plotted for this indicator.{indicator.kind === "log" && " The log axis requires positive values; see the table for any zero or negative values."}</div>;
  }

  const xMin = Math.min(...allPoints.map((p) => p.year));
  const xMax = Math.max(...allPoints.map((p) => p.year));
  const xRange = Math.max(xMax - xMin, 1);

  // Y: linear or log depending on indicator
  const transform =
    indicator.kind === "log"
      ? (v: number) => Math.log10(v)
      : (v: number) => v;
  const yTransformed = allPoints.map((p) => transform(p.value));
  // Normalize first so even finite extreme values cannot overflow the axis span.
  const yScale = Math.max(...yTransformed.map(Math.abs)) || 1;
  const yMin = Math.min(...yTransformed.map((value) => value / yScale));
  const yMax = Math.max(...yTransformed.map((value) => value / yScale));
  const yRange = yMax - yMin;

  const xFor = (year: number) =>
    PAD_L + ((year - xMin) / xRange) * (W - PAD_L - PAD_R);
  const yFor = (value: number) =>
    H - PAD_B - (yRange === 0 ? 0.5 : (transform(value) / yScale - yMin) / yRange) * (H - PAD_T - PAD_B);

  // Five y-ticks evenly spaced
  const yTicks = (yRange === 0 ? [0.5] : [0, 0.25, 0.5, 0.75, 1]).map((t) => {
    const tv = ((1 - t) * yMin + t * yMax) * yScale;
    const display = indicator.kind === "log" ? Math.pow(10, tv) : tv;
    return { y: H - PAD_B - t * (H - PAD_T - PAD_B), label: formatValue(display, indicator) };
  });

  // Three x-ticks
  const xTicks = [...new Set([xMin, Math.round((xMin + xMax) / 2), xMax])];

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
            .flatMap((o) => plottable(o.value) ? [{ year: Number(o.date), value: o.value, status: o.status }] : [])
            .filter((p) => Number.isFinite(p.year))
            .sort((a, b) => a.year - b.year);
          if (pts.length === 0) return null;
          const d = pts
            .map((p, j) => `${j === 0 || p.year - pts[j - 1].year !== 1 ? "M" : "L"} ${xFor(p.year)} ${yFor(p.value)}`)
            .join(" ");
          return (
            <g key={s.country}>
              <path d={d} stroke={color} strokeWidth="2" fill="none" />
              {pts.map((point) => (
                <circle key={point.year} cx={xFor(point.year)} cy={yFor(point.value)} r="3"
                  fill={point.status ? "var(--paper)" : color} stroke={color}>
                  <title>{`${s.country}, ${point.year}: ${formatValue(point.value, indicator)}${point.status ? ` (${point.status === "forecast" ? "forecast" : "provider flagged"})` : ""}`}</title>
                </circle>
              ))}
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
      {series.some((entry) => entry.observations.some((observation) => observation.status)) && (
        <p className={styles.indicatorBlurb}>Hollow dots mark forecasts or other provider-flagged values.</p>
      )}
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
      const yr = Number(o.date);
      if (Number.isFinite(yr)) yearsSet.add(yr);
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
              <th scope="row">{yr}</th>
              {countries.map((c, ci) => {
                const s = series[ci];
                const o = s?.observations.find((x) => Number(x.date) === yr);
                return (
                  <td key={c.iso3}>
                    {o?.value !== null && o?.value !== undefined
                      ? formatValue(o.value, indicator)
                      : <span aria-label="Missing value">—</span>}
                    {o?.value !== null && o?.value !== undefined && o.status && (
                      <abbr title={o.status === "forecast" ? "Forecast" : "Provider flagged"}>{o.status === "forecast" ? " F" : " *"}</abbr>
                    )}
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
  if (!Number.isFinite(v)) return "—";
  if (ind.unit === "USD") {
    const abs = Math.abs(v);
    if (abs >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
    return `${v.toFixed(0)}`;
  }
  if (ind.unit === "%") {
    return `${v.toFixed(1)}%`;
  }
  return v.toFixed(2);
}

