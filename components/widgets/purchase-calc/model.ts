/**
 * Big-purchase calculator (H5).
 *
 * The pedagogy from H5: list price moves slowly, dealer incentives and
 * financing rates move fast — watch the second pair. This widget lets
 * the user decompose a big purchase (car, appliance, durable goods) into
 * its full all-in cost and surfaces which lever matters most.
 *
 * Pure compute. No DOM.
 */

export interface Inputs {
  /** Sticker / MSRP, in dollars. */
  listPrice: number;
  /** Discount off list, % (0-30). */
  discountPct: number;
  /** Manufacturer / dealer cash incentive, $. */
  incentive: number;
  /** Loan APR, %. 0 = pay cash. */
  apr: number;
  /** Loan term in months. */
  termMonths: number;
  /** Down payment, $. */
  downPayment: number;
}

export const DEFAULT_INPUTS: Inputs = {
  listPrice: 40_000,
  discountPct: 3,
  incentive: 1_500,
  apr: 6.9,
  termMonths: 60,
  downPayment: 5_000,
};

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  inputs: Inputs;
}

export const PRESETS: Preset[] = [
  {
    id: "tight",
    name: "Tight market · little to negotiate",
    blurb: "Dealers are firm; inventory is thin. APR is the only real lever. This is most new-car markets in 2021-22.",
    inputs: { listPrice: 40_000, discountPct: 1, incentive: 0, apr: 7.5, termMonths: 72, downPayment: 5_000 },
  },
  {
    id: "balanced",
    name: "Balanced market · normal year",
    blurb: "Modest discount, modest incentive, modest APR — the everyday case. This is most years for most durable goods.",
    inputs: { listPrice: 40_000, discountPct: 3, incentive: 1_500, apr: 6.9, termMonths: 60, downPayment: 5_000 },
  },
  {
    id: "soft",
    name: "Soft market · buyer's window",
    blurb: "Inventory has built up, manufacturers are running incentives, dealers are negotiable. The list price barely moved; the all-in price moved a lot.",
    inputs: { listPrice: 40_000, discountPct: 6, incentive: 3_500, apr: 3.9, termMonths: 60, downPayment: 5_000 },
  },
  {
    id: "cash",
    name: "Pay cash · no financing",
    blurb: "Skip the APR layer entirely. Only useful when the alternative use of cash returns less than the APR you'd otherwise pay.",
    inputs: { listPrice: 40_000, discountPct: 4, incentive: 2_000, apr: 0, termMonths: 0, downPayment: 38_000 },
  },
];

export interface Result {
  /** Negotiated price after discount + incentive, $. */
  negotiatedPrice: number;
  /** Total discount applied, $. */
  totalDiscount: number;
  /** Amount financed (negotiated − down payment), $. */
  amountFinanced: number;
  /** Monthly payment, $. */
  monthlyPayment: number;
  /** Total interest paid over the loan term, $. */
  totalInterest: number;
  /** All-in cost (negotiated + interest), $. */
  allInCost: number;
  /** Effective cost relative to list price (% saved/over). */
  vsListPct: number;
  /** Sensitivity table — how much you save per 1pp/$1000 change in each lever. */
  sensitivity: {
    perPctAprDrop: number;
    perThousandIncentive: number;
    perPctListDrop: number;
  };
  /** Where the negotiation effort should focus. */
  biggestLever: "apr" | "incentive" | "list" | "balanced";
}

export function compute(inputs: Inputs): Result {
  const discountAbs = inputs.listPrice * (inputs.discountPct / 100);
  const totalDiscount = discountAbs + inputs.incentive;
  const negotiatedPrice = Math.max(0, inputs.listPrice - totalDiscount);
  const amountFinanced = Math.max(0, negotiatedPrice - inputs.downPayment);

  let monthlyPayment: number;
  let totalInterest: number;
  if (inputs.termMonths <= 0 || amountFinanced === 0) {
    monthlyPayment = 0;
    totalInterest = 0;
  } else if (inputs.apr === 0) {
    monthlyPayment = amountFinanced / inputs.termMonths;
    totalInterest = 0;
  } else {
    const r = inputs.apr / 100 / 12;
    const n = inputs.termMonths;
    monthlyPayment =
      (amountFinanced * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    totalInterest = monthlyPayment * n - amountFinanced;
  }

  const allInCost = negotiatedPrice + totalInterest;
  const vsListPct = ((inputs.listPrice - allInCost) / inputs.listPrice) * 100;

  // Sensitivities: re-run with a small delta on each lever.
  const perPctAprDrop = inputs.apr > 0
    ? computeAllIn({ ...inputs, apr: Math.max(0, inputs.apr - 1) }) -
      computeAllIn(inputs)
    : 0;
  const perThousandIncentive =
    computeAllIn(inputs) - computeAllIn({ ...inputs, incentive: inputs.incentive + 1000 });
  const perPctListDrop =
    computeAllIn(inputs) - computeAllIn({ ...inputs, discountPct: inputs.discountPct + 1 });

  // Biggest lever — which delivers the most savings per "reasonable unit"
  // of effort. APR drop of 1pp vs list discount of 1pp vs $1k incentive.
  const aprSav = -perPctAprDrop;
  const listSav = perPctListDrop;
  const incSav = perThousandIncentive;
  const biggestLever: Result["biggestLever"] =
    aprSav > listSav && aprSav > incSav
      ? "apr"
      : incSav > listSav
        ? "incentive"
        : listSav > aprSav * 1.1
          ? "list"
          : "balanced";

  return {
    negotiatedPrice,
    totalDiscount,
    amountFinanced,
    monthlyPayment,
    totalInterest,
    allInCost,
    vsListPct,
    sensitivity: {
      perPctAprDrop,
      perThousandIncentive,
      perPctListDrop,
    },
    biggestLever,
  };
}

function computeAllIn(inputs: Inputs): number {
  const discountAbs = inputs.listPrice * (inputs.discountPct / 100);
  const totalDiscount = discountAbs + inputs.incentive;
  const negotiatedPrice = Math.max(0, inputs.listPrice - totalDiscount);
  const amountFinanced = Math.max(0, negotiatedPrice - inputs.downPayment);

  let totalInterest: number;
  if (inputs.termMonths <= 0 || amountFinanced === 0) {
    totalInterest = 0;
  } else if (inputs.apr === 0) {
    totalInterest = 0;
  } else {
    const r = inputs.apr / 100 / 12;
    const n = inputs.termMonths;
    const monthly =
      (amountFinanced * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    totalInterest = monthly * n - amountFinanced;
  }
  return negotiatedPrice + totalInterest;
}

export function formatMoney(n: number): string {
  if (n >= 100_000) return `$${(n / 1000).toFixed(0)}k`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function leverLabel(l: Result["biggestLever"]): string {
  switch (l) {
    case "apr":       return "Focus on APR · biggest lever per unit of effort";
    case "incentive": return "Focus on dealer/manufacturer incentives";
    case "list":      return "Focus on list-price negotiation";
    case "balanced":  return "Levers are balanced · negotiate all three";
  }
}
