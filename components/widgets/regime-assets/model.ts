/**
 * Regime × assets matrix (H2).
 *
 * Pure-data widget. The four canonical regimes (growth-up/down × inflation-
 * up/down) and the asset classes whose historical real returns differ most
 * across them. Numbers are approximate long-sample (post-1970) averages for
 * US-listed assets in real terms; they're educational summaries, not a
 * factsheet.
 *
 * The widget lets the user pick a regime and see which assets dominated
 * historically — including which combinations broke a conventional 60/40.
 */

export type RegimeKey =
  | "disinflationary-boom"
  | "disinflationary-bust"
  | "inflationary-boom"
  | "stagflation";

export interface Regime {
  key: RegimeKey;
  /** Short display name. */
  short: string;
  /** Long descriptive name. */
  long: string;
  /** Growth direction relative to trend. */
  growth: "up" | "down";
  /** Inflation direction relative to target. */
  inflation: "up" | "down";
  /** Era examples. */
  era: string;
  /** What the regime feels like in real life. */
  blurb: string;
}

export const REGIMES: Regime[] = [
  {
    key: "disinflationary-boom",
    short: "Disinflationary boom",
    long: "Growth up, inflation down",
    growth: "up",
    inflation: "down",
    era: "1995-99 · 2017-19",
    blurb: "The Goldilocks regime. Stocks dominate; bonds carry. Cash earns little; commodities lag. The 60/40 portfolio's natural habitat.",
  },
  {
    key: "disinflationary-bust",
    short: "Disinflationary bust",
    long: "Growth down, inflation down",
    growth: "down",
    inflation: "down",
    era: "2008-09 · early 2020",
    blurb: "Recession with falling inflation. Long bonds dominate as rates collapse; stocks fall hard until easing kicks in. Cash competes; gold modest. The textbook bond rally.",
  },
  {
    key: "inflationary-boom",
    short: "Inflationary boom",
    long: "Growth up, inflation up",
    growth: "up",
    inflation: "up",
    era: "1968-69 · 2004-07 · 2021",
    blurb: "Demand-driven inflation. Real assets (gold, commodities, real estate) dominate; stocks mixed (cyclicals OK, growth penalised); bonds lose to inflation. The 'reflation' trade.",
  },
  {
    key: "stagflation",
    short: "Stagflation",
    long: "Growth down, inflation up",
    growth: "down",
    inflation: "up",
    era: "1974-82 · brief 2022",
    blurb: "The regime that breaks 60/40. Stocks AND bonds lose real value simultaneously. Gold, commodities, and TIPS are the only assets that hold value. The hardest regime to be unprepared for.",
  },
];

export type AssetKey =
  | "stocks"
  | "long-bonds"
  | "cash"
  | "gold"
  | "commodities"
  | "tips";

export interface Asset {
  key: AssetKey;
  label: string;
  /** Real returns (% per year, approximate long-sample averages) per regime. */
  returns: Record<RegimeKey, number>;
}

export const ASSETS: Asset[] = [
  {
    key: "stocks",
    label: "Stocks (S&P 500)",
    returns: {
      "disinflationary-boom": 14,
      "disinflationary-bust": -8,
      "inflationary-boom": 4,
      "stagflation": -8,
    },
  },
  {
    key: "long-bonds",
    label: "Long Treasuries (20y+)",
    returns: {
      "disinflationary-boom": 6,
      "disinflationary-bust": 12,
      "inflationary-boom": -2,
      "stagflation": -10,
    },
  },
  {
    key: "cash",
    label: "Cash / T-bills",
    returns: {
      "disinflationary-boom": 1,
      "disinflationary-bust": 1,
      "inflationary-boom": -1,
      "stagflation": -3,
    },
  },
  {
    key: "gold",
    label: "Gold",
    returns: {
      "disinflationary-boom": -2,
      "disinflationary-bust": 4,
      "inflationary-boom": 8,
      "stagflation": 14,
    },
  },
  {
    key: "commodities",
    label: "Broad commodities",
    returns: {
      "disinflationary-boom": -3,
      "disinflationary-bust": -6,
      "inflationary-boom": 12,
      "stagflation": 11,
    },
  },
  {
    key: "tips",
    label: "TIPS (inflation-linked)",
    returns: {
      "disinflationary-boom": 2,
      "disinflationary-bust": 5,
      "inflationary-boom": 4,
      "stagflation": 1,
    },
  },
];

/* ----------------------------- Derivations ----------------------------- */

export interface AssetVerdict {
  asset: Asset;
  returnPct: number;
  /** Rank within this regime (1 = highest). */
  rank: number;
  /** Tone for the cell: green wins, red loses, gold middle. */
  tone: "red" | "gold" | "green";
}

/**
 * For a chosen regime, score every asset and rank them. Top quartile = green,
 * bottom quartile = red, middle = gold. Useful for "which assets dominate
 * in this regime" answers.
 */
export function verdictsFor(regime: RegimeKey): AssetVerdict[] {
  const rows = ASSETS.map((a) => ({ asset: a, returnPct: a.returns[regime] }));
  const sorted = [...rows].sort((a, b) => b.returnPct - a.returnPct);
  const ranked = new Map(sorted.map((r, i) => [r.asset.key, i + 1]));

  return rows
    .map(({ asset, returnPct }) => {
      const rank = ranked.get(asset.key)!;
      const tone: AssetVerdict["tone"] =
        returnPct >= 5 ? "green" : returnPct <= -3 ? "red" : "gold";
      return { asset, returnPct, rank, tone };
    })
    .sort((a, b) => a.rank - b.rank);
}

/** Convenience lookup. */
export function findRegime(key: string): Regime | undefined {
  return REGIMES.find((r) => r.key === key);
}

/**
 * 60/40 nominal return implied by the table — sanity-checks the
 * pedagogical claim that stagflation breaks 60/40.
 */
export function sixtyFortyReturn(regime: RegimeKey): number {
  const stocks = ASSETS.find((a) => a.key === "stocks")!.returns[regime];
  const bonds = ASSETS.find((a) => a.key === "long-bonds")!.returns[regime];
  return 0.6 * stocks + 0.4 * bonds;
}
