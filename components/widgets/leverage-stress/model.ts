/**
 * Leverage stress-tester (H7).
 *
 * H7's pedagogy: borrowing against an appreciating asset at a fixed real
 * rate is one of the most powerful tools available — and the most overused,
 * on the wrong assets. The well-structured case satisfies two conditions:
 *
 *   1. You'd own the asset without the leverage (it's an amplifier of a
 *      position you'd already take, not a synthetic position).
 *   2. The financing terms survive a stress scenario (rates rise, asset
 *      value falls, income drops).
 *
 * This widget makes condition 2 concrete: dial up a stress scenario and
 * see whether the position still meets a basic affordability threshold
 * (DSCR-style for housing/property; payment-to-income for consumer).
 *
 * Pure compute.
 */

export type AssetKind = "primary-home" | "rental-property" | "margin-loan" | "consumer";

export interface AssetTemplate {
  kind: AssetKind;
  label: string;
  blurb: string;
  /** Default loan-to-value for a typical purchase. */
  defaultLtv: number;
  /** Default APR for this asset class in a normal regime. */
  defaultRate: number;
  /** Default loan term in months. */
  defaultTerm: number;
}

export const ASSET_TEMPLATES: AssetTemplate[] = [
  {
    kind: "primary-home",
    label: "Primary home · 30-year fixed mortgage",
    blurb: "The textbook well-structured case. Fixed rate + long term + asset you'd own anyway. Survives almost any rate scenario without changing the monthly payment.",
    defaultLtv: 80,
    defaultRate: 6.5,
    defaultTerm: 360,
  },
  {
    kind: "rental-property",
    label: "Rental property · investment mortgage",
    blurb: "Leverage on an income-producing asset. Stress-test rent variance + vacancy + rate resets. Many investor-mortgage products are 5/1 ARMs or shorter — the fixed-rate cushion isn't there.",
    defaultLtv: 70,
    defaultRate: 7.5,
    defaultTerm: 360,
  },
  {
    kind: "margin-loan",
    label: "Margin loan · brokerage borrowing",
    blurb: "Borrowing against securities at a floating rate. Margin calls are not optional and happen on the broker's timetable, not yours. Stress-test asset value as much as rate.",
    defaultLtv: 50,
    defaultRate: 8.0,
    defaultTerm: 60,
  },
  {
    kind: "consumer",
    label: "Consumer debt · auto, personal, credit card",
    blurb: "Leverage on a depreciating asset (or no asset at all). Few of these meet the well-structured test — the rate is high, the asset doesn't appreciate, the position wouldn't exist without the loan.",
    defaultLtv: 90,
    defaultRate: 9.5,
    defaultTerm: 60,
  },
];

export interface Inputs {
  kind: AssetKind;
  /** Asset value, $. */
  assetValue: number;
  /** Loan amount, $ (so LTV = loan / assetValue). */
  loanAmount: number;
  /** Loan APR, %. */
  apr: number;
  /** Loan term, months. */
  termMonths: number;
  /** Monthly net income (housing/property: rent net of vacancy; consumer: take-home pay), $. */
  monthlyIncome: number;
  /** Stress scenario sliders */
  rateStressBp: number;     // bp added to APR
  assetStressPct: number;   // % decline in asset value
  incomeStressPct: number;  // % decline in monthly income
}

export const DEFAULT_INPUTS: Inputs = {
  kind: "primary-home",
  assetValue: 500_000,
  loanAmount: 400_000,
  apr: 6.5,
  termMonths: 360,
  monthlyIncome: 8_000,
  rateStressBp: 0,
  assetStressPct: 0,
  incomeStressPct: 0,
};

/** Standard amortised monthly payment. */
function amortPayment(principal: number, aprPct: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0;
  if (aprPct === 0) return principal / months;
  const r = aprPct / 100 / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export interface Result {
  /** Base monthly payment under current inputs. */
  basePayment: number;
  /** Payment under stress (rate stress applied). */
  stressedPayment: number;
  /** Loan-to-value, %. */
  ltv: number;
  /** LTV under stress (asset value declines). */
  stressedLtv: number;
  /** Payment-to-income ratio, base. */
  baseDti: number;
  /** Payment-to-income ratio, under stress (payment up, income down). */
  stressedDti: number;
  /** Equity remaining under stress. */
  stressedEquity: number;
  /** Are we underwater under stress? */
  stressedUnderwater: boolean;
  /** Verdict on whether the structure survives the stress. */
  verdict: "well-structured" | "tight" | "broken";
  /** One-line explanation of the verdict. */
  explanation: string;
}

export function compute(inputs: Inputs): Result {
  const basePayment = amortPayment(inputs.loanAmount, inputs.apr, inputs.termMonths);
  const stressedApr = inputs.apr + inputs.rateStressBp / 100;
  // For fixed-rate mortgages, rate stress doesn't actually flow through to
  // the existing payment. Apply it only to floating-rate / short-term loans.
  const ratePassThrough =
    inputs.kind === "primary-home" ? 0 :
    inputs.kind === "rental-property" ? 0.5 : // many ARMs in this segment
    inputs.kind === "margin-loan" ? 1 :
    inputs.kind === "consumer" ? 0.3 : 0;
  const effectiveStressedApr = inputs.apr + (stressedApr - inputs.apr) * ratePassThrough;
  const stressedPayment = amortPayment(inputs.loanAmount, effectiveStressedApr, inputs.termMonths);

  const ltv = inputs.assetValue > 0 ? (inputs.loanAmount / inputs.assetValue) * 100 : 0;
  const stressedAssetValue = inputs.assetValue * (1 - inputs.assetStressPct / 100);
  const stressedLtv = stressedAssetValue > 0 ? (inputs.loanAmount / stressedAssetValue) * 100 : Infinity;
  const stressedEquity = stressedAssetValue - inputs.loanAmount;
  const stressedUnderwater = stressedEquity < 0;

  const baseDti = inputs.monthlyIncome > 0 ? (basePayment / inputs.monthlyIncome) * 100 : Infinity;
  const stressedIncome = inputs.monthlyIncome * (1 - inputs.incomeStressPct / 100);
  const stressedDti = stressedIncome > 0 ? (stressedPayment / stressedIncome) * 100 : Infinity;

  // Verdict logic:
  //   broken    → underwater + DTI > 50%
  //   broken    → DTI > 60% under stress
  //   tight     → DTI 40-60% under stress, or LTV > 100% under stress
  //   well-structured → DTI < 40% under stress AND not underwater
  let verdict: Result["verdict"];
  let explanation: string;

  if (stressedUnderwater && stressedDti > 50) {
    verdict = "broken";
    explanation =
      "Stress-test breaks the position: underwater on equity AND payment exceeds 50% of stressed income. Forced sale becomes likely. This is the bankruptcy-leverage case.";
  } else if (stressedDti > 60 || stressedLtv > 110) {
    verdict = "broken";
    explanation =
      "Stress-test breaks the position: payments unaffordable under stress, or LTV blows out beyond 110%. Any combination of these two requires forced action (refinance, sell, default).";
  } else if (stressedDti > 40 || stressedUnderwater) {
    verdict = "tight";
    explanation =
      "Survives the stress but barely: tight cashflow or temporary negative equity. Workable if the stress is short — a position to manage actively, not assume.";
  } else {
    verdict = "well-structured";
    explanation =
      "Survives the stress with margin. Payment stays affordable, equity stays positive. The fixed-rate term + manageable LTV is doing its job — this is what well-structured leverage looks like.";
  }

  return {
    basePayment,
    stressedPayment,
    ltv,
    stressedLtv,
    baseDti,
    stressedDti,
    stressedEquity,
    stressedUnderwater,
    verdict,
    explanation,
  };
}

export function findAssetTemplate(kind: AssetKind): AssetTemplate | undefined {
  return ASSET_TEMPLATES.find((t) => t.kind === kind);
}

export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 100_000) return `${n < 0 ? "−" : ""}$${(Math.abs(n) / 1000).toFixed(0)}k`;
  if (Math.abs(n) >= 10_000) return `${n < 0 ? "−" : ""}$${(Math.abs(n) / 1000).toFixed(1)}k`;
  return `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString()}`;
}

export function verdictTone(v: Result["verdict"]): "red" | "gold" | "green" {
  switch (v) {
    case "well-structured": return "green";
    case "tight":           return "gold";
    case "broken":          return "red";
  }
}
