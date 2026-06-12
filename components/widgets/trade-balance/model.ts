/**
 * Trade balance simulator (D2).
 *
 * Pure-math personal calculator. The pedagogy: CA + KA = 0, always.
 * The user moves exports, imports, and the FDI-vs-portfolio composition
 * of capital flows, and watches the identity hold. The output frames
 * the configuration in regime terms ("hot-money deficit", "mercantilist
 * surplus", etc.) keyed to historical analogues.
 *
 * Numbers are all expressed as percent of GDP. No DOM, no globals.
 */

export type Regime =
  | "balanced"
  | "deficit-hot-money"
  | "deficit-productive"
  | "surplus-mercantile"
  | "surplus-productive";

export interface Inputs {
  /** Goods + services exports, % of GDP (0-50). */
  exports: number;
  /** Goods + services imports, % of GDP (0-50). */
  imports: number;
  /** 0-100: what share of the capital flow is direct investment (productive) vs portfolio (hot). */
  fdiShare: number;
}

export const DEFAULT_INPUTS: Inputs = {
  exports: 11,
  imports: 14,
  fdiShare: 25,
};

export interface CountryPreset {
  name: string;
  inputs: Inputs;
  note: string;
}

export const PRESETS: CountryPreset[] = [
  {
    name: "USA 2024",
    inputs: { exports: 11, imports: 14, fdiShare: 25 },
    note: "Persistent CA deficit ≈ 3% of GDP; absorbed mostly by Treasury issuance and equity inflows. The dollar's reserve role enables the imbalance to run for decades.",
  },
  {
    name: "Germany 2010s",
    inputs: { exports: 47, imports: 41, fdiShare: 35 },
    note: "Chronic surplus driven by wage moderation post-2003 Hartz reforms. Capital exported into peripheral Europe, EM debt, and US bonds. Surplus is downstream of who consumes inside Germany.",
  },
  {
    name: "China 2005",
    inputs: { exports: 36, imports: 26, fdiShare: 30 },
    note: "Mercantilist export model with managed exchange rate. Surplus recycled into US Treasuries via reserve accumulation. The textbook 'global savings glut' counterparty.",
  },
  {
    name: "Greece 2008",
    inputs: { exports: 22, imports: 36, fdiShare: 10 },
    note: "Imports financed by hot-money portfolio inflows under euro-area pricing. Membership masked the FX risk; the sudden stop arrived 2010-12.",
  },
  {
    name: "Argentina 2001",
    inputs: { exports: 11, imports: 14, fdiShare: 8 },
    note: "Currency-board peg + dollar-denominated debt. Identity held; the cost showed up in reserves and ultimately the peg itself.",
  },
];

export interface Result {
  /** Current account ≈ exports − imports (ignoring income flows). */
  tradeBalance: number;
  /** Capital account = −tradeBalance, by identity. */
  capitalAccount: number;
  /** FDI component of the capital flow, signed (% of GDP). */
  fdi: number;
  /** Portfolio component of the capital flow, signed. */
  portfolio: number;
  regime: Regime;
  /** One-line framing keyed to the regime. */
  story: string;
}

const STORIES: Record<Regime, string> = {
  balanced:
    "Trade roughly balanced. Capital flows correspondingly small. Identity is silent here — neither imbalance to absorb, nor leverage to build.",
  "deficit-hot-money":
    "Trade deficit financed mostly by portfolio inflows (bonds, equities). Cheap when capital is plentiful; brittle when foreign investors decide to leave. Greece 2008, Thailand 1996, Turkey 2018.",
  "deficit-productive":
    "Trade deficit financed mostly by direct investment in productive assets (factories, infrastructure). Sticky capital — harder to reverse in a panic. Mexico post-NAFTA, US absorbing inbound FDI booms.",
  "surplus-mercantile":
    "Surplus accumulating mostly as reserves and portfolio claims. The 'global savings glut' shape: country builds external claims rather than letting wages or imports rise. China 2003-2014.",
  "surplus-productive":
    "Surplus exported as direct investment abroad — buying factories, networks, and supply chains. Germany, Japan post-1980. Surplus + control, not surplus + dependency.",
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function compute(inputs: Inputs): Result {
  const tradeBalance = inputs.exports - inputs.imports;
  const capitalAccount = -tradeBalance;
  const fdiSharePct = clamp(inputs.fdiShare, 0, 100) / 100;
  const fdi = capitalAccount * fdiSharePct;
  const portfolio = capitalAccount - fdi;

  let regime: Regime;
  if (Math.abs(tradeBalance) < 1) {
    regime = "balanced";
  } else if (tradeBalance < 0) {
    regime = fdiSharePct > 0.5 ? "deficit-productive" : "deficit-hot-money";
  } else {
    regime = fdiSharePct > 0.5 ? "surplus-productive" : "surplus-mercantile";
  }

  return {
    tradeBalance,
    capitalAccount,
    fdi,
    portfolio,
    regime,
    story: STORIES[regime],
  };
}

export function regimeLabel(r: Regime): string {
  switch (r) {
    case "balanced":             return "Balanced";
    case "deficit-hot-money":    return "Hot-money deficit";
    case "deficit-productive":   return "Productive deficit";
    case "surplus-mercantile":   return "Mercantile surplus";
    case "surplus-productive":   return "Productive surplus";
  }
}

export function regimeTone(r: Regime): "red" | "gold" | "green" {
  switch (r) {
    case "deficit-hot-money":
    case "surplus-mercantile":
      return "red";
    case "balanced":
      return "gold";
    case "deficit-productive":
    case "surplus-productive":
      return "green";
  }
}

export function formatPct(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(1)}%`;
}
