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
  /** Crypto allocation as a % of portfolio (0–25). */
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

export interface ReadingResult {
  /** Expected dollar contribution from crypto over one year. */
  expectedDollar: number;
  /** Crypto's contribution to total portfolio vol, % (assuming zero correlation). */
  volContribPct: number;
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
  verdict: "balanced" | "tilted-tail" | "tilted-reserve" | "broken";
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
  const restReturnAssumed = 0.07; // 7% baseline rest-of-portfolio return
  const portfolioReturnPct =
    alloc * cryptoReturnPct + (1 - alloc) * restReturnAssumed * 100;

  // Zero-correlation portfolio vol: sqrt(w1^2 * s1^2 + w2^2 * s2^2)
  const cryptoVar = Math.pow(alloc * cryptoVolPct, 2);
  const restVar = Math.pow((1 - alloc) * inputs.restVolPct, 2);
  const portVolPct = Math.sqrt(cryptoVar + restVar);
  const cryptoVolContrib = Math.sqrt(cryptoVar);
  const volContribPct =
    portVolPct > 0 ? (cryptoVolContrib / portVolPct) * 100 : 0;

  const drawdownDollar = cryptoNav * (inputs.drawdownPct / 100);
  const drawdownPortfolioPct =
    inputs.portfolio > 0 ? (drawdownDollar / inputs.portfolio) * 100 : 0;

  return {
    expectedDollar,
    volContribPct,
    portfolioReturnPct,
    drawdownDollar,
    drawdownPortfolioPct,
  };
}

export function compute(inputs: Inputs): Result {
  const tail = computeReading(inputs, inputs.tailReturnPct, inputs.tailVolPct);
  const reserve = computeReading(
    inputs,
    inputs.reserveReturnPct,
    inputs.reserveVolPct,
  );

  // Verdict logic:
  //   broken         → drawdown > 10% of portfolio (sized for one reading only,
  //                    and a tail outcome destroys the whole)
  //   tilted-tail    → vol contribution > 60% (crypto dominates risk budget)
  //   tilted-reserve → allocation < 0.5% (so small that reserve-asset upside
  //                    is invisible to the portfolio)
  //   balanced       → drawdown ≤ 10% of portfolio AND vol contribution 15–60%
  const tailDrawdownPct = tail.drawdownPortfolioPct;
  const reserveContribPct = reserve.volContribPct;

  let verdict: Result["verdict"];
  let explanation: string;

  if (tailDrawdownPct > 10) {
    verdict = "broken";
    explanation = `A tail outcome (crypto −${inputs.drawdownPct}%) would cost ${tailDrawdownPct.toFixed(1)}% of total portfolio — too large to call this sizing survivable. If the tail-risk reading is right, this allocation breaks the portfolio.`;
  } else if (reserveContribPct > 60) {
    verdict = "tilted-tail";
    explanation = `Crypto contributes ${reserveContribPct.toFixed(0)}% of total portfolio vol — even under the lower-vol reserve-asset reading. Sized like a bet on the tail-risk reading being wrong; an unfavourable outcome shows up disproportionately in portfolio statistics.`;
  } else if (inputs.allocationPct < 0.5) {
    verdict = "tilted-reserve";
    explanation = `At ${inputs.allocationPct.toFixed(1)}% allocation, crypto's contribution to either outcome is rounding error. If the reserve-asset reading is right, the upside is invisible to the portfolio; if the tail reading is right, you barely notice the loss.`;
  } else {
    verdict = "balanced";
    explanation = `Survives the tail-risk reading (drawdown of ${tailDrawdownPct.toFixed(1)}% of portfolio is recoverable) and is visible enough under the reserve-asset reading to matter. The position works under both honest readings.`;
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
    case "balanced":
      return "green";
    case "tilted-reserve":
    case "tilted-tail":
      return "gold";
    case "broken":
      return "red";
  }
}
