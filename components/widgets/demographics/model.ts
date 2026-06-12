/**
 * Demographics is destiny, slowly (G3).
 *
 * A stylised stable-population model. Set fertility, longevity, and net
 * immigration; the age structure (a population pyramid) and the dependency
 * ratios follow. The lesson is the node's thesis: these levers move the
 * structure only over decades, but the arithmetic — who supports the old —
 * is the most predictable macro variable there is.
 *
 * Illustrative, not a cohort projection: the shares come from a stable-
 * population approximation (survival schedule × growth-rate discounting +
 * working-age immigration). Pure compute.
 */

export interface Inputs {
  /** Total fertility rate (births per woman). 2.1 ≈ replacement. */
  tfr: number;
  /** Life expectancy at birth (years). */
  lifeExp: number;
  /** Net working-age immigration intensity (0 = none). */
  immigration: number;
}

export const DEFAULT_INPUTS: Inputs = { tfr: 2.1, lifeExp: 80, immigration: 1 };

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  inputs: Inputs;
}

export const PRESETS: Preset[] = [
  {
    id: "replacement",
    name: "Replacement (TFR 2.1)",
    blurb: "Births roughly replace deaths. The pyramid is near-rectangular and the dependency ratio is stable — the demographic steady state most pension systems were designed around.",
    inputs: { tfr: 2.1, lifeExp: 80, immigration: 1 },
  },
  {
    id: "aging",
    name: "Aging society (Japan, Italy)",
    blurb: "Low fertility and long lives. The base narrows, the top widens, and the support ratio collapses — fewer workers per retiree every year. This is the regime every rich country is heading into, at different speeds.",
    inputs: { tfr: 1.3, lifeExp: 85, immigration: 0 },
  },
  {
    id: "young",
    name: "Young & growing (Nigeria)",
    blurb: "High fertility, shorter lives. A wide young base: heavy youth dependency now, but a potential demographic dividend in 20 years — if the jobs and schooling materialise.",
    inputs: { tfr: 4.0, lifeExp: 64, immigration: 0 },
  },
  {
    id: "immigration",
    name: "Immigration offsets",
    blurb: "Below-replacement fertility, but steady working-age immigration refills the middle of the pyramid. The support ratio holds up far better than fertility alone would predict — the one fast lever on a slow variable.",
    inputs: { tfr: 1.5, lifeExp: 82, immigration: 4 },
  },
];

export interface Band {
  label: string;
  lo: number;
  hi: number;
  share: number; // % of population
  group: "young" | "working" | "old";
}

export interface Result {
  bands: Band[];
  youngShare: number;
  workShare: number;
  oldShare: number;
  /** (young + old) per 100 working-age. */
  dependencyRatio: number;
  /** old per 100 working-age. */
  oldAgeDependency: number;
  /** working-age per one 65+. */
  supportRatio: number;
  read: { tone: "green" | "gold" | "red"; label: string; verdict: string };
}

const BAND_DEFS: [string, number, number][] = [
  ["0–9", 0, 9],
  ["10–19", 10, 19],
  ["20–29", 20, 29],
  ["30–39", 30, 39],
  ["40–49", 40, 49],
  ["50–59", 50, 59],
  ["60–69", 60, 69],
  ["70–79", 70, 79],
  ["80+", 80, 100],
];

export function compute(inputs: Inputs): Result {
  const { tfr, lifeExp, immigration } = inputs;
  // Per-year population growth rate from fertility (≈ 30-year generation).
  const r = Math.log(Math.max(0.5, tfr) / 2.1) / 30;

  // Stable-population age density: survival × growth discounting + immigration.
  const density: number[] = [];
  for (let a = 0; a <= 100; a++) {
    const survival = 1 / (1 + Math.exp((a - lifeExp) / 7));
    const growth = Math.pow(1 + r, -a);
    const imm = a >= 20 && a <= 45 ? immigration * 0.05 : 0;
    density[a] = survival * growth + imm;
  }
  const total = density.reduce((s, v) => s + v, 0) || 1;

  const bands: Band[] = BAND_DEFS.map(([label, lo, hi]) => {
    let sum = 0;
    for (let a = lo; a <= hi; a++) sum += density[a] ?? 0;
    const mid = (lo + hi) / 2;
    const group: Band["group"] = mid < 20 ? "young" : mid < 65 ? "working" : "old";
    return { label, lo, hi, share: (sum / total) * 100, group };
  });

  const share = (pred: (a: number) => boolean) => {
    let sum = 0;
    for (let a = 0; a <= 100; a++) if (pred(a)) sum += density[a];
    return (sum / total) * 100;
  };
  const youngShare = share((a) => a < 20);
  const workShare = share((a) => a >= 20 && a < 65);
  const oldShare = share((a) => a >= 65);

  const dependencyRatio = ((youngShare + oldShare) / workShare) * 100;
  const oldAgeDependency = (oldShare / workShare) * 100;
  const supportRatio = oldShare > 0 ? workShare / oldShare : Infinity;

  let read: Result["read"];
  if (oldAgeDependency > 40) {
    read = {
      tone: "red",
      label: "aging fast",
      verdict: `Only about ${supportRatio.toFixed(1)} workers per retiree. Pay-as-you-go pensions and health systems strain hard here — the bill falls on a shrinking workforce. No policy reverses it quickly; demographics is destiny, slowly.`,
    };
  } else if (youngShare > 38) {
    read = {
      tone: "gold",
      label: "youth-heavy",
      verdict:
        "A wide young base means heavy youth dependency today — schools and jobs are the binding constraint. Get those right and this becomes a demographic dividend in two decades; get them wrong and it's unemployment.",
    };
  } else if (oldAgeDependency > 28) {
    read = {
      tone: "gold",
      label: "aging",
      verdict: `About ${supportRatio.toFixed(1)} workers per retiree and falling. The pressure is real but gradual — the window to adjust pension ages, savings, and immigration is now, while it's still slow.`,
    };
  } else {
    read = {
      tone: "green",
      label: "balanced",
      verdict: `A roughly balanced structure — about ${supportRatio.toFixed(1)} workers per retiree. The arithmetic supports the existing safety net, for now. Watch fertility: today's birth rate is the workforce 25 years out.`,
    };
  }

  return { bands, youngShare, workShare, oldShare, dependencyRatio, oldAgeDependency, supportRatio, read };
}

export function fmt1(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : "∞";
}
