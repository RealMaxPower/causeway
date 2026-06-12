/**
 * Fiscal basics (E1).
 *
 * Project a country's debt-to-GDP path from the three numbers the node names:
 * the interest rate it pays (r), how fast it grows (g), and its primary
 * balance (surplus +, deficit −, as % of GDP). The recursion is the standard
 * debt dynamics identity:
 *
 *   d_{t+1} = (1+r)/(1+g) · d_t − primaryBalance
 *
 * The whole lesson is r vs g: when g > r, debt erodes itself toward a finite
 * level even with deficits; when r > g, it compounds unless surpluses offset
 * it. Pure compute.
 */

const HORIZON = 30; // years

export interface Inputs {
  /** Effective interest rate on debt (%). */
  r: number;
  /** Nominal GDP growth (%). */
  g: number;
  /** Primary balance, % of GDP. Surplus positive, deficit negative. */
  pb: number;
  /** Starting debt-to-GDP (%). */
  d0: number;
}

export const DEFAULT_INPUTS: Inputs = { r: 3, g: 4, pb: -2, d0: 100 };

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  inputs: Inputs;
}

export const PRESETS: Preset[] = [
  {
    id: "moderation",
    name: "Growth beats rates",
    blurb: "Growth above the interest rate (the 1990s–2010s regime). Even running a steady primary deficit, debt/GDP drifts down to a finite level and stays there. Deficits are sustainable when g > r.",
    inputs: { r: 3, g: 4.5, pb: -2, d0: 100 },
  },
  {
    id: "snowball",
    name: "The snowball (r > g)",
    blurb: "Rates above growth, still running a deficit. Now the ratio compounds — every year's interest bill outruns the economy. Debt/GDP rises without limit. This is the post-2022 worry.",
    inputs: { r: 5, g: 2, pb: -2, d0: 100 },
  },
  {
    id: "austerity",
    name: "Austerity buys stability",
    blurb: "Same hostile r > g, but a large primary surplus. Surpluses can stabilise even a snowball — at the cost of the spending or taxes that produce them.",
    inputs: { r: 5, g: 2, pb: 3, d0: 100 },
  },
  {
    id: "postwar",
    name: "Post-war debt melt",
    blurb: "Very high nominal growth (partly inflation), rates held below it. A huge starting debt erodes itself fast — how the US and UK shed their WWII debt without ever 'repaying' it.",
    inputs: { r: 2, g: 7, pb: -1, d0: 240 },
  },
];

export interface Result {
  path: { year: number; debt: number }[];
  final: number;
  /** Finite steady-state debt/GDP if it converges, else null (explosive). */
  steadyState: number | null;
  /** Primary balance that would hold debt flat at d0 (%). */
  stabilizingPB: number;
  rMinusG: number;
  read: { tone: "green" | "gold" | "red"; label: string; verdict: string };
}

export function compute(inputs: Inputs): Result {
  const r = inputs.r / 100;
  const g = inputs.g / 100;
  const factor = (1 + r) / (1 + g);

  const path: { year: number; debt: number }[] = [{ year: 0, debt: inputs.d0 }];
  let d = inputs.d0;
  for (let t = 1; t <= HORIZON; t++) {
    d = factor * d - inputs.pb;
    if (d < 0) d = 0;
    path.push({ year: t, debt: d });
  }

  const rMinusG = inputs.r - inputs.g;
  // Steady state exists when g > r (factor < 1): d* = pb / (1 − factor) ... with our sign, solve d = factor·d − pb.
  const converges = factor < 1;
  const steadyState = converges ? -inputs.pb / (1 - factor) : null;
  // Primary balance that holds debt flat at d0: d0 = factor·d0 − pb → pb = (factor − 1)·d0.
  const stabilizingPB = (factor - 1) * inputs.d0;

  let read: Result["read"];
  if (rMinusG < -0.3) {
    read = {
      tone: "green",
      label: "growth wins (g > r)",
      verdict:
        steadyState !== null && steadyState >= 0
          ? `Growth outruns interest, so debt/GDP gravitates to about ${Math.round(steadyState)}% and stays there — sustainable even with a deficit.`
          : "Growth outruns interest, so debt erodes itself toward a finite level even while you borrow.",
    };
  } else if (rMinusG > 0.3) {
    const stabilized = inputs.pb >= stabilizingPB;
    read = {
      tone: stabilized ? "gold" : "red",
      label: stabilized ? "snowball, held" : "snowball (r > g)",
      verdict: stabilized
        ? `Interest beats growth, but your primary surplus exceeds the ${stabilizingPB.toFixed(1)}% needed to hold debt flat — so the snowball is contained, for now.`
        : `Interest beats growth and the deficit feeds it: debt/GDP compounds upward. Holding it flat would take a primary balance of about ${stabilizingPB.toFixed(1)}% of GDP — far above where you are.`,
    };
  } else {
    read = {
      tone: "gold",
      label: "knife's edge (r ≈ g)",
      verdict:
        "Interest and growth are roughly equal, so debt drifts almost linearly with the primary balance — no compounding either way. Small changes in either rate tip it.",
    };
  }

  return { path, final: path[path.length - 1].debt, steadyState, stabilizingPB, rMinusG, read };
}

export function fmtPct(n: number): string {
  return `${Math.round(n)}%`;
}
