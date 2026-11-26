/**
 * One-period leverage stress test: balances are held constant during the shock.
 * Margin maintenance is equity / securities value (SEC margin-account bulletin).
 * Rental DSCR is net operating income / debt service (OCC CRE lending handbook).
 * Household budget bands and the rental cushion are teaching assumptions, not
 * underwriting rules. A falling property price alone does not force a sale.
 * Sources:
 * https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-29
 * https://www.consumerfinance.gov/ask-cfpb/what-is-the-difference-between-a-fixed-rate-and-adjustable-rate-mortgage-arm-loan-en-100/
 * https://www.occ.ustreas.gov/publications-and-resources/publications/comptrollers-handbook/files/commercial-real-estate-lending/pub-ch-commercial-real-estate.pdf
 */
export type AssetKind = "primary-home" | "rental-property" | "margin-loan" | "consumer";
export type RateType = "fixed" | "floating";

export interface AssetTemplate {
  kind: AssetKind;
  label: string;
  blurb: string;
  defaultLtv: number;
  defaultRate: number;
  defaultTerm: number;
  defaultRateType: RateType;
  defaultAssetValue: number;
  defaultIncome: number;
}

export const ASSET_TEMPLATES: AssetTemplate[] = [
  {
    kind: "primary-home", label: "Primary home · mortgage",
    blurb: "A household mortgage example. Fixed-rate principal and interest stay unchanged when market rates rise; floating payments reset. Income loss can still make either loan hard to carry.",
    defaultLtv: 80, defaultRate: 6.5, defaultTerm: 360, defaultRateType: "fixed",
    defaultAssetValue: 500_000, defaultIncome: 8_000,
  },
  {
    kind: "rental-property", label: "Rental property · mortgage",
    blurb: "Rental financing can be fixed or floating. Compare rent after vacancy and operating costs with debt service. The property type does not determine the loan contract; this example starts with a floating rate.",
    defaultLtv: 70, defaultRate: 7.5, defaultTerm: 360, defaultRateType: "floating",
    defaultAssetValue: 500_000, defaultIncome: 3_000,
  },
  {
    kind: "margin-loan", label: "Margin loan · brokerage borrowing",
    blurb: "Floating-rate borrowing against securities, with interest paid monthly in this example. A maintenance shortfall can trigger liquidation even with positive equity and enough income to pay the interest.",
    defaultLtv: 50, defaultRate: 8, defaultTerm: 60, defaultRateType: "floating",
    defaultAssetValue: 200_000, defaultIncome: 8_000,
  },
  {
    kind: "consumer", label: "Consumer debt · installment loan",
    blurb: "An auto or personal installment-loan example, not a revolving credit card. Test the payment against take-home income and choose fixed or floating terms. Passing this test does not make the purchase worthwhile.",
    defaultLtv: 90, defaultRate: 9.5, defaultTerm: 60, defaultRateType: "fixed",
    defaultAssetValue: 30_000, defaultIncome: 4_000,
  },
];

export interface Inputs {
  kind: AssetKind;
  assetValue: number;
  /** Outstanding loan balance, held constant through the instantaneous shock. */
  loanAmount: number;
  /** Annual nominal interest rate, percent; fees are excluded. */
  apr: number;
  rateType: RateType;
  /** Remaining amortization term; not used by the interest-only margin example. */
  termMonths: number;
  /** Take-home pay, or rental NOI after vacancy/operating costs, before debt. */
  monthlyIncome: number;
  /** Required equity / securities value, percent; used only for margin loans. */
  maintenanceMarginPct: number;
  rateStressBp: number;
  assetStressPct: number;
  incomeStressPct: number;
}

export function inputsForAsset(kind: AssetKind): Inputs {
  const template = ASSET_TEMPLATES.find((item) => item.kind === kind)!;
  return {
    kind, assetValue: template.defaultAssetValue,
    loanAmount: template.defaultAssetValue * template.defaultLtv / 100,
    apr: template.defaultRate, rateType: template.defaultRateType,
    termMonths: template.defaultTerm, monthlyIncome: template.defaultIncome,
    maintenanceMarginPct: 30, rateStressBp: 0, assetStressPct: 0, incomeStressPct: 0,
  };
}

export const DEFAULT_INPUTS = inputsForAsset("primary-home");
export const BUDGET_TIGHT_PCT = 40;
export const BUDGET_BROKEN_PCT = 60;
export const RENTAL_CUSHION = 1.25;
export const MARGIN_BUFFER_PCT = 5;
export const POSITION_LIMIT = 50_000_000;
export const INCOME_LIMIT = 500_000;

/** Shared number-field bounds; empty or nonfinite values become zero. */
export function clampMoney(value: number, maximum: typeof POSITION_LIMIT | typeof INCOME_LIMIT): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(0, value)) : 0;
}

/** Level monthly principal-and-interest payment, including the zero-rate limit. */
function amortPayment(principal: number, aprPct: number, months: number): number {
  if (principal <= 0) return 0;
  if (aprPct === 0) return principal / months;
  const rate = aprPct / 1200;
  return principal * rate / -Math.expm1(-months * Math.log1p(rate));
}

function paymentShare(payment: number, income: number): number {
  return payment === 0 ? 0 : income > 0 ? payment / income * 100 : Infinity;
}

export interface Result {
  basePayment: number;
  stressedPayment: number;
  effectiveStressedApr: number;
  ltv: number;
  stressedLtv: number;
  basePaymentToIncome: number;
  stressedPaymentToIncome: number;
  /** NOI / debt service; relevant only for rental property. */
  baseDscr: number;
  stressedDscr: number;
  baseEquityPct: number;
  stressedEquityPct: number;
  stressedEquity: number;
  stressedUnderwater: boolean;
  marginCall: boolean;
  verdict: "well-structured" | "tight" | "broken";
  explanation: string;
  assumptions: string;
}

export function compute(inputs: Inputs): Result {
  inputs = { ...inputs,
    assetValue: clampMoney(inputs.assetValue, POSITION_LIMIT),
    loanAmount: clampMoney(inputs.loanAmount, POSITION_LIMIT),
    monthlyIncome: clampMoney(inputs.monthlyIncome, INCOME_LIMIT),
  };
  const margin = inputs.kind === "margin-loan";
  const floating = margin || inputs.rateType === "floating";
  const effectiveStressedApr = inputs.apr + (floating ? inputs.rateStressBp / 100 : 0);
  const payment = (apr: number) => margin
    ? inputs.loanAmount * apr / 1200
    : amortPayment(inputs.loanAmount, apr, inputs.termMonths);
  const basePayment = payment(inputs.apr), stressedPayment = payment(effectiveStressedApr);
  const stressedAssetValue = inputs.assetValue * (1 - inputs.assetStressPct / 100);
  const stressedIncome = inputs.monthlyIncome * (1 - inputs.incomeStressPct / 100);
  const ltv = paymentShare(inputs.loanAmount, inputs.assetValue);
  const stressedLtv = paymentShare(inputs.loanAmount, stressedAssetValue);
  const stressedEquity = stressedAssetValue - inputs.loanAmount;
  const stressedUnderwater = stressedEquity < 0;
  const baseEquityPct = inputs.assetValue > 0 ? 100 - ltv : inputs.loanAmount > 0 ? -Infinity : 0;
  const stressedEquityPct = stressedAssetValue > 0 ? 100 - stressedLtv : inputs.loanAmount > 0 ? -Infinity : 0;
  const basePaymentToIncome = paymentShare(basePayment, inputs.monthlyIncome);
  const stressedPaymentToIncome = paymentShare(stressedPayment, stressedIncome);
  const baseDscr = basePayment > 0 ? inputs.monthlyIncome / basePayment : Infinity;
  const stressedDscr = stressedPayment > 0 ? stressedIncome / stressedPayment : Infinity;
  // Compare dollar equity to dollar maintenance: equality meets the requirement.
  const requiredEquity = stressedAssetValue * inputs.maintenanceMarginPct / 100;
  // Only absorb arithmetic roundoff, never a substantive collateral shortfall.
  const collateralTolerance = Number.EPSILON * 8 * Math.max(1, stressedAssetValue, inputs.loanAmount, requiredEquity);
  const marginCall = margin && inputs.loanAmount > 0 && stressedEquity < requiredEquity - collateralTolerance;
  const atMaintenance = Math.abs(stressedEquity - requiredEquity) <= collateralTolerance;
  const withinMarginBuffer = stressedEquity <=
    stressedAssetValue * (inputs.maintenanceMarginPct + MARGIN_BUFFER_PCT) / 100 + collateralTolerance;

  let verdict: Result["verdict"] = "well-structured";
  let explanation: string;
  if (inputs.loanAmount === 0) {
    explanation = "There is no outstanding loan or debt service in this example, so no financing shortfall or margin call. Asset losses can still occur.";
  } else if (marginCall) {
    verdict = "broken";
    explanation = "Equity falls below the selected maintenance requirement. A margin call or broker liquidation can occur even if interest is affordable; additional income does not satisfy the collateral test.";
  } else if (inputs.kind === "rental-property") {
    if (stressedDscr < 1) {
      verdict = "broken";
      explanation = "Rental net operating income no longer covers debt service (DSCR below 1.00×). The property needs outside cash; this is a cash-flow shortfall, not an automatic default prediction.";
    } else if (stressedDscr < RENTAL_CUSHION || stressedUnderwater) {
      verdict = "tight";
      explanation = stressedUnderwater
        ? "Rent covers debt service, but the property has negative equity. Refinancing or selling is harder; the price decline alone does not change the scheduled payment."
        : "Rent covers debt service, but DSCR is below the illustrative 1.25× cushion. At 1.00×, no operating cash remains after the loan payment.";
    } else {
      explanation = "Rental net operating income covers at least 1.25× debt service, with nonnegative equity. This clears the example's cash-flow cushion, not every lender's requirements.";
    }
  } else if (stressedPaymentToIncome > BUDGET_BROKEN_PCT) {
    verdict = "broken";
    explanation = "The payment exceeds the example's 60% of take-home-income budget limit. This signals a cash-flow shortfall in this model, not an automatic default or liquidation.";
  } else if (stressedPaymentToIncome > BUDGET_TIGHT_PCT || stressedUnderwater ||
      (margin && inputs.loanAmount > 0 && withinMarginBuffer)) {
    verdict = "tight";
    explanation = margin
      ? atMaintenance
        ? "Maintenance is met exactly, with zero collateral cushion. Another asset-price decline would breach the selected requirement, even if interest remains affordable."
        : "Maintenance is met, but equity is within 5 percentage points of the requirement or interest uses over 40% of take-home income. The example has little room for another shock."
      : stressedUnderwater
        ? "The payment stays within the example's budget limit, but equity is negative. Selling or refinancing is harder; negative equity alone does not force a sale."
        : "The payment uses over 40% but no more than 60% of take-home income. The example leaves a tight budget for other needs.";
  } else {
    explanation = margin
      ? "Equity clears the maintenance requirement by more than 5 percentage points, and monthly interest uses no more than 40% of take-home income. The loan principal remains owed."
      : "The payment uses no more than 40% of take-home income and equity is nonnegative. This clears the example's budget test; other expenses and debts still matter.";
  }

  const financing = margin
    ? "Margin: floating-rate, interest-only carrying cost; principal stays outstanding and interest is paid, not capitalized. Broker terms can be stricter or change."
    : floating
      ? "Floating: the full rate shock resets payments immediately over the remaining term, without caps or delays."
      : "Fixed: market-rate stress leaves principal and interest payments unchanged.";
  const criterion = inputs.kind === "rental-property"
    ? "Rental income means NOI after vacancy and operating costs, before debt service. DSCR = NOI / payment; 1.00× breaks even, 1.25× is an illustrative cushion."
    : "The 40% / 60% take-home-income bands are illustrative budget limits, not lender DTI rules; other debts and living costs are not modeled.";
  const assumptions = `${financing} ${criterion} Balances are held constant during the shock. Loan payments exclude fees, taxes and insurance; example rates are not current quotes.`;

  return { basePayment, stressedPayment, effectiveStressedApr, ltv, stressedLtv,
    basePaymentToIncome, stressedPaymentToIncome, baseDscr, stressedDscr,
    baseEquityPct, stressedEquityPct, stressedEquity, stressedUnderwater, marginCall,
    verdict, explanation, assumptions };
}

export function findAssetTemplate(kind: AssetKind): AssetTemplate | undefined {
  return ASSET_TEMPLATES.find((template) => template.kind === kind);
}

export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 100_000) return `${n < 0 ? "−" : ""}$${(Math.abs(n) / 1000).toFixed(0)}k`;
  if (Math.abs(n) >= 10_000) return `${n < 0 ? "−" : ""}$${(Math.abs(n) / 1000).toFixed(1)}k`;
  return `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString()}`;
}

export function verdictTone(verdict: Result["verdict"]): "red" | "gold" | "green" {
  return verdict === "broken" ? "red" : verdict === "tight" ? "gold" : "green";
}
