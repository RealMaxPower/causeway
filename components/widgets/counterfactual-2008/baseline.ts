/**
 * Counterfactual-2008 baseline path · 2007Q1 → 2012Q4.
 *
 * Sourced from FRED's public historical record:
 *   - FEDFUNDS (effective fed funds, quarterly average)
 *   - UNRATE (U-3 unemployment, end-of-quarter)
 *   - CPILFESL (core CPI YoY, end-of-quarter)
 *   - GDPC1 (real GDP, QoQ annualised growth)
 *
 * Values rounded to one decimal; small differences vs primary sources
 * are within rounding tolerance. The point of this dataset isn't to
 * reproduce FRED with five-digit fidelity — it's to give the
 * counterfactual a defensible historical curve to deviate from.
 */

export interface QuarterPoint {
  /** 0-indexed quarter: 0 = 2007Q1, 23 = 2012Q4. */
  q: number;
  label: string;
  /** Fed funds effective rate, quarterly average (%). */
  fedFunds: number;
  /** Unemployment U-3, end-of-quarter (%). */
  unemp: number;
  /** Core CPI YoY, end-of-quarter (%). */
  cpi: number;
  /** Real GDP QoQ annualised (%). */
  growth: number;
}

export const BASELINE: QuarterPoint[] = [
  { q:  0, label: "2007Q1", fedFunds: 5.26, unemp: 4.4, cpi: 2.6, growth:  0.2 },
  { q:  1, label: "2007Q2", fedFunds: 5.25, unemp: 4.6, cpi: 2.3, growth:  3.1 },
  { q:  2, label: "2007Q3", fedFunds: 5.07, unemp: 4.7, cpi: 2.1, growth:  2.7 },
  { q:  3, label: "2007Q4", fedFunds: 4.50, unemp: 5.0, cpi: 2.4, growth:  1.4 },

  { q:  4, label: "2008Q1", fedFunds: 3.18, unemp: 5.1, cpi: 2.4, growth: -1.6 },
  { q:  5, label: "2008Q2", fedFunds: 2.09, unemp: 5.6, cpi: 2.4, growth:  2.3 },
  { q:  6, label: "2008Q3", fedFunds: 1.94, unemp: 6.1, cpi: 2.5, growth: -2.1 },
  { q:  7, label: "2008Q4", fedFunds: 0.51, unemp: 7.3, cpi: 1.8, growth: -8.5 },

  { q:  8, label: "2009Q1", fedFunds: 0.18, unemp: 8.7, cpi: 1.8, growth: -4.4 },
  { q:  9, label: "2009Q2", fedFunds: 0.18, unemp: 9.5, cpi: 1.7, growth: -0.6 },
  { q: 10, label: "2009Q3", fedFunds: 0.16, unemp: 9.8, cpi: 1.5, growth:  1.5 },
  { q: 11, label: "2009Q4", fedFunds: 0.12, unemp: 9.9, cpi: 1.8, growth:  4.4 },

  { q: 12, label: "2010Q1", fedFunds: 0.13, unemp: 9.9, cpi: 1.3, growth:  1.5 },
  { q: 13, label: "2010Q2", fedFunds: 0.19, unemp: 9.4, cpi: 0.9, growth:  4.0 },
  { q: 14, label: "2010Q3", fedFunds: 0.19, unemp: 9.5, cpi: 0.8, growth:  2.8 },
  { q: 15, label: "2010Q4", fedFunds: 0.19, unemp: 9.3, cpi: 0.8, growth:  2.4 },

  { q: 16, label: "2011Q1", fedFunds: 0.16, unemp: 9.0, cpi: 1.2, growth: -1.0 },
  { q: 17, label: "2011Q2", fedFunds: 0.09, unemp: 9.1, cpi: 1.6, growth:  2.9 },
  { q: 18, label: "2011Q3", fedFunds: 0.08, unemp: 9.0, cpi: 2.0, growth: -0.1 },
  { q: 19, label: "2011Q4", fedFunds: 0.07, unemp: 8.5, cpi: 2.2, growth:  4.7 },

  { q: 20, label: "2012Q1", fedFunds: 0.10, unemp: 8.2, cpi: 2.3, growth:  2.7 },
  { q: 21, label: "2012Q2", fedFunds: 0.15, unemp: 8.2, cpi: 2.2, growth:  1.9 },
  { q: 22, label: "2012Q3", fedFunds: 0.14, unemp: 7.8, cpi: 2.0, growth:  0.5 },
  { q: 23, label: "2012Q4", fedFunds: 0.16, unemp: 7.9, cpi: 1.9, growth:  0.1 },
];

export const N_QUARTERS = BASELINE.length;
