/**
 * Crypto portfolio sizer (H9).
 *
 * H9's pedagogy: two honest readings of bitcoin coexist:
 *   - tail-risk asset (no cashflow, regulation-killable, 80%-drawdown-prone)
 *   - reserve-asset candidate (fixed supply, network effects, debasement hedge)
 * Sizing differs by an order of magnitude. The discipline is sizing such
 * that the portfolio survives whichever reading turns out to be wrong.
 *
 * Pure compute.
 */

export interface Inputs {
  /** Total portfolio NAV, $. */
  portfolio: number;
  /** Crypto allocation as a % of portfolio (0–100; widget slider: 0–25). */
  allocationPct: number;
  /** Tail-risk reading: expected annual return, %. */
  tailReturnPct: number;
  /** Tail-risk reading: annualised vol, %. */
  tailVolPct: number;
  /** Reserve-asset reading: expected annual return, %. */
  reserveReturnPct: number;
  /** Reserve-asset reading: annualised vol, %. */
  reserveVolPct: number;
  /** Drawdown stress scenario applied to crypto, % (0–100). */
  drawdownPct: number;
  /** Rest-of-portfolio (non-crypto) annualised vol, %. */
  restVolPct: number;
}

export const DEFAULT_INPUTS: Inputs = {
  portfolio: 100_000,
  allocationPct: 2,
  tailReturnPct: -20,
  tailVolPct: 90,
  reserveReturnPct: 25,
  reserveVolPct: 70,
  drawdownPct: 80,
  restVolPct: 12,
};

export const REST_RETURN_PCT = 7;
export const STRESS_LOSS_LIMIT_PCT = 10;
export const RISK_SHARE_LIMIT_PCT = 60;
export const PORTFOLIO_LIMIT = 100_000_000;

/** Match the editable money field's domain, including an empty number input. */
export function clampPortfolio(amount: number): number {
  return Math.min(PORTFOLIO_LIMIT, Math.max(0, Number.isFinite(amount) ? amount : 0));
}

export interface ReadingResult {
  /** Expected dollar contribution from crypto over one year. */
  expectedDollar: number;
  /** Relative Euler volatility contribution, %; at zero correlation this is
   * weighted crypto variance / portfolio variance. Zero if total variance is zero.
   */
  riskSharePct: number;
  /** The remaining portfolio's relative contribution under the same convention. */
  restRiskSharePct: number;
  /** Modelled annualised portfolio volatility, %. */
  portfolioVolPct: number;
  /** Expected portfolio return under this reading, %. */
  portfolioReturnPct: number;
  /** Dollar drawdown if crypto falls by the stress drawdown %. */
  drawdownDollar: number;
  /** Drawdown as a % of total portfolio. */
  drawdownPortfolioPct: number;
}

export interface Result {
  tail: ReadingResult;
  reserve: ReadingResult;
  /** Verdict tone. */
  verdict: "within-limits" | "risk-concentrated" | "small-allocation" | "large-stress-loss" | "no-portfolio";
  /** One-line explanation of the verdict. */
  explanation: string;
}

function computeReading(
  inputs: Inputs,
  cryptoReturnPct: number,
  cryptoVolPct: number,
): ReadingResult {
  const alloc = inputs.allocationPct / 100;
  const cryptoNav = inputs.portfolio * alloc;

  const expectedDollar = cryptoNav * (cryptoReturnPct / 100);
  const portfolioReturnPct =
    alloc * cryptoReturnPct + (1 - alloc) * REST_RETURN_PCT;

  // Relative Euler risk contribution: w_i (Sigma w)_i / (w' Sigma w).
  // With correlation fixed at zero, each numerator is its weighted variance.
  // These shares add to 100%; dividing standalone vol by portfolio vol does not.
  // https://portfoliooptimizationbook.com/portfolio-optimization-book.pdf
  const cryptoVar = Math.pow(alloc * cryptoVolPct, 2);
  const restVar = Math.pow((1 - alloc) * inputs.restVolPct, 2);
  const totalVar = cryptoVar + restVar;
  const portfolioVolPct = Math.sqrt(totalVar);
  const riskSharePct = totalVar > 0 ? (cryptoVar / totalVar) * 100 : 0;
  const restRiskSharePct = totalVar > 0 ? (restVar / totalVar) * 100 : 0;

  const drawdownDollar = cryptoNav * (inputs.drawdownPct / 100);
  // The rest of the portfolio is held flat in this isolated stress scenario.
  const drawdownPortfolioPct = alloc * inputs.drawdownPct;

  return {
    expectedDollar,
    riskSharePct,
    restRiskSharePct,
    portfolioVolPct,
    portfolioReturnPct,
    drawdownDollar,
    drawdownPortfolioPct,
  };
}

export function compute(inputs: Inputs): Result {
  inputs = { ...inputs, portfolio: clampPortfolio(inputs.portfolio) };
  const tail = computeReading(inputs, inputs.tailReturnPct, inputs.tailVolPct);
  const reserve = computeReading(
    inputs,
    inputs.reserveReturnPct,
    inputs.reserveVolPct,
  );

  // Illustrative flags, not calibrated suitability or solvency thresholds.
  // Use both readings: users can make either one the more volatile scenario.
  const tailDrawdownPct = tail.drawdownPortfolioPct;
  const maxRiskSharePct = Math.max(tail.riskSharePct, reserve.riskSharePct);

  let verdict: Result["verdict"];
  let explanation: string;

  if (inputs.portfolio === 0) {
    verdict = "no-portfolio";
    explanation = "No portfolio value entered. Dollar outcomes are zero; percentage results describe the hypothetical allocation only.";
  } else if (tailDrawdownPct > STRESS_LOSS_LIMIT_PCT) {
    verdict = "large-stress-loss";
    explanation = `A crypto loss of ${inputs.drawdownPct}% costs ${tailDrawdownPct.toFixed(1)}% of this portfolio if other holdings stay flat. That exceeds this illustration's ${STRESS_LOSS_LIMIT_PCT}% stress-loss flag; whether it is affordable depends on the investor's circumstances.`;
  } else if (maxRiskSharePct > RISK_SHARE_LIMIT_PCT) {
    verdict = "risk-concentrated";
    explanation = `Crypto accounts for up to ${maxRiskSharePct.toFixed(1)}% of modelled portfolio variance across the two readings, above this illustration's ${RISK_SHARE_LIMIT_PCT}% concentration flag. This assumes zero correlation with other holdings.`;
  } else if (inputs.allocationPct < 0.5) {
    verdict = "small-allocation";
    explanation = `At ${inputs.allocationPct.toFixed(1)}% allocation, the specified crypto stress costs ${tailDrawdownPct.toFixed(1)}% of the portfolio. The dollar results show how much each return scenario contributes; a small weight can still matter to its owner.`;
  } else {
    verdict = "within-limits";
    explanation = `The specified crypto stress costs ${tailDrawdownPct.toFixed(1)}% of the portfolio; its largest modelled variance share is ${maxRiskSharePct.toFixed(1)}%. Both are within this illustration's ${STRESS_LOSS_LIMIT_PCT}% loss and ${RISK_SHARE_LIMIT_PCT}% concentration limits. These checks do not establish that an allocation is suitable or losses recoverable.`;
  }

  return { tail, reserve, verdict, explanation };
}

export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 100_000) return `${sign}$${(abs / 1000).toFixed(0)}k`;
  if (abs >= 10_000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

export function verdictTone(
  v: Result["verdict"],
): "red" | "gold" | "green" {
  switch (v) {
    case "within-limits":
      return "green";
    case "small-allocation":
    case "risk-concentrated":
    case "no-portfolio":
      return "gold";
    case "large-stress-loss":
      return "red";
  }
}
