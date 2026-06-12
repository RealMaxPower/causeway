/**
 * Price as information (B2).
 *
 * An order-book price-discovery sim. Buyers carry private valuations and
 * sellers private costs — "distributed decisions" no one else can see. They
 * aggregate into a demand curve (bids, sorted high→low) and a supply curve
 * (asks, sorted low→high); where they cross is the clearing price. The point
 * Hayek made in 1945: that single number emerges from everyone's private
 * knowledge, and no participant knew it in advance.
 *
 * The controls map to B2's thesis:
 *   - demandShift  → a demand shock (news/hype); the price moves, and the move IS the signal.
 *   - infoNoise    → how well-informed the orders are; noisy orders make a "confidently wrong" price.
 *   - traders      → market depth; thin markets discover unreliable prices.
 *
 * Deterministic (fixed PRNG seed) so it's a controlled teaching tool, not a
 * random jitter. Pure compute — no DOM, no I/O.
 */

export const FUNDAMENTAL = 50;
const HALF_SPREAD = 22; // gives the demand/supply schedules a real slope
const SEED = 0x9e3779b1;

export interface Inputs {
  /** Demand shock: shifts buyer valuations ($). */
  demandShift: number;
  /** How noisy/uninformed the orders are (0 = perfectly informed). */
  infoNoise: number;
  /** Number of buyers = number of sellers (market depth). */
  traders: number;
}

export const DEFAULT_INPUTS: Inputs = { demandShift: 0, infoNoise: 3, traders: 28 };

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  inputs: Inputs;
}

export const PRESETS: Preset[] = [
  {
    id: "deep",
    name: "Deep, informed market",
    blurb: "Many traders, clean information. The bids and asks pack tightly around value, so the clearing price is a sharp signal you can trust.",
    inputs: { demandShift: 0, infoNoise: 3, traders: 28 },
  },
  {
    id: "surge",
    name: "Demand surge (hype)",
    blurb: "News lifts every buyer's valuation. Watch the clearing price jump — that movement is the market broadcasting a new collective belief, before any single trader could explain why.",
    inputs: { demandShift: 18, infoNoise: 5, traders: 24 },
  },
  {
    id: "thin",
    name: "Thin market",
    blurb: "Only a handful of orders. One trader moves the price; discovery is unreliable. This is why you distrust prices where transactions are rare.",
    inputs: { demandShift: 0, infoNoise: 5, traders: 5 },
  },
  {
    id: "noisy",
    name: "Bad information (panic)",
    blurb: "Plenty of orders, but they're badly informed — rumour, fear, guesswork. The price still looks precise to the last cent, and it's confidently wrong.",
    inputs: { demandShift: -6, infoNoise: 26, traders: 22 },
  },
];

/* -------------------------- Order book -------------------------- */

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface OrderBook {
  /** Bids, sorted high → low. */
  demand: number[];
  /** Asks, sorted low → high. */
  supply: number[];
  clearingPrice: number;
  /** Units that actually trade. */
  quantity: number;
}

/** Build the book for a given noise level; noiseScale 0 = perfectly informed. */
function buildBook(inputs: Inputs, noiseScale: number): OrderBook {
  const n = Math.max(2, Math.round(inputs.traders));
  const rng = mulberry32(SEED);
  const buyerMean = FUNDAMENTAL + inputs.demandShift;
  const sellerMean = FUNDAMENTAL;

  const demand: number[] = [];
  const supply: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : 1 - (2 * i) / (n - 1); // +1 … −1
    const bidNoise = (rng() * 2 - 1) * noiseScale;
    const askNoise = (rng() * 2 - 1) * noiseScale;
    demand.push(buyerMean + HALF_SPREAD * t + bidNoise);
    supply.push(sellerMean - HALF_SPREAD * t + askNoise);
  }
  demand.sort((a, b) => b - a); // bids high → low
  supply.sort((a, b) => a - b); // asks low → high

  // Largest k where the k-th highest bid still meets the k-th lowest ask.
  let q = 0;
  for (let k = 0; k < n; k++) {
    if (demand[k] >= supply[k]) q = k + 1;
    else break;
  }
  const clearingPrice =
    q === 0
      ? (demand[0] + supply[0]) / 2
      : (demand[q - 1] + supply[q - 1]) / 2;

  return { demand, supply, clearingPrice, quantity: q };
}

export interface Read {
  tone: "green" | "gold" | "red";
  label: string;
  verdict: string;
}

export interface Discovery {
  book: OrderBook;
  /** Clearing price with the same inputs but zero noise — the "informed" reference. */
  cleanPrice: number;
  traders: number;
  read: Read;
  /** Hayek line: the price emerged from N private decisions. */
  emergence: string;
}

export function discover(inputs: Inputs): Discovery {
  const book = buildBook(inputs, inputs.infoNoise);
  const cleanPrice = buildBook(inputs, 0).clearingPrice;
  const gap = Math.abs(book.clearingPrice - cleanPrice);
  const orders = Math.max(2, Math.round(inputs.traders)) * 2;

  let read: Read;
  if (inputs.traders < 8) {
    read = {
      tone: "red",
      label: "thin / unreliable",
      verdict:
        "Too few orders for real discovery — one trader swings the price. Distrust prices where transactions are this rare.",
    };
  } else if (inputs.infoNoise > 16 && gap > 4) {
    read = {
      tone: "red",
      label: "confidently wrong",
      verdict:
        "The price reads precise to the cent, but the orders feeding it are badly informed. It's wrong by exactly the amount the inputs are wrong.",
    };
  } else if (inputs.infoNoise <= 8) {
    read = {
      tone: "green",
      label: "sharp signal",
      verdict:
        "Deep market, clean information — the clearing price is a trustworthy estimate of value. Good information in, good price out.",
    };
  } else {
    read = {
      tone: "gold",
      label: "usable, with humility",
      verdict:
        "A workable read, but the orders carry real noise — treat the last digit as guesswork, not truth.",
    };
  }

  return {
    book,
    cleanPrice,
    traders: Math.max(2, Math.round(inputs.traders)),
    read,
    emergence: `No single trader knew $${book.clearingPrice.toFixed(0)} in advance — it emerged from ${orders} private decisions.`,
  };
}

export function formatPrice(n: number): string {
  return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}
