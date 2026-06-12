/**
 * Supply and demand, properly (B1).
 *
 * Linear demand and supply as distributions of willingness. Shift either
 * curve or change its elasticity and watch the equilibrium move — and, the
 * point of the node, watch the surplus areas: the inframarginal trades above
 * and below the clearing price are where the gains from trade actually live.
 *
 * Demand: P = a − b·Q   (a = choke price, b = slope; steeper = more inelastic)
 * Supply: P = c + d·Q   (c = lowest acceptable price, d = slope)
 *
 * Pure compute — no DOM, no I/O.
 */

const A0 = 100; // base demand choke price
const C0 = 20; // base supply intercept (lowest seller cost)

export interface Inputs {
  /** Shifts the demand curve up/down (a). */
  demandShift: number;
  /** Shifts the supply curve up/down — a cost shock (c). */
  supplyShift: number;
  /** Demand slope b: 0.3 = elastic/flat, 3 = inelastic/steep. */
  demandSlope: number;
  /** Supply slope d. */
  supplySlope: number;
}

export const DEFAULT_INPUTS: Inputs = {
  demandShift: 0,
  supplyShift: 0,
  demandSlope: 1,
  supplySlope: 1,
};

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  inputs: Inputs;
}

export const PRESETS: Preset[] = [
  {
    id: "balanced",
    name: "Balanced market",
    blurb: "Demand and supply with similar elasticities. Surplus splits roughly evenly between buyers and sellers, and a shock to either side moves price and quantity together.",
    inputs: { demandShift: 0, supplyShift: 0, demandSlope: 1, supplySlope: 1 },
  },
  {
    id: "demand-surge",
    name: "Demand surge",
    blurb: "Buyers' willingness jumps (a craze, a stimulus cheque). The demand curve shifts out: both price and quantity rise, and consumer surplus expands even as buyers pay more.",
    inputs: { demandShift: 28, supplyShift: 0, demandSlope: 1, supplySlope: 1 },
  },
  {
    id: "shock-inelastic",
    name: "Supply shock · inelastic demand",
    blurb: "Costs spike for a thing people can't easily stop buying (gas, insulin). Demand is steep, so the shock lands almost entirely on price — buyers eat it, and surplus shifts to sellers.",
    inputs: { demandShift: 0, supplyShift: 26, demandSlope: 2.6, supplySlope: 1 },
  },
  {
    id: "shock-elastic",
    name: "Supply shock · elastic demand",
    blurb: "Same cost spike, but for something with easy substitutes. Flat demand means the shock lands on quantity, not price — buyers walk away rather than pay up.",
    inputs: { demandShift: 0, supplyShift: 26, demandSlope: 0.4, supplySlope: 1 },
  },
];

export interface Result {
  a: number;
  b: number;
  c: number;
  d: number;
  eqP: number;
  eqQ: number;
  cs: number;
  ps: number;
  total: number;
  /** Chart bounds. */
  qMax: number;
  pMax: number;
  read: { label: string; verdict: string };
}

export function compute(inputs: Inputs): Result {
  const a = A0 + inputs.demandShift;
  const c = C0 + inputs.supplyShift;
  const b = inputs.demandSlope;
  const d = inputs.supplySlope;

  const eqQ = Math.max(0, (a - c) / (b + d));
  const eqP = c + d * eqQ;

  const cs = 0.5 * Math.max(0, a - eqP) * eqQ;
  const ps = 0.5 * Math.max(0, eqP - c) * eqQ;
  const total = cs + ps;

  // Chart bounds: a little headroom past the demand choke price / x-intercept.
  const qMax = Math.max(eqQ * 1.6, a / b) * 1.05;
  const pMax = Math.max(a, eqP) * 1.08;

  let label: string;
  let verdict: string;
  if (eqQ <= 0) {
    label = "no market";
    verdict =
      "The lowest price any seller will accept is above the most any buyer will pay. No trade happens at all.";
  } else if (b > d * 1.3) {
    label = "demand inelastic";
    verdict =
      "Demand is the steeper, more inelastic side, so shocks land more on price than quantity — buyers absorb them, and sellers capture the larger surplus.";
  } else if (d > b * 1.3) {
    label = "supply inelastic";
    verdict =
      "Supply is the steeper, more inelastic side, so shocks land more on price for sellers — buyers can walk, and capture the larger surplus.";
  } else {
    label = "balanced incidence";
    verdict =
      "Both sides are similarly elastic, so a shock to either curve splits between price and quantity, and surplus splits fairly evenly.";
  }

  return { a, b, c, d, eqP, eqQ, cs, ps, total, qMax, pMax, read: { label, verdict } };
}

export function fmt0(n: number): string {
  return n.toFixed(0);
}
