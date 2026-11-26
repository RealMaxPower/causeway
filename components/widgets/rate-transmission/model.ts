/**
 * Rate-transmission model (C5).
 *
 * Eight downstream channels each respond to a policy-rate change with
 * a characteristic lag (months) and elasticity. A smooth logistic ramp
 * is centered at the lag so each channel reaches half its effect at t = lag.
 *
 * Pure — no DOM, no globals, no state.
 */

export interface Channel {
  id: string;
  label: string;
  /** Months to half of the unconstrained long-run response, not its peak. */
  lag: number;
  /** Sensitivity to a 1.00 (100bp) policy move; positive = rises with hikes. */
  elast: number;
  base: number;
  unit: "%" | "bp" | "";
  fmt: number;
  /** Optional level floor for a channel whose linear response can cross zero. */
  floor?: number;
}

export const HORIZON = 24;
export const DEFAULT_DELTA_BP = -100;
export const DEFAULT_MONTH = 6;
export const MODEL_ASSUMPTIONS =
  "Illustrative counterfactual: a one-off, persistent policy-rate shift relative to an unchanged-policy baseline, with other shocks held fixed. Levels, sensitivities and lags are teaching assumptions. A cut during a recession can coincide with widening spreads; this model isolates the policy contribution. Spreads are floored at 0bp. The response midpoint marks half of the unconstrained response, not its peak.";

export const CHANNELS: Channel[] = [
  { id: "shortrate", label: "Short rates (3mo T-bill)", lag: 0,  elast:  0.95, base: 4.40, unit: "%",  fmt: 2 },
  { id: "tenY",      label: "10-yr Treasury",            lag: 1,  elast:  0.45, base: 4.20, unit: "%",  fmt: 2 },
  { id: "mortgage",  label: "30-yr mortgage",            lag: 2,  elast:  0.55, base: 6.80, unit: "%",  fmt: 2 },
  { id: "creditspr", label: "HY credit spreads",         lag: 3,  elast: 120,   base: 320,  unit: "bp", fmt: 0, floor: 0 },
  { id: "equities",  label: "S&P 500 (100 = baseline)",  lag: 6,  elast: -2.5,  base: 100,  unit: "",   fmt: 1 },
  { id: "usd",       label: "USD index (DXY)",           lag: 4,  elast:  3.5,  base: 104,  unit: "",   fmt: 1 },
  { id: "unemp",     label: "Unemployment",              lag: 14, elast:  0.10, base: 4.10, unit: "%",  fmt: 2 },
  { id: "cpi",       label: "Core CPI YoY",              lag: 18, elast: -0.20, base: 2.60, unit: "%",  fmt: 2 },
];

/** Channel value at time t given a policy delta in percentage-points (deltaPct = bp/100). */
export function pathFor(c: Channel, deltaPct: number, t: number): number {
  const k = 0.45;
  const ramp = 1 / (1 + Math.exp(-k * (t - c.lag)));
  // Isolated easing compresses spreads; tightening widens them. Other shocks
  // can outweigh this contribution. Coefficients are illustrative, not fitted.
  // https://www.federalreserve.gov/econres/feds/firm-financial-conditions-and-the-transmission-of-monetary-policy.htm
  const unconstrained = c.base + c.elast * deltaPct * ramp;
  return c.floor === undefined ? unconstrained : Math.max(c.floor, unconstrained);
}

/** Read the isolated policy contribution, not a prediction of observed levels. */
export function readingAt(deltaBp: number, t: number): string {
  if (deltaBp === 0) return "No policy change in this counterfactual. All channels stay at the illustrative baseline.";
  const hike = deltaBp > 0;
  const prefix = hike ? "Hike scenario: " : "Cut scenario: ";
  if (t < 3) return prefix + (hike
    ? "short rates are higher and mortgage rates are rising. Labour and inflation responses are still small."
    : "short rates are lower and mortgage rates are falling. Labour and inflation responses are still small.");
  if (t < 9) return prefix + (hike
    ? "tighter financial conditions. Credit spreads widen, the dollar strengthens, and equities fall relative to baseline."
    : "easier financial conditions. Credit spreads narrow, the dollar weakens, and equities rise relative to baseline.");
  if (t < 15) return prefix + (hike
    ? "demand weakens and unemployment starts to rise relative to baseline. Inflation responds later."
    : "demand strengthens and unemployment starts to fall relative to baseline. Inflation responds later.");
  return prefix + (hike
    ? "unemployment is higher and inflation lower than the unchanged-policy baseline. The inflation adjustment is still building."
    : "unemployment is lower and inflation higher than the unchanged-policy baseline. The inflation adjustment is still building.");
}
