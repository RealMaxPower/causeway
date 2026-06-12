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
  /** Months from policy change to half-effect. */
  lag: number;
  /** Sensitivity to a 1.00 (100bp) policy move; positive = rises with hikes. */
  elast: number;
  base: number;
  unit: "%" | "bp" | "";
  fmt: number;
}

export const HORIZON = 24;

export const CHANNELS: Channel[] = [
  { id: "shortrate", label: "Short rates (3mo T-bill)", lag: 0,  elast:  0.95, base: 4.40, unit: "%",  fmt: 2 },
  { id: "tenY",      label: "10-yr Treasury",            lag: 1,  elast:  0.45, base: 4.20, unit: "%",  fmt: 2 },
  { id: "mortgage",  label: "30-yr mortgage",            lag: 2,  elast:  0.55, base: 6.80, unit: "%",  fmt: 2 },
  { id: "creditspr", label: "HY credit spreads",         lag: 3,  elast: -120,  base: 320,  unit: "bp", fmt: 0 },
  { id: "equities",  label: "S&P 500 (idx, 100 = now)",  lag: 6,  elast: -2.5,  base: 100,  unit: "",   fmt: 1 },
  { id: "usd",       label: "USD index (DXY)",           lag: 4,  elast:  3.5,  base: 104,  unit: "",   fmt: 1 },
  { id: "unemp",     label: "Unemployment",              lag: 14, elast:  0.10, base: 4.10, unit: "%",  fmt: 2 },
  { id: "cpi",       label: "Core CPI YoY",              lag: 18, elast: -0.20, base: 2.60, unit: "%",  fmt: 2 },
];

/** Channel value at time t given a policy delta in percentage-points (deltaPct = bp/100). */
export function pathFor(c: Channel, deltaPct: number, t: number): number {
  const k = 0.45;
  const ramp = 1 / (1 + Math.exp(-k * (t - c.lag)));
  return c.base + c.elast * deltaPct * ramp;
}

export function readingAt(delta: number, t: number): string {
  if (delta === 0) return "No change. Everything sits at baseline.";
  if (t < 3) return "Front of the curve has moved. Mortgages following. The real economy hasn't noticed.";
  if (t < 9) return "Financial conditions have eased into the real economy. Credit and FX repriced; equities ahead of fundamentals.";
  if (t < 15) return "Goods-and-services demand catching up. Labor market is the lagging indicator.";
  return "Full transmission. Inflation finally responding — usually after the headlines say the policy didn't work.";
}
