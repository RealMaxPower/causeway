/**
 * Debt cycles, long and short (F4).
 *
 * The short credit cycle ratchets debt higher each turn until the long debt
 * cycle peaks; then the debt has to come down. There are only four levers to
 * bring it down — austerity, defaults/restructuring, money-printing, and
 * wealth transfers — and the *mix* decides the outcome. Balance the
 * deflationary levers (austerity, defaults) against the inflationary one
 * (printing) and you get Dalio's "beautiful deleveraging": debt/income falls
 * while income holds. Lean too far either way and you get a deflationary
 * depression or an inflationary debasement.
 *
 * Stylised model — the point is the trade-off between the levers, not a
 * forecast. Pure compute.
 */

const START_DEBT = 340; // debt/income at the long-cycle peak (%)

export interface Inputs {
  /** Spending cuts / belt-tightening (deflationary). */
  austerity: number;
  /** Defaults & debt restructuring (deflationary, disorderly if high). */
  defaults: number;
  /** Central-bank money printing (inflationary, supports nominal income). */
  printing: number;
  /** Wealth transfers / fiscal support (supports demand). */
  transfers: number;
}

export const DEFAULT_INPUTS: Inputs = { austerity: 35, defaults: 25, printing: 45, transfers: 30 };

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  inputs: Inputs;
}

export const PRESETS: Preset[] = [
  {
    id: "beautiful",
    name: "Beautiful deleveraging (2008–14)",
    blurb: "Money-printing roughly offsets the deflationary drag of austerity and defaults, with transfers cushioning demand. Debt/income falls while income recovers and inflation stays contained. The needle threaded.",
    inputs: { austerity: 35, defaults: 25, printing: 55, transfers: 35 },
  },
  {
    id: "depression",
    name: "Deflationary depression (1930s)",
    blurb: "Hard austerity and disorderly defaults, almost no printing. Debt nominally shrinks but income collapses faster, so the debt burden barely falls — and the human cost is enormous.",
    inputs: { austerity: 80, defaults: 70, printing: 10, transfers: 15 },
  },
  {
    id: "inflation",
    name: "Inflationary debasement (Weimar)",
    blurb: "Print and print, no discipline. Nominal income soars so the debt ratio melts — but the currency goes with it. The debt is 'paid' by destroying the money it's denominated in.",
    inputs: { austerity: 10, defaults: 10, printing: 95, transfers: 60 },
  },
  {
    id: "stuck",
    name: "Stuck (Japan-style)",
    blurb: "Timid on every lever. Not enough printing to lift income, not enough austerity or defaults to cut debt. The ratio stays sky-high for decades — the lost-decade outcome.",
    inputs: { austerity: 20, defaults: 10, printing: 25, transfers: 20 },
  },
];

export interface Result {
  startDebt: number;
  endDebt: number;
  incomeChange: number; // % vs start
  inflation: number; // annualised-ish, %
  outcome: "beautiful" | "deflationary" | "inflationary" | "stuck";
  tone: "green" | "gold" | "red";
  verdict: string;
}

export function compute(inputs: Inputs): Result {
  const { austerity, defaults, printing, transfers } = inputs;

  // Deflationary vs reflationary forces (0..~1 scale).
  const deflation = (austerity * 0.6 + defaults * 0.7) / 100;
  const reflation = (printing * 0.7 + transfers * 0.4) / 100;

  // Income path: reflation lifts, deflation crushes.
  const incomeChange = Math.round((reflation - deflation) * 45);

  // Inflation: printing net of economic slack created by the deflationary levers.
  const inflation = Math.max(-2, Math.round(printing * 0.14 - deflation * 9));

  // Direct debt reduction from austerity + defaults; printing erodes the real
  // burden via inflation; income (the denominator) moves the ratio too.
  const directCut = austerity * 0.35 + defaults * 0.75; // pct points off debt
  const inflationErosion = Math.max(0, inflation) * 4;
  const debtBeforeIncome = START_DEBT - directCut - inflationErosion;
  // Falling income raises the ratio (denominator), rising income lowers it.
  const endDebt = Math.max(40, Math.round(debtBeforeIncome / (1 + incomeChange / 100)));

  const debtFell = endDebt < START_DEBT - 25;

  let outcome: Result["outcome"];
  let tone: Result["tone"];
  let verdict: string;
  if (inflation >= 12) {
    outcome = "inflationary";
    tone = "red";
    verdict =
      "Printing dominates: the debt ratio falls, but only because the currency is being debased. The debt isn't really repaid — its real value is inflated away, and savers pay the bill.";
  } else if (incomeChange <= -10) {
    outcome = "deflationary";
    tone = "red";
    verdict =
      "The deflationary levers overwhelm the reflationary ones. Income collapses faster than debt, so the burden barely eases — a depression, with the debt ratio sticky because the denominator is falling too.";
  } else if (debtFell && incomeChange >= -2 && inflation <= 6) {
    outcome = "beautiful";
    tone = "green";
    verdict =
      "Balanced. Printing offsets the deflationary drag just enough that debt/income falls while income holds and inflation stays contained. This is the rare 'beautiful deleveraging' — and it takes all four levers in proportion.";
  } else {
    outcome = "stuck";
    tone = "gold";
    verdict =
      "No lever is pulled hard enough. Not enough printing to lift income, not enough austerity or defaults to cut debt. The ratio stays elevated for years — the stagnant, lost-decade path.";
  }

  return { startDebt: START_DEBT, endDebt, incomeChange, inflation, outcome, tone, verdict };
}
