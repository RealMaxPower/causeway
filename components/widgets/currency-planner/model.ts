/**
 * Currency travel planner (H6).
 *
 * Pure-math personal calculator. Given a target currency, an amount of
 * that currency you need by a given date, and a USD-strength regime,
 * compute:
 *   - where the current spot sits in its 5-year range (USD percentile)
 *   - a recommended pre-buy strategy (aggressive / staged / wait)
 *   - a monthly purchase schedule (units to buy each month)
 *   - USD cost today vs USD cost if you waited and the spot reverted
 *
 * The pedagogy from H6: hedging is cheapest when home currency is strong.
 * The widget makes that legible by surfacing the percentile and tilting
 * the schedule accordingly.
 *
 * No DOM, no globals — composable in tests.
 */

export interface Currency {
  code: string;             // ISO 4217
  name: string;             // human-readable
  /** Foreign units per 1 USD (current spot). */
  unitsPerUSD: number;
  /** 5-year min units-per-USD (USD at its weakest vs this currency). */
  fiveYearMin: number;
  /** 5-year max units-per-USD (USD at its strongest vs this currency). */
  fiveYearMax: number;
  /** Where the dollar is structurally. */
  note: string;
}

/**
 * Snapshot data, ~ May 2026. Real version would pull live spot from a
 * data provider; the 5-year band is historically accurate and refreshed
 * infrequently. Values are units of FX per 1 USD.
 */
export const CURRENCIES: Currency[] = [
  { code: "EUR", name: "Euro",            unitsPerUSD: 0.93, fiveYearMin: 0.82, fiveYearMax: 1.05, note: "USD near multi-year highs vs euro — historically a favourable pre-buy window." },
  { code: "GBP", name: "British pound",   unitsPerUSD: 0.80, fiveYearMin: 0.70, fiveYearMax: 0.90, note: "Sterling has rebuilt from the 2022 mini-budget lows but USD is still firm." },
  { code: "JPY", name: "Japanese yen",    unitsPerUSD: 152,  fiveYearMin: 105,  fiveYearMax: 161,  note: "Generational dollar strength against yen — BOJ policy is the swing variable." },
  { code: "CHF", name: "Swiss franc",     unitsPerUSD: 0.91, fiveYearMin: 0.83, fiveYearMax: 1.02, note: "CHF is a safe-haven hedge; pricey but stable when risk-off." },
  { code: "AUD", name: "Australian dollar", unitsPerUSD: 1.52, fiveYearMin: 1.30, fiveYearMax: 1.62, note: "Pro-cyclical commodity currency; USD strong when global cycle slows." },
  { code: "CAD", name: "Canadian dollar", unitsPerUSD: 1.38, fiveYearMin: 1.21, fiveYearMax: 1.46, note: "Tight comovement with USD; spread is largely a function of crude oil." },
  { code: "MXN", name: "Mexican peso",    unitsPerUSD: 18.5, fiveYearMin: 16.3, fiveYearMax: 24.5, note: "Peso unusually strong recently; high real rates have flipped the carry trade." },
  { code: "INR", name: "Indian rupee",    unitsPerUSD: 83.5, fiveYearMin: 73.0, fiveYearMax: 84.2, note: "Slow grind weaker against USD over a decade — managed not free-floating." },
  { code: "BRL", name: "Brazilian real",  unitsPerUSD: 5.10, fiveYearMin: 4.65, fiveYearMax: 5.85, note: "High-yielding EM currency — high vol but the carry compensates." },
  { code: "KRW", name: "South Korean won", unitsPerUSD: 1370, fiveYearMin: 1095, fiveYearMax: 1440, note: "Export-driven currency; USD/KRW peaks at every global risk-off episode." },
];

export type Strategy = "aggressive" | "staged" | "wait";

export interface Inputs {
  currencyCode: string;
  /** Foreign-currency amount you need by the trip date. */
  amount: number;
  /** Months between today and when you need the FX. */
  monthsToTrip: number;
}

export const DEFAULT_INPUTS: Inputs = {
  currencyCode: "EUR",
  amount: 5000,
  monthsToTrip: 6,
};

export interface ScheduleSlice {
  /** Month index, 0 = now, 1 = next month, ... up to monthsToTrip-1. */
  month: number;
  /** Foreign-currency units to buy that month. */
  units: number;
  /** Share of total (0-1). */
  share: number;
}

export interface Plan {
  currency: Currency;
  /** Today's spot, units per 1 USD. */
  spot: number;
  /** 0-1: position of spot inside its 5-year range. 1 = USD at its strongest. */
  usdPercentile: number;
  /** Where USD strength sits, qualitatively. */
  usdBand: "weak" | "neutral" | "strong";
  /** Recommended strategy keyed off percentile. */
  strategy: Strategy;
  /** USD cost to buy `amount` foreign units at today's spot. */
  usdCostToday: number;
  /** USD cost if spot reverts to 5-year median (historical mean reversion baseline). */
  usdCostIfReverts: number;
  /** Per-month plan adding to `amount` units total. */
  schedule: ScheduleSlice[];
  /** One-line advice keyed to the strategy. */
  advice: string;
}

const STRATEGY_ADVICE: Record<Strategy, string> = {
  aggressive: "Dollar is near multi-year highs against this currency. Pre-buy 60% in the first two months, then a smaller monthly tail. The cheap window may not last.",
  staged:     "Dollar is mid-range against this currency. Spread your buying evenly across the months — the textbook dollar-cost-average. No window to exploit, no window to avoid.",
  wait:       "Dollar is weak against this currency. Buy the minimum you need short-term, hold the rest in USD, and accelerate purchases only if USD strengthens. Don't lock in at a bad spot for no reason.",
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function median(c: Currency): number {
  return (c.fiveYearMin + c.fiveYearMax) / 2;
}

/**
 * Build the per-month schedule. Total units always sum to `amount` (modulo
 * floating-point). Strategy shapes the curve:
 *   - aggressive: front-loaded (~60% in first two months)
 *   - staged: uniform
 *   - wait: back-loaded (~60% in last two months)
 */
export function buildSchedule(
  amount: number,
  monthsToTrip: number,
  strategy: Strategy,
): ScheduleSlice[] {
  const n = Math.max(1, Math.floor(monthsToTrip));
  const out: ScheduleSlice[] = [];

  if (n === 1) {
    out.push({ month: 0, units: amount, share: 1 });
    return out;
  }

  // Shape via a linear ramp; weights then normalised.
  const weights: number[] = [];
  for (let m = 0; m < n; m++) {
    const t = m / (n - 1); // 0 → 1
    let w: number;
    if (strategy === "aggressive") {
      // Start high, taper: 2 → 0.4
      w = 2 - 1.6 * t;
    } else if (strategy === "wait") {
      // Start low, ramp: 0.4 → 2
      w = 0.4 + 1.6 * t;
    } else {
      w = 1;
    }
    weights.push(w);
  }
  const sum = weights.reduce((a, b) => a + b, 0);
  for (let m = 0; m < n; m++) {
    const share = weights[m] / sum;
    out.push({ month: m, units: amount * share, share });
  }
  return out;
}

export function plan(inputs: Inputs): Plan {
  const currency =
    CURRENCIES.find((c) => c.code === inputs.currencyCode) ?? CURRENCIES[0];
  const spot = currency.unitsPerUSD;
  const range = currency.fiveYearMax - currency.fiveYearMin;
  const usdPercentile = range > 0
    ? clamp01((spot - currency.fiveYearMin) / range)
    : 0.5;

  const usdBand: Plan["usdBand"] =
    usdPercentile >= 0.66 ? "strong"
    : usdPercentile <= 0.34 ? "weak"
    : "neutral";

  const strategy: Strategy =
    usdBand === "strong" ? "aggressive"
    : usdBand === "weak" ? "wait"
    : "staged";

  const usdCostToday = inputs.amount / spot;
  const medSpot = median(currency);
  const usdCostIfReverts = inputs.amount / medSpot;

  return {
    currency,
    spot,
    usdPercentile,
    usdBand,
    strategy,
    usdCostToday,
    usdCostIfReverts,
    schedule: buildSchedule(inputs.amount, inputs.monthsToTrip, strategy),
    advice: STRATEGY_ADVICE[strategy],
  };
}

export function formatCurrency(amount: number, code: string): string {
  if (amount >= 100_000) return `${code} ${(amount / 1000).toFixed(0)}k`;
  if (amount >= 10_000)  return `${code} ${(amount / 1000).toFixed(1)}k`;
  return `${code} ${Math.round(amount).toLocaleString()}`;
}

export function formatUSD(amount: number): string {
  if (amount >= 100_000) return `$${(amount / 1000).toFixed(0)}k`;
  if (amount >= 10_000)  return `$${(amount / 1000).toFixed(1)}k`;
  return `$${Math.round(amount).toLocaleString()}`;
}

export function strategyLabel(s: Strategy): string {
  switch (s) {
    case "aggressive": return "Pre-buy now";
    case "staged":     return "Spread evenly";
    case "wait":       return "Wait and watch";
  }
}

export function bandTone(b: Plan["usdBand"]): "red" | "gold" | "green" {
  // USD strong (vs FX) = green for the home-currency holder (cheap to buy)
  // USD weak = red (expensive)
  return b === "strong" ? "green" : b === "weak" ? "red" : "gold";
}
