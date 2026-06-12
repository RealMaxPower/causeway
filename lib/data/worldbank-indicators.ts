/**
 * Causeway · curated World Bank indicators.
 *
 * Hand-maintained catalogue — only the indicators the /compare route
 * exposes. Each entry has a stable code, a short display label, a unit,
 * an axis kind (linear vs log) for plotting, and the direction in which
 * "higher" is informally good or bad (used for tone hints in the UI,
 * not for any quant judgement).
 */

export type IndicatorKind = "linear" | "log";

export interface Indicator {
  code: string;
  label: string;
  short: string;
  unit: string;
  /** "log" for figures that span orders of magnitude across countries (GDP). */
  kind: IndicatorKind;
  blurb: string;
}

export const INDICATORS: Indicator[] = [
  {
    code: "NY.GDP.MKTP.CD",
    label: "GDP (current US$)",
    short: "GDP",
    unit: "USD",
    kind: "log",
    blurb: "Total output, current dollars. Log axis so the US and Mexico are comparable on one chart.",
  },
  {
    code: "NY.GDP.PCAP.CD",
    label: "GDP per capita (current US$)",
    short: "GDP / capita",
    unit: "USD",
    kind: "log",
    blurb: "Standard prosperity scoreboard, current dollars. Use PPP variants for purchasing-power comparisons.",
  },
  {
    code: "FP.CPI.TOTL.ZG",
    label: "Inflation (CPI, annual %)",
    short: "Inflation",
    unit: "%",
    kind: "linear",
    blurb: "Headline consumer-price inflation, annual.",
  },
  {
    code: "GC.DOD.TOTL.GD.ZS",
    label: "Central gov debt (% of GDP)",
    short: "Gov debt / GDP",
    unit: "%",
    kind: "linear",
    blurb: "Central government gross debt. National definitions vary; treat as directional.",
  },
  {
    code: "BX.KLT.DINV.CD.WD",
    label: "FDI net inflows (current US$)",
    short: "FDI",
    unit: "USD",
    kind: "linear",
    blurb: "Foreign direct investment, net inflows. Negative means net divestment.",
  },
  {
    code: "NE.EXP.GNFS.ZS",
    label: "Exports (% of GDP)",
    short: "Exports / GDP",
    unit: "%",
    kind: "linear",
    blurb: "Goods + services exports as share of GDP. The size of the export sector relative to the economy.",
  },
  {
    code: "NE.IMP.GNFS.ZS",
    label: "Imports (% of GDP)",
    short: "Imports / GDP",
    unit: "%",
    kind: "linear",
    blurb: "Goods + services imports as share of GDP.",
  },
  {
    code: "BN.CAB.XOKA.GD.ZS",
    label: "Current account (% of GDP)",
    short: "CA / GDP",
    unit: "%",
    kind: "linear",
    blurb: "Trade balance plus net income flows, as share of GDP. Persistent positives finance the world's deficits.",
  },
];

export function findIndicator(code: string): Indicator | undefined {
  return INDICATORS.find((i) => i.code === code);
}

/** Default selection — three indicators that pair well across most country mixes. */
export const DEFAULT_INDICATOR_CODES: string[] = [
  "NY.GDP.PCAP.CD",
  "FP.CPI.TOTL.ZG",
  "BN.CAB.XOKA.GD.ZS",
];

/** Hard cap on indicators per /compare view; keeps the page legible. */
export const MAX_INDICATORS = 4;
