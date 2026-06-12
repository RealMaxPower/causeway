/**
 * Counterfactual-2008 model.
 *
 * Pure compute. Given a deviation path (one value per quarter, in
 * percentage points relative to the Fed's actual rate), produce the
 * counterfactual unemployment, CPI, and growth paths via a simple
 * convolution against the C5 rate-transmission kernel.
 *
 * For each output channel we treat the user's deviation as a piecewise-
 * constant rate-path. The response at time t is the sum of step-change
 * contributions from every past step, weighted by the channel's
 * cumulative impulse-response (a logistic ramp keyed off C5's lag).
 *
 * Pedagogy, not forecast. The methodology drawer in the UI is meant
 * to make that explicit.
 */

import { BASELINE, N_QUARTERS, type QuarterPoint } from "./baseline";
import { CHANNELS } from "@/components/widgets/rate-transmission/model";

/** Map of channel id to its C5 entry, narrowed for our three outputs. */
const C5 = {
  unemp: CHANNELS.find((c) => c.id === "unemp")!,
  cpi: CHANNELS.find((c) => c.id === "cpi")!,
  // Growth doesn't have a direct C5 channel; we approximate it as the
  // negative-correlated short-term cost of tightening. Calibrated to
  // match the rough rule of thumb that +100bp persistent → ~−1pp annualised
  // growth at horizons 6-12 months.
  growth: { id: "growth", label: "Real GDP growth", lag: 8, elast: -1.0 },
};

export interface CounterfactualPoint {
  q: number;
  label: string;
  /** Counterfactual fed funds = baseline + deviation, clamped at 0%. */
  fedFunds: number;
  /** Counterfactual unemployment (%) — baseline + transmission response. */
  unemp: number;
  /** Counterfactual core CPI YoY (%). */
  cpi: number;
  /** Counterfactual real GDP growth (%). */
  growth: number;
  /** The user's specified deviation, in percentage points. */
  deviation: number;
}

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  /** 24 entries: percentage-point deviation per quarter. */
  deviation: number[];
}

/**
 * Pre-canned scenarios. The "actual" preset has zero deviation and
 * recovers the baseline path; the rest are intentionally provocative
 * counterfactuals from the literature.
 */
export const PRESETS: Preset[] = [
  {
    id: "actual",
    name: "What actually happened",
    blurb:
      "Baseline — the Fed's actual rate path. Everything moves to match the historical record.",
    deviation: Array(N_QUARTERS).fill(0),
  },
  {
    id: "cut-early",
    name: "Cut six months earlier",
    blurb:
      "Suppose the Fed had cut by 150bp starting in 2007Q3 instead of waiting through 2008Q1. The Bear Stearns warning signs were visible from August 2007.",
    deviation: shiftPath([0, 0, -1.5, -1.5, -0.5, 0], 0, N_QUARTERS),
  },
  {
    id: "cut-deeper",
    name: "Cut 200bp deeper at the trough",
    blurb:
      "Holding the timing constant but going to negative real rates faster — equivalent to credibly committing to overshoot inflation.",
    deviation: deeperCutPath(),
  },
  {
    id: "hold-zirp",
    name: "Hold ZIRP through 2014",
    blurb:
      "The Bernanke counterfactual: commit explicitly to zero rates for longer. No 2010 tapering signals; no 2011 hike rumours.",
    deviation: holdZirpPath(),
  },
  {
    id: "no-rescue",
    name: "Lehman-style policy throughout",
    blurb:
      "Hypothetical inverse: refuse all extraordinary support — no rate cuts beyond Taylor-rule. What was the price of intervention?",
    deviation: noRescuePath(),
  },
];

function shiftPath(window: number[], startQ: number, totalLen: number): number[] {
  const out = Array(totalLen).fill(0);
  for (let i = 0; i < window.length; i++) {
    const t = startQ + i;
    if (t >= 0 && t < totalLen) out[t] = window[i];
  }
  return out;
}

function deeperCutPath(): number[] {
  // Match the actual path through Q4 2008, then dip 200bp below from Q1 2009 to Q4 2010
  const out = Array(N_QUARTERS).fill(0);
  for (let q = 8; q <= 15; q++) out[q] = -2.0;
  for (let q = 16; q <= 19; q++) out[q] = -1.5;
  return out;
}

function holdZirpPath(): number[] {
  // Counterfactual diverges only when the Fed was at 0 anyway. Holding
  // ZIRP through 2014 means no implicit-hike signals through 2011-2012.
  // Approximate: shave 25-50bp off the 2011-12 average so financial
  // conditions don't tighten via signaling.
  const out = Array(N_QUARTERS).fill(0);
  for (let q = 16; q < N_QUARTERS; q++) out[q] = -0.25;
  return out;
}

function noRescuePath(): number[] {
  // Refusal to ease. Hold close to the Taylor-rule path: cut only modestly
  // through 2008, never below 2%. This is +200bp through the trough.
  const out = Array(N_QUARTERS).fill(0);
  for (let q = 7; q <= 19; q++) out[q] = 2.0;
  return out;
}

/**
 * Convolve a step-change deviation series against a logistic step-response
 * to get the cumulative output deviation at each quarter.
 */
function stepConvolve(
  deviation: number[],
  elast: number,
  lagMonths: number,
): number[] {
  const lagQ = lagMonths / 3;
  // C5 used k = 0.45 / month; convert to per-quarter.
  const k = 0.45 * 3;
  const n = deviation.length;
  const out = new Array<number>(n).fill(0);
  for (let t = 0; t < n; t++) {
    let acc = 0;
    for (let s = 0; s <= t; s++) {
      const stepChange = s === 0 ? deviation[0] : deviation[s] - deviation[s - 1];
      if (stepChange === 0) continue;
      const tau = t - s;
      const ramp = 1 / (1 + Math.exp(-k * (tau - lagQ)));
      acc += stepChange * ramp;
    }
    out[t] = elast * acc;
  }
  return out;
}

export interface CounterfactualResult {
  baseline: QuarterPoint[];
  counterfactual: CounterfactualPoint[];
  /** Cumulative unemployment-quarters above baseline (negative = improvement). */
  unemploymentGap: number;
  /** Average CPI deviation across the horizon (pp). */
  cpiGap: number;
  /** Cumulative growth gap across the horizon (pp · quarters, positive = better). */
  growthGap: number;
}

export function applyDeviation(deviation: number[]): CounterfactualResult {
  if (deviation.length !== N_QUARTERS) {
    throw new Error(`deviation must have ${N_QUARTERS} quarters`);
  }
  const unempResponse = stepConvolve(deviation, C5.unemp.elast, C5.unemp.lag);
  const cpiResponse = stepConvolve(deviation, C5.cpi.elast, C5.cpi.lag);
  const growthResponse = stepConvolve(deviation, C5.growth.elast, C5.growth.lag);

  const counterfactual: CounterfactualPoint[] = BASELINE.map((b, t) => {
    const fedFundsCF = Math.max(0, b.fedFunds + deviation[t]);
    return {
      q: b.q,
      label: b.label,
      fedFunds: fedFundsCF,
      unemp: b.unemp + unempResponse[t],
      cpi: b.cpi + cpiResponse[t],
      growth: b.growth + growthResponse[t],
      deviation: deviation[t],
    };
  });

  // Integrated gaps. Sign convention:
  //   unemploymentGap < 0 → counterfactual ran with lower unemployment (good)
  //   cpiGap > 0 → counterfactual ran hotter
  //   growthGap > 0 → counterfactual ran with more growth (good)
  const unemploymentGap = sum(unempResponse);
  const cpiGap = avg(cpiResponse);
  const growthGap = sum(growthResponse);

  return { baseline: BASELINE, counterfactual, unemploymentGap, cpiGap, growthGap };
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return sum(xs) / xs.length;
}

export function formatPp(n: number): string {
  const s = Math.abs(n) < 0.05 ? "0.0" : n.toFixed(1);
  return n > 0 ? `+${s}` : n < 0 ? `−${Math.abs(n).toFixed(1)}` : s;
}
