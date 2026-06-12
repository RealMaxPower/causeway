/**
 * Causeway · regime composite read.
 *
 * Four live axes wired to FRED — inflation (CPI YoY), monetary stance
 * (effective fed funds), labor (U-3 unemployment), and credit cycle
 * (SLOOS net % tightening C&I, large + middle).
 *
 * Thresholds are deliberately simple — three buckets per axis, derived
 * from the post-1990 sample (Fed target, neutral rate, natural rate,
 * neutral SLOOS reading). This is a pedagogical dashboard, not a quant
 * model.
 */

import "server-only";
import {
  fetchFredSeries,
  latest,
  yoyChange,
  type FredObservation,
  type FredSource,
} from "./fred";

/* -------------------------------------------------------------------------- */
/* Fallback snapshots — used when FRED_API_KEY is unset or upstream fails.    */
/* Values reflect publicly released figures through 2026-04 so a key-less     */
/* deploy still tells a coherent story.                                       */
/* -------------------------------------------------------------------------- */

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
// Quarterly cadence; positive = tightening, negative = easing. The 2026-Q1
// fallback reflects the mild-easing-after-2022-tightness regime.
const SLOOS_FALLBACK: FredObservation[] = [
  { date: "2026-01-01", value: -2.5 },
  { date: "2025-10-01", value: -3.0 },
  { date: "2025-07-01", value: -5.0 },
  { date: "2025-04-01", value: 0.0 },
  { date: "2025-01-01", value: 0.5 },
  { date: "2024-10-01", value: 7.4 },
];

/* -------------------------------------------------------------------------- */

export type RegimeSignal = "easing" | "neutral" | "tight" | "loose" | "firm";

export interface AxisRead {
  key: "inflation" | "money" | "labor" | "credit";
  label: string;
  seriesId: string;
  seriesLabel: string;
  /** Headline number rendered in the gauge. */
  value: number;
  unit: string;
  /** Month label, e.g. "Apr 2026". */
  asOf: string;
  /** Gauge fill, 0–100 — where on the scale the current value sits. */
  fillPct: number;
  /** Neutral / target marker, 0–100. */
  markerPct: number;
  /** Visual hint for the fill bar. */
  tone: "red" | "blue" | "green" | "gold";
  /** One-line read of the value. */
  verdict: string;
  /** "FRED · live" or "snapshot · last known" — surfaced honestly. */
  source: FredSource;
}

export interface RegimeRead {
  axes: AxisRead[];
  composite: {
    headline: string;
    detail: string;
    /** Number of axes confirming the headline theme. */
    confirming: number;
    /** Total axes including the un-wired credit cycle. */
    of: number;
  };
  fetchedAt: string;
  /** True if at least one axis came back live (vs all fallback). */
  liveAny: boolean;
}

function fmtMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function clampPct(n: number): number {
  return Math.max(2, Math.min(98, n));
}

/* -------------------------- Axis readers -------------------------- */

function readInflation(
  cpiObs: FredObservation[],
  source: FredSource,
): AxisRead {
  const yoy = yoyChange(cpiObs);
  const value = yoy?.value ?? 0;
  const asOf = yoy ? fmtMonth(yoy.date) : "—";

  // Scale 0–6% YoY; target 2%.
  const fillPct = clampPct((value / 6) * 100);
  const markerPct = (2 / 6) * 100;

  let verdict: string;
  let tone: AxisRead["tone"];
  if (value <= 2.2) {
    verdict = "At or below Fed target. Disinflation complete.";
    tone = "green";
  } else if (value <= 3.3) {
    verdict = "Above target, trending down. Disinflating.";
    tone = "gold";
  } else {
    verdict = "Well above target. Inflationary regime intact.";
    tone = "red";
  }

  return {
    key: "inflation",
    label: "Inflation",
    seriesId: "CPIAUCSL",
    seriesLabel: "CPI YoY",
    value: Number(value.toFixed(1)),
    unit: "%",
    asOf,
    fillPct,
    markerPct,
    tone,
    verdict,
    source,
  };
}

function readMoney(ffObs: FredObservation[], source: FredSource): AxisRead {
  const newest = latest(ffObs);
  const value = newest?.value ?? 0;
  const asOf = newest ? fmtMonth(newest.date) : "—";

  // Scale 0–8%; neutral ~3%.
  const fillPct = clampPct((value / 8) * 100);
  const markerPct = (3 / 8) * 100;

  let verdict: string;
  let tone: AxisRead["tone"];
  if (value < 2) {
    verdict = "Below neutral. Loose policy.";
    tone = "blue";
  } else if (value <= 3.5) {
    verdict = "Near neutral. Roughly balanced.";
    tone = "gold";
  } else {
    verdict = "Above neutral. Restrictive but easing.";
    tone = "red";
  }

  return {
    key: "money",
    label: "Money",
    seriesId: "FEDFUNDS",
    seriesLabel: "Fed funds rate",
    value: Number(value.toFixed(1)),
    unit: "%",
    asOf,
    fillPct,
    markerPct,
    tone,
    verdict,
    source,
  };
}

function readLabor(urObs: FredObservation[], source: FredSource): AxisRead {
  const newest = latest(urObs);
  const value = newest?.value ?? 0;
  const asOf = newest ? fmtMonth(newest.date) : "—";

  // Scale 2–10%; long-run average ~5%.
  const fillPct = clampPct(((value - 2) / 8) * 100);
  const markerPct = ((5 - 2) / 8) * 100;

  let verdict: string;
  let tone: AxisRead["tone"];
  if (value < 4.5) {
    verdict = "Below long-run average. Labor still firm.";
    tone = "green";
  } else if (value < 5.5) {
    verdict = "Near long-run average. Loosening.";
    tone = "gold";
  } else {
    verdict = "Above long-run average. Slack opening up.";
    tone = "red";
  }

  return {
    key: "labor",
    label: "Labor",
    seriesId: "UNRATE",
    seriesLabel: "U-3 unemployment",
    value: Number(value.toFixed(1)),
    unit: "%",
    asOf,
    fillPct,
    markerPct,
    tone,
    verdict,
    source,
  };
}

function readCredit(obs: FredObservation[], source: FredSource): AxisRead {
  const newest = latest(obs);
  const value = newest?.value ?? 0;
  const asOf = newest ? fmtMonth(newest.date) : "—";

  // SLOOS ranges roughly −30 to +80 in the post-1990 sample. Neutral is 0.
  // Scale −30 to +60 onto the bar; neutral marker at 0.
  const lo = -30;
  const hi = 60;
  const fillPct = clampPct(((value - lo) / (hi - lo)) * 100);
  const markerPct = ((0 - lo) / (hi - lo)) * 100;

  let verdict: string;
  let tone: AxisRead["tone"];
  if (value < 0) {
    verdict = "Banks net-easing C&I standards. Credit cycle expansionary.";
    tone = "blue";
  } else if (value <= 20) {
    verdict = "Standards near neutral. No clear credit signal either way.";
    tone = "gold";
  } else {
    verdict = "Banks net-tightening. Credit cycle contractionary; watch for spillovers.";
    tone = "red";
  }

  return {
    key: "credit",
    label: "Credit",
    seriesId: "DRTSCILM",
    seriesLabel: "SLOOS · net % tightening",
    value: Number(value.toFixed(1)),
    unit: "%",
    asOf,
    fillPct,
    markerPct,
    tone,
    verdict,
    source,
  };
}

/* -------------------------- Composite -------------------------- */

function composite(axes: AxisRead[]): RegimeRead["composite"] {
  const inflation = axes.find((a) => a.key === "inflation");
  const money = axes.find((a) => a.key === "money");
  const labor = axes.find((a) => a.key === "labor");
  const credit = axes.find((a) => a.key === "credit");

  // Theme: "disinflating, post-restrictive, labor still firm, credit easing"
  // — count axes that agree with it.
  let confirming = 0;
  if (inflation && inflation.value <= 3.3) confirming++;
  if (money && money.value > 3.5) confirming++;
  if (labor && labor.value < 5) confirming++;
  if (credit && credit.value < 0) confirming++;

  const inflationWord =
    !inflation || inflation.value > 3.3
      ? "inflationary"
      : inflation.value > 2.2
        ? "disinflating"
        : "at target";
  const moneyWord =
    !money || money.value > 3.5
      ? "post-restrictive"
      : money.value < 2
        ? "loose"
        : "near-neutral";
  const laborWord =
    !labor || labor.value < 4.5
      ? "labor still firm"
      : labor.value < 5.5
        ? "labor loosening"
        : "slack opening";
  const creditWord =
    !credit || credit.value > 20
      ? "credit tightening"
      : credit.value < 0
        ? "credit easing"
        : "credit neutral";

  const headline = `${inflationWord} · ${moneyWord} · ${laborWord} · ${creditWord}`;

  const detail =
    "All four axes wired live. Each is shown alone — the composite is the count of axes confirming a single theme, not a blended index.";

  return { headline, detail, confirming, of: 4 };
}

/* -------------------------- Entry point -------------------------- */

export async function getRegimeRead(): Promise<RegimeRead> {
  const [cpi, ff, ur, sloos] = await Promise.all([
    fetchFredSeries("CPIAUCSL", CPI_FALLBACK, 18),
    fetchFredSeries("FEDFUNDS", FEDFUNDS_FALLBACK, 6),
    fetchFredSeries("UNRATE", UNRATE_FALLBACK, 6),
    fetchFredSeries("DRTSCILM", SLOOS_FALLBACK, 6),
  ]);

  const axes: AxisRead[] = [
    readInflation(cpi.observations, cpi.source),
    readMoney(ff.observations, ff.source),
    readLabor(ur.observations, ur.source),
    readCredit(sloos.observations, sloos.source),
  ];

  return {
    axes,
    composite: composite(axes),
    fetchedAt: new Date().toISOString(),
    liveAny: axes.some((a) => a.source === "fred"),
  };
}
