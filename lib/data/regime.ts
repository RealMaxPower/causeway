/** Independently observed levels, dated changes, and explicitly limited interpretations. */
import "server-only";
import { classifyLevel, type AxisKey, type AxisLevel, type AxisTone } from "@/lib/regime-classification";
export type { AxisLevel } from "@/lib/regime-classification";
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

export interface AxisTrend {
  direction: "rising" | "falling" | "unchanged" | "unknown";
  change: number | null;
  fromDate: string | null;
  toDate: string | null;
  label: string;
}
export interface AxisRead {
  key: AxisKey;
  label: string;
  seriesId: string;
  seriesLabel: string;
  value: number | null;
  unit: string;
  asOf: string;
  fillPct: number | null;
  markerPct: number;
  tone: AxisTone;
  verdict: string;
  level: AxisLevel;
  trend: AxisTrend;
  selectionNote: string | null;
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
  /** Coverage of displayed classifications, never confidence in a common cycle. */
  composite: { headline: string; detail: string; confirming: number; of: number; trendCoverage: number };
  implications: RegimeImplication[];
  /** Time this composite was assembled, not the provider's release time. */
  fetchedAt: string;
  /** Compatibility flag: at least one available FRED value, even if stale. */
  liveAny: boolean;
  sourceSummary: "fred" | "fallback" | "mixed" | "unavailable";
}

export interface RegimeImplication {
  axis: AxisRead["key"];
  href: string;
  title: string;
  line: string;
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


function period(date: string): string {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function unknownTrend(toDate: string | null): AxisTrend {
  return { direction: "unknown", change: null, fromDate: null, toDate,
    label: "Change unavailable: an exact preceding-period comparison is required." };
}

/** Compare adjacent calendar periods only; a gap is not evidence of a trend. */
function readTrend(key: AxisRead["key"], observation: { date: string; value: number }, rows: FredObservation[]): AxisTrend {
  const months = key === "credit" ? 3 : 1;
  const previousPeriod = new Date(observation.date + "T00:00:00Z");
  previousPeriod.setUTCMonth(previousPeriod.getUTCMonth() - months);
  if (previousPeriod.getUTCDate() !== Number(observation.date.slice(8))) return unknownTrend(observation.date);
  const fromDate = previousPeriod.toISOString().slice(0, 10);
  const previous = key === "inflation"
    ? yoyChange(rows.filter((row) => row.date <= fromDate))
    : latest(rows.filter((row) => row.date === fromDate));
  if (!previous || previous.date !== fromDate || previous.value === null) return unknownTrend(observation.date);
  const rawChange = observation.value - previous.value;
  if (!Number.isFinite(rawChange)) return unknownTrend(observation.date);
  // Ignore floating point noise in ratios, not economically small movements.
  const change = Math.abs(rawChange) < 1e-10 ? 0 : rawChange;
  const direction = change > 0 ? "rising" : change < 0 ? "falling" : "unchanged";
  const amount = Math.abs(change) < 0.01 ? "less than 0.01" : Math.abs(change).toFixed(2);
  const movement = change === 0 ? "Unchanged" : `${change > 0 ? "Up" : "Down"} ${amount} percentage points`;
  const subject = key === "inflation" ? "Annual CPI inflation" : key === "money" ? "Monthly effective rate" : key === "labor" ? "Unemployment rate" : "Net tightening share";
  return { direction, change, fromDate, toDate: observation.date,
    label: `${subject}: ${movement.toLowerCase()} from ${period(fromDate)} to ${period(observation.date)}. This describes two periods, not a forecast.` };
}

function readAxis(definition: AxisDefinition, series: FredSeries): AxisRead {
  const { key, minimum, maximum, marker, ...labels } = definition;
  const observation = key === "inflation" ? yoyChange(series.observations) : latest(series.observations);
  const base: AxisRead = { ...labels, key, unit: "%", markerPct: (marker - minimum) / (maximum - minimum) * 100,
    source: "unavailable", status: "unavailable", value: null, fillPct: null, asOf: "—", tone: "gold",
    verdict: key === "inflation" ? "Unavailable: a valid index and its prior-year comparison are required." : "Unavailable: no valid observation.",
    level: { band: "unavailable", label: "Unavailable", reference: classifyLevel(key, 0).level.reference },
    trend: unknownTrend(null), selectionNote: null,
    observationDate: null, observationAgeDays: null, freshness: "unavailable",
    checkedAt: series.checkedAt, fallbackReason: series.fallbackReason };
  if (!observation || observation.value === null || !Number.isFinite(observation.value) || series.source === "unavailable") return base;
  const age = Math.max(0, Math.floor((Date.parse(series.checkedAt) - Date.parse(observation.date + "T00:00:00Z")) / 86_400_000));
  const newestPeriod = series.observations.reduce((date, row) => row.date > date ? row.date : date, observation.date);
  const selectionNote = newestPeriod > observation.date
    ? key === "inflation"
      ? `Using the latest complete annual comparison, ${period(observation.date)}. Newer periods through ${period(newestPeriod)} lack a usable exact prior-year pair.`
      : `Using the latest usable observation, ${period(observation.date)}. Newer periods through ${period(newestPeriod)} have no usable value.`
    : key === "inflation" ? "Annual change uses positive CPI indexes for the same month one year apart." : null;
  return { ...base, ...classifyLevel(key, observation.value), source: series.source, status: "available",
    value: observation.value, fillPct: Math.max(0, Math.min(100, (observation.value - minimum) / (maximum - minimum) * 100)),
    asOf: period(observation.date), trend: readTrend(key, { date: observation.date, value: observation.value }, series.observations), selectionNote,
    observationDate: observation.date, observationAgeDays: age, freshness: age > definition.staleAfterDays ? "stale" : "recent" };
}

function isCurrentEvidence(axis: AxisRead): boolean {
  return axis.status === "available" && axis.source === "fred" && axis.freshness === "recent";
}

function composite(axes: AxisRead[]): RegimeRead["composite"] {
  const available = axes.filter((axis) => axis.status === "available").length;
  const confirming = axes.filter(isCurrentEvidence).length;
  const trendCoverage = axes.filter((axis) => isCurrentEvidence(axis) && axis.trend.direction !== "unknown").length;
  const detail = `${available} of 4 indicators available; ${confirming} recent FRED readings support their displayed level classifications. ${trendCoverage} have adjacent-period comparisons. This is evidence coverage, not confidence in one economic cycle. The axes can point in different directions.`;
  let headline: string;
  if (!available) headline = "Data unavailable";
  else if (available < 4) headline = "Incomplete indicator snapshot";
  else if (axes.every((axis) => axis.source === "fallback")) headline = "Illustrative snapshot";
  else if (confirming < 4) headline = "Limited current evidence";
  else headline = axes.map((axis) => {
    const subject = axis.key === "credit" ? "net tightening share" : axis.key === "inflation" ? "annual rate" : "rate";
    return `${axis.level.label} (${axis.trend.direction === "unknown" ? "change unknown" : `${subject} ${axis.trend.direction}`})`;
  }).join(" · ");
  return { headline, detail, confirming, of: 4, trendCoverage };
}

/** Educational questions reuse each axis's classification and measured change. */
function implication(axis: AxisRead): RegimeImplication {
  const links = { inflation: "/nodes/H2", money: "/nodes/H3", labor: "/nodes/H4", credit: "/nodes/H7" };
  const base = { axis: axis.key, href: links[axis.key] };
  if (!isCurrentEvidence(axis)) return { ...base, title: `${axis.label}: current interpretation unavailable`,
    line: axis.source === "fallback" ? "This card uses a bundled illustration. Explore the mechanism in the lesson; the example does not establish current conditions."
      : axis.status === "unavailable" ? "There is no usable observation for this axis. A missing value provides no evidence of favorable or adverse conditions."
        : "This observation exceeds the display age threshold. Review a newer release before using it to describe current conditions." };
  const { band } = axis.level;
  const { direction } = axis.trend;
  let title: string;
  let line: string;
  switch (axis.key) {
    case "inflation":
      title = band === "below" ? "Examine falling prices and nominal debts" : band === "above" ? "Examine purchasing-power pressure" : "Compare price changes with household costs";
      line = band === "below" ? "A lower aggregate price index can increase the burden of a fixed nominal debt; individual prices and incomes can behave differently."
        : band === "above" ? "Annual CPI inflation is above this dashboard's reference band. Compare changes in income and expenses; CPI does not describe every household's basket."
          : "Inflation is in the lower teaching band. That does not mean prices have returned to earlier levels or that every expense is stable.";
      if (direction === "falling") line += " Annual inflation fell between the two periods; this alone does not mean the price level fell.";
      if (direction === "rising") line += " Annual inflation rose between the two periods; that does not establish a lasting acceleration.";
      break;
    case "money":
      title = band === "above" ? "Examine borrowing costs above the reference band" : band === "below" ? "Examine borrowing costs below the reference band" : "Compare actual rates with the reference band";
      line = "The reference is an assumption, not an observed neutral rate. Compare quoted borrowing and deposit rates, fees, and reset terms; the effective federal funds rate is not a household's rate.";
      if (direction === "falling") line += " The monthly effective rate fell; that does not guarantee lower mortgage rates or future cuts.";
      if (direction === "rising") line += " The monthly effective rate rose; examine how a rate reset could affect payments without assuming future hikes.";
      break;
    case "labor":
      title = band === "above" ? "Examine income resilience at higher unemployment" : band === "below" ? "Examine opportunities beyond the headline jobless rate" : "Compare national unemployment with local conditions";
      line = "The national unemployment band is illustrative. Job openings, participation, hours, and industry conditions add context that this one rate cannot provide.";
      if (direction === "rising") line += " Unemployment rose between the two months; consider how income variability affects recurring commitments.";
      if (direction === "falling") line += " Unemployment fell between the two months; that does not guarantee improved prospects in every occupation.";
      break;
    case "credit":
      title = band === "above" ? "Examine access to business credit under net tightening" : band === "below" ? "Examine terms under net easing of business credit" : "Examine individual loan terms despite a balanced survey";
      line = band === "above" ? "More surveyed banks reported tightening than easing C&I standards. Compare approval conditions, collateral, and refinancing terms."
        : band === "below" ? "More surveyed banks reported easing than tightening C&I standards. Easier standards do not guarantee approval or affordable financing."
          : "Net zero can hide banks moving in opposite directions. Review actual approval requirements and financing terms.";
      if (direction === "falling") line += " The net tightening share fell since the preceding quarter; its sign still determines net tightening versus net easing.";
      if (direction === "rising") line += " The net tightening share rose since the preceding quarter; its sign still determines net tightening versus net easing.";
      break;
  }
  if (direction === "unknown") line += " The preceding-period comparison is unavailable, so no direction of change is inferred.";
  if (direction === "unchanged") line += " The measured value is unchanged from the preceding period; this is not a forecast.";
  return { ...base, title, line };
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
  return { axes, composite: composite(axes), implications: axes.map(implication), fetchedAt: new Date().toISOString(),
    liveAny: axes.some((axis) => axis.source === "fred"), sourceSummary };
}
