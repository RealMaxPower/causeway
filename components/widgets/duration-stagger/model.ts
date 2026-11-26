/**
 * Duration stagger simulator (H8).
 *
 * Compare the cost of waiting with the exposure taken before a yield move.
 * These prescribed paths illustrate timing risk, not a strategy ranking
 * that is guaranteed to hold in other markets.
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
    blurb: "Move to target duration at month 0. Takes the full price effect of both yield rises and falls; carry is the same for every strategy.",
  },
  {
    id: "stagger",
    name: "Stagger over 12 months",
    blurb: "Move one quarter of the duration gap at months 0, 3, 6 and 9. Spreads the timing of the change without guaranteeing a better outcome.",
  },
  {
    id: "wait-confirmation",
    name: "Wait for confirmation",
    blurb: "Keep starting duration through the first monthly yield cut, then move one sixth of the gap in each of the following six months.",
  },
];

export interface Scenario {
  id: ScenarioId;
  name: string;
  blurb: string;
  /** Monthly rate changes (percentage points) over the 24-month horizon. */
  rateChanges: number[];
  /** Elapsed month when the first monthly cut has been observed; null if none. */
  confirmMonth: number | null;
}

const SCENARIO_PATHS: Omit<Scenario, "confirmMonth">[] = [
  {
    id: "on-time",
    name: "Cuts on time",
    blurb: "Six monthly yield cuts end in months 7–12 (200bp total); smaller cuts end in months 13–18 (25bp total). There is no modeled price rally before these yield changes occur.",
    rateChanges: buildOnTime(),
  },
  {
    id: "delayed",
    name: "Cuts after month 12",
    blurb: "Yields rise 60bp through month 12, then fall 200bp in six monthly steps ending in months 13–18. Carry may offset some or all of the early price losses.",
    rateChanges: buildDelayed(),
  },
  {
    id: "higher-for-longer",
    name: "No cuts · yields rise",
    blurb: "Yields rise 45bp over the first 18 months, then stay flat. There is no cut to confirm. Longer duration loses more on price; total return also includes carry.",
    rateChanges: buildHigherForLonger(),
  },
];

export const SCENARIOS: Scenario[] = SCENARIO_PATHS.map((scenario) => {
  const firstCut = scenario.rateChanges.findIndex((change) => change < 0);
  return { ...scenario, confirmMonth: firstCut < 0 ? null : firstCut + 1 };
});

function buildOnTime(): number[] {
  const arr = new Array(HORIZON_MONTHS).fill(0);
  // Six cuts end at months 7–12; six smaller cuts end at months 13–18.
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
  // The no-cut scenario stays flat after its initial rise.
  for (let m = 0; m < 18; m++) arr[m] = 0.025;
  return arr;
}

export interface Inputs {
  /** Starting modified duration (price sensitivity), in years; not maturity. */
  startDuration: number;
  /** Target modified duration in years; not bond maturity. */
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
  /** Elapsed month at the end of this observation, from 1 through 24. */
  month: number;
  /** Portfolio duration this month (years). */
  duration: number;
  /** Monthly contribution, percentage points of starting portfolio value. */
  monthlyReturn: number;
  /** Sum of monthly contributions (% of starting value), without compounding. */
  cumReturn: number;
}

export interface StrategyResult {
  strategy: Strategy;
  points: MonthlyPoint[];
  /** Total return over the horizon, %. */
  totalReturn: number;
  /** Largest loss as a percentage of prior peak wealth, including initial 100. */
  maxDrawdown: number;
  /** Final portfolio duration. */
  finalDuration: number;
}

/**
 * For a given strategy + scenario, build the month-by-month duration
 * path and compute returns. Monthly return ≈ carry/12 − duration × rate
 * change (in percentage points). Monthly contributions are added on a fixed
 * starting-value basis; this deliberately omits compounding and convexity.
 */
export function simulateStrategy(
  strategy: StrategyId,
  inputs: Inputs,
): StrategyResult {
  for (const [value, maximum] of [[inputs.startDuration, 30], [inputs.targetDuration, 30], [inputs.carryPct, 15]]) {
    if (!Number.isFinite(value) || value < 0 || value > maximum) {
      throw new RangeError("Duration inputs must be finite and within the displayed ranges.");
    }
  }
  const scenario = SCENARIOS.find((s) => s.id === inputs.scenarioId)!;
  const points: MonthlyPoint[] = [];

  let cum = 0;
  let peakWealth = 100;
  let maxDD = 0;

  for (let m = 0; m < HORIZON_MONTHS; m++) {
    const dur = durationAt(strategy, m, inputs, scenario);
    const yieldChangePp = scenario.rateChanges[m];
    const monthlyReturn = inputs.carryPct / 12 - dur * yieldChangePp;
    cum += monthlyReturn;
    const wealth = 100 + cum;
    peakWealth = Math.max(peakWealth, wealth);
    const dd = ((peakWealth - wealth) / peakWealth) * 100;
    if (dd > maxDD) maxDD = dd;
    points.push({ month: m + 1, duration: dur, monthlyReturn, cumReturn: cum });
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
 * - stagger: four equal steps at the start of months 0, 3, 6 and 9
 * - wait-confirmation: observe the first cut, then take six equal monthly steps
 *   starting with the following month; no position uses a future yield change.
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
  if (start === null || m < start) return startDuration;
  const steps = Math.min(m - start + 1, 6);
  return startDuration + (steps / 6) * (targetDuration - startDuration);
}

/** Convenience: simulate all three strategies under the chosen scenario. */
export function simulateAll(inputs: Inputs): StrategyResult[] {
  return STRATEGIES.map((s) => simulateStrategy(s.id, inputs));
}

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
