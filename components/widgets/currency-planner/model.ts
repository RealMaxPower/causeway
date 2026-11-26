/**
 * Offline currency-conversion illustration (H6).
 * Rates and bounds are teaching inputs, not observed market prices. Range
 * position and midpoint describe those bounds only; neither is a percentile,
 * a historical median, nor a forecast. The schedule is fixed, not contingent
 * on future exchange-rate movements.
 */
export interface Currency {
  code: string;
  name: string;
  /** Illustrative foreign-currency units per USD. */
  exampleRate: number;
  rangeLow: number;
  rangeHigh: number;
}

export const DATA_NOTICE = "Illustrative rates and ranges · offline teaching inputs, not live quotes or verified historical observations. No market observation date is available.";

export const CURRENCIES: readonly Currency[] = [
  { code: "EUR", name: "Euro", exampleRate: 0.93, rangeLow: 0.82, rangeHigh: 1.05 },
  { code: "GBP", name: "British pound", exampleRate: 0.80, rangeLow: 0.70, rangeHigh: 0.90 },
  { code: "JPY", name: "Japanese yen", exampleRate: 152, rangeLow: 105, rangeHigh: 161 },
  { code: "CHF", name: "Swiss franc", exampleRate: 0.91, rangeLow: 0.83, rangeHigh: 1.02 },
  { code: "AUD", name: "Australian dollar", exampleRate: 1.52, rangeLow: 1.30, rangeHigh: 1.62 },
  { code: "CAD", name: "Canadian dollar", exampleRate: 1.38, rangeLow: 1.21, rangeHigh: 1.46 },
  { code: "MXN", name: "Mexican peso", exampleRate: 18.5, rangeLow: 16.3, rangeHigh: 24.5 },
  { code: "INR", name: "Indian rupee", exampleRate: 83.5, rangeLow: 73.0, rangeHigh: 84.2 },
  { code: "BRL", name: "Brazilian real", exampleRate: 5.10, rangeLow: 4.65, rangeHigh: 5.85 },
  { code: "KRW", name: "South Korean won", exampleRate: 1370, rangeLow: 1095, rangeHigh: 1440 },
];

export type Strategy = "aggressive" | "staged" | "wait";
export type RangeBand = "lower" | "middle" | "upper";
export const MAX_AMOUNT = 10_000_000;
export const MAX_MONTHS = 18;

export interface Inputs {
  currencyCode: string;
  /** Whole foreign-currency units needed by the deadline. */
  amount: number;
  /** Whole months until the deadline, 1–18 inclusive. */
  monthsToTrip: number;
}

export const DEFAULT_INPUTS: Inputs = {
  currencyCode: "EUR",
  amount: 5000,
  monthsToTrip: 6,
};

export interface ScheduleSlice {
  /** 0 = now; last allocation is one month before the deadline. */
  month: number;
  /** Whole foreign-currency units; allocations sum exactly to the total. */
  units: number;
  /** Allocated share, 0–1. Zero when no currency is needed. */
  share: number;
}

export interface Plan {
  currency: Currency;
  exampleRate: number;
  /** Fraction of the distance from the illustrative lower to upper bound. */
  rangePosition: number;
  rangeMidpoint: number;
  rangeBand: RangeBand;
  strategy: Strategy;
  usdCostAtExampleRate: number;
  /** Hypothetical cost at the bounds' midpoint; no reversion is assumed. */
  usdCostAtMidpoint: number;
  schedule: ScheduleSlice[];
  advice: string;
}

function validateScheduleInputs(amount: number, months: number, strategy: Strategy): void {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_AMOUNT) {
    throw new RangeError("Use a whole currency amount within the displayed range.");
  }
  if (!Number.isInteger(months) || months < 1 || months > MAX_MONTHS) {
    throw new RangeError("Use a whole horizon from 1 through 18 months.");
  }
  if (!["aggressive", "staged", "wait"].includes(strategy)) {
    throw new RangeError("Unknown schedule shape.");
  }
}

/** Linear 5:1 early/late weights, or equal weights, apportioned to whole units. */
export function buildSchedule(amount: number, monthsToTrip: number, strategy: Strategy): ScheduleSlice[] {
  validateScheduleInputs(amount, monthsToTrip, strategy);
  const n = monthsToTrip;
  if (n === 1) return [{ month: 0, units: amount, share: amount === 0 ? 0 : 1 }];

  // Integer weights preserve the original linear ramp without rounding drift.
  const weights = Array.from({ length: n }, (_, month) => strategy === "aggressive"
    ? 5 * (n - 1) - 4 * month
    : strategy === "wait" ? n - 1 + 4 * month : 1);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const units = weights.map((weight) => Math.floor(amount * weight / weightTotal));
  const remaining = amount - units.reduce((sum, allocation) => sum + allocation, 0);
  const order = weights.map((weight, month) => ({ month, remainder: amount * weight % weightTotal }))
    .sort((a, b) => b.remainder - a.remainder || (strategy === "wait" ? b.month - a.month : a.month - b.month));
  for (const { month } of order.slice(0, remaining)) units[month] += 1;
  return units.map((allocation, month) => ({ month, units: allocation, share: amount === 0 ? 0 : allocation / amount }));
}

export function describeSchedule(schedule: readonly ScheduleSlice[], strategy: Strategy): string {
  const amount = schedule.reduce((sum, slice) => sum + slice.units, 0);
  if (amount === 0) return "No currency is needed, so every allocation is zero.";
  if (schedule.length === 1) return "With one month until the deadline, all units are allocated now; the schedule shapes are identical.";
  const firstTwo = schedule.slice(0, 2).reduce((sum, slice) => sum + slice.units, 0);
  const openingShare = (firstTwo / amount * 100).toFixed(1);
  const shape = strategy === "aggressive"
    ? "Larger early allocations taper toward the deadline."
    : strategy === "wait"
      ? "Smaller early allocations build toward the deadline; purchases do not wait for the exchange rate to improve."
      : "Units are spread evenly, with at most one unit of rounding difference between months.";
  return `${shape} The first two slots (now and next month) contain ${openingShare}% of the total, rounded. All units are allocated by month ${schedule.length - 1}, one month before the deadline.`;
}

export function plan(inputs: Inputs): Plan {
  const currency = CURRENCIES.find((item) => item.code === inputs.currencyCode);
  if (!currency) throw new RangeError("Unknown currency; no substitute conversion was calculated.");
  const { exampleRate, rangeLow, rangeHigh } = currency;
  if (![exampleRate, rangeLow, rangeHigh].every((value) => Number.isFinite(value) && value > 0) || rangeHigh <= rangeLow) {
    throw new RangeError("Illustrative rates and bounds must be finite, positive and ordered.");
  }
  const rangePosition = (exampleRate - rangeLow) / (rangeHigh - rangeLow);
  const rangeMidpoint = (rangeLow + rangeHigh) / 2;
  const rangeBand: RangeBand = rangePosition >= 2 / 3 ? "upper" : rangePosition <= 1 / 3 ? "lower" : "middle";
  const strategy: Strategy = rangeBand === "upper" ? "aggressive" : rangeBand === "lower" ? "wait" : "staged";
  const schedule = buildSchedule(inputs.amount, inputs.monthsToTrip, strategy);
  return {
    currency, exampleRate, rangePosition, rangeMidpoint, rangeBand, strategy,
    usdCostAtExampleRate: inputs.amount / exampleRate,
    usdCostAtMidpoint: inputs.amount / rangeMidpoint,
    schedule,
    advice: describeSchedule(schedule, strategy),
  };
}

/** Full amounts keep displayed allocations reconcilable with the total. */
export function formatCurrency(amount: number, code: string): string {
  return `${code} ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function strategyLabel(strategy: Strategy): string {
  return strategy === "aggressive" ? "Earlier purchases" : strategy === "wait" ? "Later purchases" : "Even purchases";
}

export function bandTone(band: RangeBand): "red" | "gold" | "green" {
  return band === "upper" ? "green" : band === "lower" ? "red" : "gold";
}
