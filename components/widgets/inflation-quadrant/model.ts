/**
 * Inflation-quadrant classifier (C4).
 *
 * Four driver inputs (0–100 each) → composite headline + 2×2 location.
 *   X-axis: demand-vs-supply origin (right = demand-led).
 *   Y-axis: anchor erosion (top = anchored, bottom = unanchored).
 *
 * Quadrants:
 *   TL (anchored × supply)  = Cost-push           → wait it out
 *   TR (anchored × demand)  = Demand-pull         → gentle hikes
 *   BL (unanchored × supply)= Fiscal-dominant     → fiscal consolidation
 *   BR (unanchored × demand)= Expectations-driven → aggressive credibility
 *
 * Pure — no DOM, no globals, no state.
 */

export type DriverKey = "demand" | "supply" | "expectations" | "fiscal";

export interface Driver {
  id: DriverKey;
  label: string;
  lo: string;
  hi: string;
  tone: string;
}

export const DRIVERS: Driver[] = [
  { id: "demand",       label: "Demand pressure",         lo: "Slack",    hi: "Overheating", tone: "var(--cw-red)" },
  { id: "supply",       label: "Supply shocks",           lo: "Calm",     hi: "Severe",      tone: "var(--gold-deep)" },
  { id: "expectations", label: "Expectations un-anchor",  lo: "Anchored", hi: "Drifting",    tone: "var(--cw-green)" },
  { id: "fiscal",       label: "Fiscal impulse",          lo: "Tight",    hi: "Dominant",    tone: "var(--cw-blue)" },
];

export type Drivers = Record<DriverKey, number>;

export interface Preset extends Drivers {
  name: string;
}

export const PRESETS: Preset[] = [
  { name: "Idle 2019",      demand: 30, supply: 15, expectations: 20, fiscal: 35 },
  { name: "2022 spike",     demand: 70, supply: 85, expectations: 55, fiscal: 80 },
  { name: "1970s stag",     demand: 45, supply: 75, expectations: 80, fiscal: 50 },
  { name: "1990s low",      demand: 40, supply: 25, expectations: 15, fiscal: 25 },
  { name: "Argentina 2024", demand: 55, supply: 60, expectations: 90, fiscal: 95 },
];

export interface Classification {
  headline: number;
  xPct: number;
  yPct: number;
  regime: string;
  cure: string;
  color: string;
  parts: {
    demandPull: number;
    costPush: number;
    expContrib: number;
    fiscalContrib: number;
  };
}

export function classify(d: Drivers): Classification {
  const demandPull = d.demand * 0.05;
  const costPush = d.supply * 0.04;
  const expContrib = d.expectations * 0.04;
  const fiscalContrib = d.fiscal * 0.045;
  const headline = +(demandPull + costPush + expContrib + fiscalContrib + 1.2).toFixed(1);

  const demandShare = d.demand / (d.demand + d.supply + 0.01);
  const xPct = demandShare * 100;
  const yPct = d.expectations * 0.6 + d.fiscal * 0.4;

  let regime: string;
  let cure: string;
  let color: string;

  if (yPct < 50 && xPct >= 50) {
    regime = "Demand-pull";
    color = "var(--cw-red)";
    cure =
      "Gentle, well-telegraphed rate hikes. Anchored expectations do most of the work.";
  } else if (yPct < 50 && xPct < 50) {
    regime = "Cost-push";
    color = "var(--gold-deep)";
    cure =
      "Wait it out. Supply-side policy where possible. Hiking rates into a supply shock destroys output without curing prices.";
  } else if (yPct >= 50 && xPct >= 50) {
    regime = "Expectations-driven";
    color = "var(--cw-green)";
    cure =
      "Aggressive credibility move — front-loaded hikes, hawkish guidance. Volcker-style. Recession is the price.";
  } else {
    regime = "Fiscal-dominant";
    color = "var(--cw-blue)";
    cure =
      "Monetary policy alone can't fix this. Requires fiscal consolidation or — historically — currency reform.";
  }

  return {
    headline,
    xPct,
    yPct,
    regime,
    cure,
    color,
    parts: { demandPull, costPush, expContrib, fiscalContrib },
  };
}
