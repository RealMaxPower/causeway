/**
 * Comparative advantage (D1).
 *
 * A two-country, two-good Ricardian model. Each country has a labour
 * productivity for chips and for grain. The country that gives up less grain
 * per chip has the comparative advantage in chips; it specialises there, the
 * other in grain, and at any terms of trade between the two opportunity costs
 * BOTH can consume beyond their own production frontier.
 *
 * The widget shows each country's PPF (solid) and its post-trade budget line
 * (dashed, lying outside the PPF): the gap is the gain from trade. The terms-
 * of-trade slider shows how the price splits those gains — D1's "who wins"
 * question. And it holds even when one country is absolutely better at both,
 * which is the counterintuitive core of the idea.
 *
 * Pure compute. No DOM.
 */

const L = 100; // workers per country

export interface Inputs {
  homeChips: number; // chips per worker, Home
  homeGrain: number; // grain per worker, Home
  foreignChips: number;
  foreignGrain: number;
  /** Terms-of-trade position within the feasible band, 0..1. */
  split: number;
}

export const DEFAULT_INPUTS: Inputs = {
  homeChips: 8,
  homeGrain: 6,
  foreignChips: 2,
  foreignGrain: 4,
  split: 0.5,
};

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  inputs: Inputs;
}

export const PRESETS: Preset[] = [
  {
    id: "classic",
    name: "Absolute power, still gains",
    blurb: "Home is better at making both goods — yet it still pays both to trade. Home gives up less grain per chip, so it specialises in chips; Foreign in grain. Absolute advantage doesn't matter; comparative advantage does.",
    inputs: { homeChips: 8, homeGrain: 6, foreignChips: 2, foreignGrain: 4, split: 0.5 },
  },
  {
    id: "symmetric",
    name: "Mirror rivals",
    blurb: "Each country is twice as good at one good as the other. Clean, symmetric specialisation — the easiest case to see the gains.",
    inputs: { homeChips: 6, homeGrain: 3, foreignChips: 3, foreignGrain: 6, split: 0.5 },
  },
  {
    id: "none",
    name: "No comparative advantage",
    blurb: "Both countries have identical opportunity costs (the productivity ratios match). Nothing to gain from specialising — the trade lines collapse onto the frontiers. This is the boundary case.",
    inputs: { homeChips: 6, homeGrain: 3, foreignChips: 4, foreignGrain: 2, split: 0.5 },
  },
  {
    id: "lopsided",
    name: "Lopsided terms of trade",
    blurb: "Same productivities as the first preset, but the world price sits right next to Home's own opportunity cost. The aggregate gains are real — they just accrue almost entirely to Foreign. Who captures the gains is a separate question from whether they exist.",
    inputs: { homeChips: 8, homeGrain: 6, foreignChips: 2, foreignGrain: 4, split: 0.08 },
  },
];

export interface Pt {
  x: number; // chips
  y: number; // grain
}
export interface CountrySide {
  name: string;
  ppf: [Pt, Pt];
  autarky: Pt;
  trade: [Pt, Pt];
  caGood: "chips" | "grain";
  color: "home" | "foreign";
}
export interface Result {
  home: CountrySide;
  foreign: CountrySide;
  bounds: { xMax: number; yMax: number };
  price: number; // grain per chip (terms of trade)
  hasCA: boolean;
  read: { tone: "green" | "gold" | "red"; label: string; verdict: string };
}

export function compute(inputs: Inputs): Result {
  const { homeChips, homeGrain, foreignChips, foreignGrain, split } = inputs;

  const occH = homeGrain / homeChips; // grain given up per chip, Home
  const occF = foreignGrain / foreignChips;
  const homeCAchips = occH < occF;
  const hasCA = Math.abs(occH - occF) > 1e-6;

  const lo = Math.min(occH, occF);
  const hi = Math.max(occH, occF);
  const price = lo + split * (hi - lo);

  const side = (
    name: string,
    aChips: number,
    aGrain: number,
    caChips: boolean,
    color: "home" | "foreign",
  ): CountrySide => {
    const maxC = L * aChips;
    const maxG = L * aGrain;
    const ppf: [Pt, Pt] = [
      { x: maxC, y: 0 },
      { x: 0, y: maxG },
    ];
    const autarky: Pt = { x: maxC / 2, y: maxG / 2 };
    // Specialise in the CA good, then the budget line has slope = world price.
    const trade: [Pt, Pt] = caChips
      ? [
          { x: maxC, y: 0 }, // all chips
          { x: 0, y: maxC * price }, // export every chip for grain
        ]
      : [
          { x: 0, y: maxG }, // all grain
          { x: maxG / price, y: 0 }, // export every grain for chips
        ];
    return { name, ppf, autarky, trade, caGood: caChips ? "chips" : "grain", color };
  };

  const home = side("Home", homeChips, homeGrain, homeCAchips, "home");
  const foreign = side("Foreign", foreignChips, foreignGrain, !homeCAchips, "foreign");

  const xMax = Math.max(home.ppf[0].x, foreign.ppf[0].x, home.trade[1].x, foreign.trade[1].x) * 1.05;
  const yMax = Math.max(home.ppf[1].y, foreign.ppf[1].y, home.trade[1].y, foreign.trade[1].y) * 1.05;

  const homeAbsBoth = homeChips > foreignChips && homeGrain > foreignGrain;
  const foreignAbsBoth = foreignChips > homeChips && foreignGrain > homeGrain;

  let read: Result["read"];
  if (!hasCA) {
    read = {
      tone: "gold",
      label: "no gains here",
      verdict:
        "Both countries have the same opportunity cost, so neither is relatively better at anything. Specialising changes nothing — the trade lines sit right on the frontiers.",
    };
  } else if (homeAbsBoth || foreignAbsBoth) {
    const winner = homeAbsBoth ? "Home" : "Foreign";
    read = {
      tone: "green",
      label: "comparative > absolute",
      verdict: `${winner} is absolutely better at making both goods — and it still pays both countries to specialise and trade. Each consumes on a dashed line beyond its own frontier. Absolute advantage is a red herring; the relative cost is what drives trade.`,
    };
  } else if (split < 0.2 || split > 0.8) {
    const favored = split > 0.8 ? (home.caGood === "chips" ? "Home" : "Foreign") : home.caGood === "chips" ? "Foreign" : "Home";
    read = {
      tone: "gold",
      label: "lopsided gains",
      verdict: `The gains are real but unevenly split: at this world price, most of the surplus goes to ${favored}. Whether trade helps and who it helps are two different questions — D1's modern critique.`,
    };
  } else {
    read = {
      tone: "green",
      label: "mutual gains",
      verdict:
        "Each country specialises in its comparative-advantage good and consumes beyond its own production frontier. The gap between each solid PPF and its dashed trade line is that country's gain from trade.",
    };
  }

  return { home, foreign, bounds: { xMax, yMax }, price, hasCA, read };
}

export function occ(chips: number, grain: number): number {
  return grain / chips;
}
