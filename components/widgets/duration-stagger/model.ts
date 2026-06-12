/**
 * Duration stagger simulator (H8).
 *
 * The H8 pedagogy: extending duration is the canonical late-cycle move;
 * doing it all at once is the canonical mistake. Stagger to capture most
 * of the regime move without needing to call the pivot exactly.
 *
 * This widget simulates a 24-month horizon. The user picks:
 *   - a starting + target duration (e.g. 2y → 10y)
 *   - one of three stagger strategies (go-now / staggered / wait-for-confirmation)
 *   - one of three rate scenarios (cuts on time / delayed / higher-for-longer)
 *
 * The model produces total return, max drawdown, and a month-by-month
 * portfolio-duration path for each strategy under the chosen scenario.
 * Pure compute, no DOM.
 */

export const HORIZON_MONTHS = 24;

export type StrategyId = "go-now" | "stagger" | "wait-confirmation";
export type ScenarioId = "on-time" | "delayed" | "higher-for-longer";

export interface Strategy {
  id: StrategyId;
  name: string;
  blurb: string;
}

export const STRATEGIES: Strategy[] = [
  {
    id: "go-now",
    name: "Go now (all in)",
    blurb: "Extend to target duration in month 0. Captures the full move if cuts arrive — but bleeds the full carry difference if they don't.",
  },
  {
    id: "stagger",
    name: "Stagger over 12 months",
    blurb: "Quarter of the extension each three months for a year. Trades theoretical optimum for robustness — survives mistimed pivots without disaster.",
  },
  {
    id: "wait-confirmation",
    name: "Wait for confirmation",
    blurb: "Hold short until the cuts actually start, then extend over the following six months. Misses the pre-pivot rally but doesn't bleed while waiting.",
  },
];

export interface Scenario {
  id: ScenarioId;
  name: string;
  blurb: string;
  /** Monthly rate changes (percentage points) over the 24-month horizon. */
  rateChanges: number[];
  /** Month at which the rate-cut cycle is "confirmed" (used by wait strategy). */
  confirmMonth: number;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "on-time",
    name: "Cuts on time",
    blurb: "200bp of cuts arrive smoothly over months 6-12, the playbook scenario. Markets price in early; the rally compounds.",
    rateChanges: buildOnTime(),
    confirmMonth: 6,
  },
  {
    id: "delayed",
    name: "Cuts delayed 12 months",
    blurb: "Cuts get pushed back; the 'higher-for-longer' narrative wins through 2023-style. The extend-early strategy bleeds for a year before the move.",
    rateChanges: buildDelayed(),
    confirmMonth: 18,
  },
  {
    id: "higher-for-longer",
    name: "No cuts · curve sits",
    blurb: "Rates flat or even creeping higher over the full horizon. Duration trade is a clean loss; staying short was the call.",
    rateChanges: buildHigherForLonger(),
    confirmMonth: HORIZON_MONTHS, // never confirms
  },
];

function buildOnTime(): number[] {
  const arr = new Array(HORIZON_MONTHS).fill(0);
  // 200bp of cuts over months 6-12, plus 25bp drift down through month 18.
  for (let m = 6; m < 12; m++) arr[m] = -200 / 6 / 100; // -0.333pp per month
  for (let m = 12; m < 18; m++) arr[m] = -25 / 6 / 100;
  return arr;
}

function buildDelayed(): number[] {
  const arr = new Array(HORIZON_MONTHS).fill(0);
  // Small upward drift for the first 12 months, then the cut cycle arrives.
  for (let m = 0; m < 12; m++) arr[m] = 0.05;
  for (let m = 12; m < 18; m++) arr[m] = -200 / 6 / 100;
  return arr;
}

function buildHigherForLonger(): number[] {
  const arr = new Array(HORIZON_MONTHS).fill(0);
  // Slow drift upward for the first 18 months, brief drop in the last quarter.
  for (let m = 0; m < 18; m++) arr[m] = 0.025;
  for (let m = 21; m < 24; m++) arr[m] = -0.1;
  return arr;
}

export interface Inputs {
  /** Starting portfolio duration in years (e.g. 2y T-bills). */
  startDuration: number;
  /** Target portfolio duration (e.g. 10y Treasuries). */
  targetDuration: number;
  /** Coupon / running yield approximation, annualised %. */
  carryPct: number;
  scenarioId: ScenarioId;
}

export const DEFAULT_INPUTS: Inputs = {
  startDuration: 2,
  targetDuration: 10,
  carryPct: 4.5,
  scenarioId: "on-time",
};

export interface MonthlyPoint {
  month: number;
  /** Portfolio duration this month (years). */
  duration: number;
  /** Monthly return (%). */
  monthlyReturn: number;
  /** Cumulative total return (%). */
  cumReturn: number;
}

export interface StrategyResult {
  strategy: Strategy;
  points: MonthlyPoint[];
  /** Total return over the horizon, %. */
  totalReturn: number;
  /** Worst peak-to-trough during the horizon, %. */
  maxDrawdown: number;
  /** Final portfolio duration. */
  finalDuration: number;
}

/**
 * For a given strategy + scenario, build the month-by-month duration
 * path and compute returns. Monthly return ≈ carry/12 − duration × rate
 * change (in percentage points).
 */
export function simulateStrategy(
  strategy: StrategyId,
  inputs: Inputs,
): StrategyResult {
  const scenario = SCENARIOS.find((s) => s.id === inputs.scenarioId)!;
  const points: MonthlyPoint[] = [];

  let cum = 0;
  let peak = 0;
  let maxDD = 0;

  for (let m = 0; m < HORIZON_MONTHS; m++) {
    const dur = durationAt(strategy, m, inputs, scenario);
    const drCpp = scenario.rateChanges[m]; // pp this month
    const monthlyReturn = inputs.carryPct / 12 - dur * drCpp * 100;
    cum += monthlyReturn;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDD) maxDD = dd;
    points.push({ month: m, duration: dur, monthlyReturn, cumReturn: cum });
  }

  const finalDuration = durationAt(strategy, HORIZON_MONTHS - 1, inputs, scenario);

  return {
    strategy: STRATEGIES.find((s) => s.id === strategy)!,
    points,
    totalReturn: cum,
    maxDrawdown: maxDD,
    finalDuration,
  };
}

/**
 * Returns the portfolio duration in month m under the given strategy.
 * - go-now: target from m=0
 * - stagger: linear ramp from start to target over months 0-12 in 4 chunks
 * - wait-confirmation: hold start until scenario.confirmMonth, then 6-month
 *   linear ramp to target.
 */
function durationAt(
  strategy: StrategyId,
  m: number,
  inputs: Inputs,
  scenario: Scenario,
): number {
  const { startDuration, targetDuration } = inputs;

  if (strategy === "go-now") {
    return targetDuration;
  }

  if (strategy === "stagger") {
    // 4 chunks at months 0, 3, 6, 9; each adds 25% of the gap.
    const gap = targetDuration - startDuration;
    const chunks = [0, 3, 6, 9].filter((c) => m >= c).length;
    return startDuration + (chunks / 4) * gap;
  }

  // wait-confirmation
  const start = scenario.confirmMonth;
  if (m < start) return startDuration;
  const sinceStart = m - start;
  if (sinceStart >= 6) return targetDuration;
  return startDuration + (sinceStart / 6) * (targetDuration - startDuration);
}

/** Convenience: simulate all three strategies under the chosen scenario. */
export function simulateAll(inputs: Inputs): StrategyResult[] {
  return STRATEGIES.map((s) => simulateStrategy(s.id, inputs));
}

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
