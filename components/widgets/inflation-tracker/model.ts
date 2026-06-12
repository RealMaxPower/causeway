/**
 * Inflation impact tracker (A5).
 *
 * Pure-math personal calculator. Given an amount today, a horizon, and
 * an annual inflation rate, compute purchasing power year-by-year.
 * Includes basket-specific breakouts so the reader can see how the
 * official CPI hides category-level variation (rent and healthcare rose
 * much faster than headline CPI over the past 20 years).
 */

export interface Regime {
  name: string;
  rate: number;        // headline annual %
  label: string;       // short period descriptor
  note: string;        // one-line explanation
}

export const REGIMES: Regime[] = [
  { name: "Fed target",          rate: 2.0,  label: "policy goal",         note: "What the Fed aims for. The post-1995 average sat near here." },
  { name: "2014–2019 average",   rate: 1.7,  label: "post-GFC era",        note: "Below-target inflation despite massive QE — exactly the surprise of the decade." },
  { name: "2022 spike",          rate: 8.0,  label: "post-COVID surge",    note: "Headline US CPI peaked at 9.1% in June 2022. Most savings vehicles lost real value rapidly." },
  { name: "1970s average",       rate: 7.4,  label: "stagflation decade",  note: "1974–1981 averaged 7.4%. Whole cohort of investors learned the wrong lessons from this." },
  { name: "Argentine 2023",      rate: 211,  label: "hyperinflation",      note: "The dollar value of a Buenos Aires lunch tripled in 12 months. Real wages collapsed." },
  { name: "Weimar 1923",         rate: 5000, label: "rare collapse",       note: "Daily inflation of ~20% at peak. Cash lost half its value in a week." },
];

export interface BasketComponent {
  name: string;
  /** Annualised real-CPI category change over a long sample, percent. */
  realRate: number;
  /** Color tone for the visualisation. */
  tone: "red" | "blue" | "green" | "gold";
}

/**
 * Approximate annualised category inflation rates (BLS CPI subindices,
 * 2000–2024). The whole point is that "inflation is 3%" hides 4-6× spread.
 */
export const BASKETS: BasketComponent[] = [
  { name: "Headline CPI",       realRate: 2.5, tone: "gold"  },
  { name: "Rent of primary residence", realRate: 3.4, tone: "red"   },
  { name: "Medical care",       realRate: 3.5, tone: "red"   },
  { name: "College tuition",    realRate: 5.7, tone: "red"   },
  { name: "Food at home",       realRate: 2.8, tone: "gold"  },
  { name: "Apparel",            realRate: 0.3, tone: "blue"  },
  { name: "TVs & electronics",  realRate: -7.5, tone: "green" },
  { name: "Toys",               realRate: -4.2, tone: "green" },
];

/** Future nominal cost of `amount` after `years` at `ratePct` inflation. */
export function futureCost(amount: number, ratePct: number, years: number): number {
  return amount * Math.pow(1 + ratePct / 100, years);
}

/** Real purchasing power of `amount` after `years` at `ratePct` inflation. */
export function realPower(amount: number, ratePct: number, years: number): number {
  return amount / Math.pow(1 + ratePct / 100, years);
}

/** Number of years for purchasing power to halve at `ratePct`. */
export function halfLifeYears(ratePct: number): number {
  if (ratePct <= 0) return Infinity;
  return Math.log(2) / Math.log(1 + ratePct / 100);
}

export interface YearPoint {
  year: number;
  nominalNeeded: number;
  realValue: number;
}

export function pathFor(
  amount: number,
  ratePct: number,
  horizonYears: number,
): YearPoint[] {
  const out: YearPoint[] = [];
  for (let y = 0; y <= horizonYears; y++) {
    out.push({
      year: y,
      nominalNeeded: futureCost(amount, ratePct, y),
      realValue: realPower(amount, ratePct, y),
    });
  }
  return out;
}

export function formatMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${n < 0 ? "−" : ""}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1_000_000)     return `${n < 0 ? "−" : ""}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 10_000)        return `${n < 0 ? "−" : ""}$${(abs / 1e3).toFixed(0)}k`;
  if (abs >= 1_000)         return `${n < 0 ? "−" : ""}$${(abs / 1e3).toFixed(1)}k`;
  return `${n < 0 ? "−" : ""}$${Math.round(abs)}`;
}
