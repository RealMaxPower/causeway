/**
 * Rent-vs-own simulation.
 *
 * Compares cumulative net wealth from (A) renting and investing the difference
 * vs (B) buying with a mortgage. Models:
 *   - mortgage interest + amortization
 *   - property tax + maintenance + insurance (2.6% of price/yr)
 *   - rent inflation
 *   - home appreciation
 *   - opportunity cost of down payment (invested at market return)
 *   - selling costs (6%) at end of horizon
 *
 * Plus a "mortgage embedded value" readout: the present-value gain/loss on
 * the mortgage if rates have moved since origination.
 *
 * Pure compute. No DOM, no globals.
 */

export interface ScenarioInputs {
  /** Home price in $000s. */
  price: number;
  /** Down payment, %. */
  dp: number;
  /** Locked-in mortgage rate, %. */
  mortRate: number;
  /** Current market mortgage rate, %. Used for embedded value. */
  mktRate: number;
  /** Equivalent monthly rent, $. */
  rent: number;
  /** Home appreciation, % per year. */
  hpiGrow: number;
  /** Rent growth, % per year. */
  rentGrow: number;
  /** Market return on invested capital, % per year. */
  mktRet: number;
  /** Holding period, years. */
  years: number;
}

export interface YearPoint {
  y: number;
  /** Owner net wealth if sold at end of year y. */
  ownNet: number;
  /** Renter net wealth at end of year y. */
  rentNet: number;
  homeVal: number;
  loanBal: number;
  ownInvest: number;
}

export interface SimResult {
  path: YearPoint[];
  monthlyPmt: number;
  /** Positive = mortgage is "cheap" vs market. Negative = mortgage is expensive. */
  mortgageEmbeddedValue: number;
  loanK: number;
  dpK: number;
}

export function simulateH3(inputs: ScenarioInputs): SimResult {
  const { price, dp, mortRate, mktRate, rent, hpiGrow, rentGrow, mktRet, years } = inputs;

  const priceK = price * 1000;
  const dpK = priceK * (dp / 100);
  const loanK = priceK - dpK;
  const monthlyR = mortRate / 100 / 12;
  const n = 30 * 12;
  const monthlyPmt = loanK * monthlyR / (1 - Math.pow(1 + monthlyR, -n));
  const annPmt = monthlyPmt * 12;
  // Ownership annual costs: property tax 1.2% + maintenance 1% + insurance 0.4% — all of price
  const ownAnnCost = priceK * 0.026;

  let homeVal = priceK;
  let loanBal = loanK;
  let ownInvest = 0;
  let rentInvest = dpK; // renter invests the down payment
  let yearRent = rent * 12;

  const path: YearPoint[] = [];

  for (let y = 1; y <= years; y++) {
    homeVal *= 1 + hpiGrow / 100;

    // Annual amortization split (monthly loop)
    for (let m = 0; m < 12; m++) {
      const i = loanBal * monthlyR;
      const p = monthlyPmt - i;
      loanBal -= p;
      if (loanBal < 0) loanBal = 0;
    }

    const ownerOutflow = annPmt + ownAnnCost;
    const renterOutflow = yearRent;
    const flow = renterOutflow - ownerOutflow;

    // Owner invests positive flow if rent > owner cost
    if (flow > 0) ownInvest = ownInvest * (1 + mktRet / 100) + flow;
    else ownInvest = ownInvest * (1 + mktRet / 100);

    // Renter invests the absolute negative flow (premium they would have paid as owner)
    if (flow < 0) rentInvest = rentInvest * (1 + mktRet / 100) + -flow;
    else rentInvest = rentInvest * (1 + mktRet / 100);

    yearRent *= 1 + rentGrow / 100;

    const ownEquity = homeVal - loanBal;
    const sellCost = homeVal * 0.06;
    const ownNetIfSold = ownEquity - sellCost + ownInvest;
    path.push({ y, ownNet: ownNetIfSold, rentNet: rentInvest, homeVal, loanBal, ownInvest });
  }

  // Embedded mortgage value: PV of payment stream at market rate minus remaining balance
  const remainingMonths = Math.max(1, (30 - years) * 12);
  const mr = mktRate / 100 / 12;
  const pvAtMarket =
    mr === 0
      ? monthlyPmt * remainingMonths
      : (monthlyPmt * (1 - Math.pow(1 + mr, -remainingMonths))) / mr;
  const mortgageEmbeddedValue = path[path.length - 1].loanBal - pvAtMarket;

  return { path, monthlyPmt, mortgageEmbeddedValue, loanK, dpK };
}

export interface Preset extends ScenarioInputs {
  name: string;
  note: string;
}

export const PRESETS: Preset[] = [
  {
    name: "Locked in at 3%",
    price: 500,
    dp: 20,
    mortRate: 3.0,
    mktRate: 7.0,
    rent: 2400,
    hpiGrow: 3.0,
    rentGrow: 3.5,
    mktRet: 7.0,
    years: 15,
    note:
      "Bought in 2021. Current market rate is far higher — your mortgage is itself worth $80–100k. Selling means giving it back.",
  },
  {
    name: "Buying at 7%",
    price: 500,
    dp: 20,
    mortRate: 7.0,
    mktRate: 7.0,
    rent: 2400,
    hpiGrow: 3.0,
    rentGrow: 3.5,
    mktRet: 7.0,
    years: 15,
    note:
      "Buying today. Mortgage has no embedded value. Math is much tighter — rent often wins on a 5–7y horizon.",
  },
  {
    name: "HCOL renter",
    price: 900,
    dp: 20,
    mortRate: 7.0,
    mktRate: 7.0,
    rent: 3200,
    hpiGrow: 2.5,
    rentGrow: 4.0,
    mktRet: 7.0,
    years: 15,
    note:
      "Coastal-city math. Rent is much lower than carrying costs at current rates. Buying loses on a long horizon unless price appreciation is unusually strong.",
  },
  {
    name: "Short stay (4y)",
    price: 450,
    dp: 20,
    mortRate: 6.5,
    mktRate: 6.5,
    rent: 2200,
    hpiGrow: 3.0,
    rentGrow: 3.5,
    mktRet: 7.0,
    years: 4,
    note:
      "Selling costs (6%) and slow principal paydown in early years usually make buying lose on horizons < 5y, even in a good market.",
  },
  {
    name: "Long stay (25y)",
    price: 450,
    dp: 20,
    mortRate: 6.5,
    mktRate: 6.5,
    rent: 2200,
    hpiGrow: 3.0,
    rentGrow: 3.5,
    mktRet: 7.0,
    years: 25,
    note:
      "Long horizon. Rent compounds at 3.5%/yr; mortgage payment is fixed in nominal terms. Owning usually wins past 12–15 years.",
  },
];

export function formatMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${n < 0 ? "−" : ""}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${n < 0 ? "−" : ""}$${(abs / 1e3).toFixed(0)}k`;
  return `${n < 0 ? "−" : ""}$${Math.round(abs)}`;
}
