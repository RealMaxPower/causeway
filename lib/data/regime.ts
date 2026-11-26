/** Regime data availability and provenance. Level/trend classification remains
 * the existing pedagogical model; its redesign belongs to PR 4.
 */
import "server-only";
import {
  fetchFredSeries, latest, yoyChange,
  type FredObservation, type FredSource, type FredSeries, type FredFallbackReason,
} from "./fred";

// Illustrative bundled snapshots, not verified current provider releases.
// Dates describe the example observation periods, not a refresh time.
const CPI_FALLBACK: FredObservation[] = [
  { date: "2026-04-01", value: 322.1 },
  { date: "2026-03-01", value: 321.4 },
  { date: "2026-02-01", value: 320.6 },
  { date: "2026-01-01", value: 319.8 },
  { date: "2025-12-01", value: 319.0 },
  { date: "2025-11-01", value: 318.1 },
  { date: "2025-10-01", value: 317.4 },
  { date: "2025-09-01", value: 316.7 },
  { date: "2025-08-01", value: 316.0 },
  { date: "2025-07-01", value: 315.3 },
  { date: "2025-06-01", value: 314.6 },
  { date: "2025-05-01", value: 314.0 },
  { date: "2025-04-01", value: 313.8 },
];

const FEDFUNDS_FALLBACK: FredObservation[] = [
  { date: "2026-04-01", value: 4.25 },
  { date: "2026-03-01", value: 4.33 },
  { date: "2026-02-01", value: 4.33 },
  { date: "2026-01-01", value: 4.5 },
];

const UNRATE_FALLBACK: FredObservation[] = [
  { date: "2026-04-01", value: 4.1 },
  { date: "2026-03-01", value: 4.1 },
  { date: "2026-02-01", value: 4.0 },
  { date: "2026-01-01", value: 4.0 },
];

// SLOOS · net % of banks tightening C&I standards for large/middle firms.
// Quarterly cadence; positive = tightening, negative = easing.
const SLOOS_FALLBACK: FredObservation[] = [
  { date: "2026-01-01", value: -2.5 },
  { date: "2025-10-01", value: -3.0 },
  { date: "2025-07-01", value: -5.0 },
  { date: "2025-04-01", value: 0.0 },
  { date: "2025-01-01", value: 0.5 },
  { date: "2024-10-01", value: 7.4 },
];

export type RegimeSignal = "easing" | "neutral" | "tight" | "loose" | "firm";
export interface AxisRead {
  key: "inflation" | "money" | "labor" | "credit";
  label: string;
  seriesId: string;
  seriesLabel: string;
  value: number | null;
  unit: string;
  asOf: string;
  fillPct: number | null;
  markerPct: number;
  tone: "red" | "blue" | "green" | "gold";
  verdict: string;
  source: FredSource;
  status: "available" | "unavailable";
  /** Observation-period start, not a release or revision timestamp. */
  observationDate: string | null;
  observationAgeDays: number | null;
  freshness: "recent" | "stale" | "unavailable";
  /** Display policy based on period age: 90 days monthly, 180 quarterly. */
  staleAfterDays: number;
  /** Local attempt time, including when Next returns a cached response. */
  checkedAt: string;
  fallbackReason: FredFallbackReason | null;
}

export interface RegimeRead {
  axes: AxisRead[];
  composite: { headline: string; detail: string; confirming: number; of: number };
  /** Time this composite was assembled, not the provider's release time. */
  fetchedAt: string;
  /** Compatibility flag: at least one available FRED value, even if stale. */
  liveAny: boolean;
  sourceSummary: "fred" | "fallback" | "mixed" | "unavailable";
}

interface AxisDefinition {
  key: AxisRead["key"];
  label: string;
  seriesId: string;
  seriesLabel: string;
  minimum: number;
  maximum: number;
  marker: number;
  staleAfterDays: number;
}
const DEFINITIONS: AxisDefinition[] = [
  { key: "inflation", label: "Inflation", seriesId: "CPIAUCSL", seriesLabel: "CPI YoY", minimum: 0, maximum: 6, marker: 2, staleAfterDays: 90 },
  { key: "money", label: "Money", seriesId: "FEDFUNDS", seriesLabel: "Fed funds rate", minimum: 0, maximum: 8, marker: 3, staleAfterDays: 90 },
  { key: "labor", label: "Labor", seriesId: "UNRATE", seriesLabel: "U-3 unemployment", minimum: 2, maximum: 10, marker: 5, staleAfterDays: 90 },
  { key: "credit", label: "Credit", seriesId: "DRTSCILM", seriesLabel: "SLOOS · net % tightening", minimum: -30, maximum: 60, marker: 0, staleAfterDays: 180 },
];

/** Existing classification wording/thresholds; trend inference is PR 4 scope. */
function classify(key: AxisRead["key"], value: number): Pick<AxisRead, "verdict" | "tone"> {
  switch (key) {
    case "inflation":
      if (value <= 2.2) return { verdict: "At or below Fed target. Disinflation complete.", tone: "green" };
      if (value <= 3.3) return { verdict: "Above target, trending down. Disinflating.", tone: "gold" };
      return { verdict: "Well above target. Inflationary regime intact.", tone: "red" };
    case "money":
      if (value < 2) return { verdict: "Below neutral. Loose policy.", tone: "blue" };
      if (value <= 3.5) return { verdict: "Near neutral. Roughly balanced.", tone: "gold" };
      return { verdict: "Above neutral. Restrictive but easing.", tone: "red" };
    case "labor":
      if (value < 4.5) return { verdict: "Below long-run average. Labor still firm.", tone: "green" };
      if (value < 5.5) return { verdict: "Near long-run average. Loosening.", tone: "gold" };
      return { verdict: "Above long-run average. Slack opening up.", tone: "red" };
    case "credit":
      if (value < 0) return { verdict: "Banks net-easing C&I standards. Credit cycle expansionary.", tone: "blue" };
      if (value <= 20) return { verdict: "Standards near neutral. No clear credit signal either way.", tone: "gold" };
      return { verdict: "Banks net-tightening. Credit cycle contractionary; watch for spillovers.", tone: "red" };
  }
}

function readAxis(definition: AxisDefinition, series: FredSeries): AxisRead {
  const { key, minimum, maximum, marker, ...labels } = definition;
  const observation = key === "inflation" ? yoyChange(series.observations) : latest(series.observations);
  const base: AxisRead = { ...labels, key, unit: "%", markerPct: (marker - minimum) / (maximum - minimum) * 100,
    source: "unavailable", status: "unavailable", value: null, fillPct: null, asOf: "—", tone: "gold",
    verdict: key === "inflation" ? "Unavailable: a valid index and its prior-year comparison are required." : "Unavailable: no valid observation.",
    observationDate: null, observationAgeDays: null, freshness: "unavailable",
    checkedAt: series.checkedAt, fallbackReason: series.fallbackReason };
  if (!observation || observation.value === null || !Number.isFinite(observation.value) || series.source === "unavailable") return base;
  const age = Math.max(0, Math.floor((Date.parse(series.checkedAt) - Date.parse(observation.date + "T00:00:00Z")) / 86_400_000));
  return { ...base, ...classify(key, observation.value), source: series.source, status: "available",
    value: Number(observation.value.toFixed(1)), fillPct: Math.max(2, Math.min(98, (observation.value - minimum) / (maximum - minimum) * 100)),
    asOf: new Date(observation.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
    observationDate: observation.date, observationAgeDays: age, freshness: age > definition.staleAfterDays ? "stale" : "recent" };
}

function composite(axes: AxisRead[]): RegimeRead["composite"] {
  const inflation = axes.find((axis) => axis.key === "inflation")?.value ?? null;
  const money = axes.find((axis) => axis.key === "money")?.value ?? null;
  const labor = axes.find((axis) => axis.key === "labor")?.value ?? null;
  const credit = axes.find((axis) => axis.key === "credit")?.value ?? null;
  const available = axes.filter((axis) => axis.status === "available").length;
  const confirming = Number(inflation !== null && inflation <= 3.3) + Number(money !== null && money > 3.5) +
    Number(labor !== null && labor < 5) + Number(credit !== null && credit < 0);
  const detail = `${available} of 4 indicators available. Sources and observation periods can differ; the count reflects the existing illustrative theme, not a blended index.`;
  if (available !== 4) return { headline: available === 0 ? "Data unavailable" : "Incomplete indicator snapshot", detail, confirming, of: 4 };
  const inflationWord = inflation! > 3.3 ? "inflationary" : inflation! > 2.2 ? "disinflating" : "at target";
  const moneyWord = money! > 3.5 ? "post-restrictive" : money! < 2 ? "loose" : "near-neutral";
  const laborWord = labor! < 4.5 ? "labor still firm" : labor! < 5.5 ? "labor loosening" : "slack opening";
  const creditWord = credit! > 20 ? "credit tightening" : credit! < 0 ? "credit easing" : "credit neutral";
  return { headline: `${inflationWord} · ${moneyWord} · ${laborWord} · ${creditWord}`, detail, confirming, of: 4 };
}

export async function getRegimeRead(): Promise<RegimeRead> {
  const series = await Promise.all([
    fetchFredSeries("CPIAUCSL", CPI_FALLBACK, 18, { requireYoy: true }),
    fetchFredSeries("FEDFUNDS", FEDFUNDS_FALLBACK, 6),
    fetchFredSeries("UNRATE", UNRATE_FALLBACK, 6),
    fetchFredSeries("DRTSCILM", SLOOS_FALLBACK, 6),
  ]);
  const axes = DEFINITIONS.map((definition, index) => readAxis(definition, series[index]));
  const sources = new Set(axes.map((axis) => axis.source));
  const sourceSummary = sources.size > 1 ? "mixed" : axes[0].source;
  return { axes, composite: composite(axes), fetchedAt: new Date().toISOString(),
    liveAny: axes.some((axis) => axis.source === "fred"), sourceSummary };
}
