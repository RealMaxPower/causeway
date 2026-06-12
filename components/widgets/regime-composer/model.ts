/**
 * Regime composer (H1).
 *
 * Hypothetical version of /regime — dial four axes (inflation, fed funds,
 * unemployment, credit) by hand and see the composite read the dashboard
 * would produce. Same thresholds as lib/data/regime.ts so the two surfaces
 * stay consistent.
 *
 * Pure compute. No FRED, no SSR, no DOM.
 */

export type AxisKey = "inflation" | "money" | "labor" | "credit";
export type AxisSignal = "loose" | "neutral" | "tight";

export interface AxisRead {
  key: AxisKey;
  label: string;
  /** Reading in the natural units of the axis. */
  value: number;
  unit: string;
  signal: AxisSignal;
  verdict: string;
  /** Whether this reading confirms the dominant theme. */
  confirms: boolean;
}

export interface Inputs {
  /** CPI YoY (%). */
  inflation: number;
  /** Fed funds rate (%). */
  fedFunds: number;
  /** Unemployment U-3 (%). */
  unemployment: number;
  /** SLOOS net % tightening — negative = easing, positive = tightening. */
  sloos: number;
}

export const DEFAULT_INPUTS: Inputs = {
  inflation: 2.5,
  fedFunds: 4.0,
  unemployment: 4.1,
  sloos: -3.0,
};

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  inputs: Inputs;
}

/**
 * Five hand-built historical scenarios for the user to load and walk.
 * Numbers are approximate readings of each regime; the point is teaching
 * the read, not precision recall.
 */
export const PRESETS: Preset[] = [
  {
    id: "current",
    name: "Now (2026)",
    blurb: "Disinflating, post-restrictive, labor still firm, credit easing — three of four axes confirm a soft-landing read.",
    inputs: DEFAULT_INPUTS,
  },
  {
    id: "2022",
    name: "2022 inflation surge",
    blurb: "Inflation well above target, Fed scrambling to catch up, labor near a multi-decade tight, credit beginning to tighten.",
    inputs: { inflation: 8.0, fedFunds: 2.5, unemployment: 3.6, sloos: 25 },
  },
  {
    id: "2009",
    name: "2009 trough",
    blurb: "Inflation gone, ZIRP, unemployment at 10%, credit collapsed. Four of four confirm a deep disinflationary downturn.",
    inputs: { inflation: 0.5, fedFunds: 0.2, unemployment: 10.0, sloos: 65 },
  },
  {
    id: "1979",
    name: "1979 stagflation",
    blurb: "High inflation, restrictive policy late, unemployment elevated, credit tightening. The classic mixed regime.",
    inputs: { inflation: 11.0, fedFunds: 11.0, unemployment: 6.0, sloos: 30 },
  },
  {
    id: "1998",
    name: "1998 'goldilocks'",
    blurb: "Inflation near target, neutral money, low unemployment, credit growth easy — the rare all-good regime.",
    inputs: { inflation: 2.2, fedFunds: 5.0, unemployment: 4.5, sloos: -10 },
  },
];

/* -------------------------- Axis readers -------------------------- */

function readInflation(value: number): { signal: AxisSignal; verdict: string } {
  if (value <= 2.2) return { signal: "loose", verdict: "At or below Fed target. Disinflation complete." };
  if (value <= 3.3) return { signal: "neutral", verdict: "Above target, trending down. Disinflating." };
  return { signal: "tight", verdict: "Well above target. Inflationary regime intact." };
}

function readMoney(value: number): { signal: AxisSignal; verdict: string } {
  if (value < 2) return { signal: "loose", verdict: "Below neutral. Loose policy." };
  if (value <= 3.5) return { signal: "neutral", verdict: "Near neutral. Roughly balanced." };
  return { signal: "tight", verdict: "Above neutral. Restrictive policy." };
}

function readLabor(value: number): { signal: AxisSignal; verdict: string } {
  if (value < 4.5) return { signal: "tight", verdict: "Below long-run average. Labor still firm." };
  if (value < 5.5) return { signal: "neutral", verdict: "Near long-run average. Loosening." };
  return { signal: "loose", verdict: "Above long-run average. Slack opening up." };
}

function readCredit(value: number): { signal: AxisSignal; verdict: string } {
  if (value < 0) return { signal: "loose", verdict: "Banks net-easing standards. Credit cycle expansionary." };
  if (value <= 20) return { signal: "neutral", verdict: "Standards near neutral. No clear credit signal." };
  return { signal: "tight", verdict: "Banks net-tightening. Credit cycle contractionary." };
}

/* -------------------------- Composite -------------------------- */

export interface RegimeRead {
  axes: AxisRead[];
  /** Number of axes confirming the dominant theme. */
  confirming: number;
  total: number;
  /** Four-word headline. */
  headline: string;
  /** One-line interpretation keyed to confidence. */
  confidence: string;
}

export function compose(inputs: Inputs): RegimeRead {
  const inflationRead = readInflation(inputs.inflation);
  const moneyRead = readMoney(inputs.fedFunds);
  const laborRead = readLabor(inputs.unemployment);
  const creditRead = readCredit(inputs.sloos);

  // Theme: "disinflating, post-restrictive, labor still firm, credit easing"
  // — a soft-landing read. Count which axes confirm.
  const inflationConfirms = inputs.inflation <= 3.3;
  const moneyConfirms = inputs.fedFunds > 3.5;
  const laborConfirms = inputs.unemployment < 5;
  const creditConfirms = inputs.sloos < 0;

  const axes: AxisRead[] = [
    {
      key: "inflation",
      label: "Inflation (CPI YoY)",
      value: round1(inputs.inflation),
      unit: "%",
      signal: inflationRead.signal,
      verdict: inflationRead.verdict,
      confirms: inflationConfirms,
    },
    {
      key: "money",
      label: "Money (Fed funds)",
      value: round1(inputs.fedFunds),
      unit: "%",
      signal: moneyRead.signal,
      verdict: moneyRead.verdict,
      confirms: moneyConfirms,
    },
    {
      key: "labor",
      label: "Labor (U-3 unemployment)",
      value: round1(inputs.unemployment),
      unit: "%",
      signal: laborRead.signal,
      verdict: laborRead.verdict,
      confirms: laborConfirms,
    },
    {
      key: "credit",
      label: "Credit (SLOOS net % tightening)",
      value: round1(inputs.sloos),
      unit: "%",
      signal: creditRead.signal,
      verdict: creditRead.verdict,
      confirms: creditConfirms,
    },
  ];

  const confirming = axes.filter((a) => a.confirms).length;

  const headline = [
    inflationConfirms
      ? inputs.inflation > 2.2 ? "disinflating" : "at target"
      : "inflationary",
    moneyConfirms
      ? "post-restrictive"
      : inputs.fedFunds < 2 ? "loose" : "near-neutral",
    laborConfirms
      ? "labor firm"
      : inputs.unemployment < 5.5 ? "labor loosening" : "slack opening",
    creditConfirms
      ? "credit easing"
      : inputs.sloos > 20 ? "credit tightening" : "credit neutral",
  ].join(" · ");

  const confidence =
    confirming >= 3
      ? "High-confidence regime read. Three or more axes confirm a single theme."
      : confirming === 2
        ? "Turning point. The axes don't agree; the playbook will need a re-read."
        : confirming === 1
          ? "Mixed signals. One axis confirms a soft-landing read; the rest don't. Treat as a transitional regime."
          : "No axis confirms a soft-landing read. The dominant theme may be different — re-read the headline and decide what it points to.";

  return { axes, confirming, total: 4, headline, confidence };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function signalTone(s: AxisSignal): "red" | "gold" | "green" {
  switch (s) {
    case "tight": return "red";
    case "neutral": return "gold";
    case "loose": return "green";
  }
}
