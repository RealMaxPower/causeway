/**
 * Three jobs of money (A2).
 *
 * The trilemma made manipulable: pick a monetary substrate (or dial the three
 * underlying properties by hand) and watch how it scores on money's three
 * jobs — medium of exchange, unit of account, store of value. The teaching
 * point is that pushing one property up usually pulls another job down: no
 * money aces all three at once.
 *
 * The scores are a deliberately simple, monotonic model — the bands (strong /
 * workable / strained / broken) carry the lesson, not false-precision numbers.
 *
 * Pure compute. No DOM, no I/O.
 */

export type JobKey = "moe" | "uoa" | "sov";
export type Band = "strong" | "workable" | "strained" | "broken";

export interface Inputs {
  /** Annual inflation (%). Deflation is negative. */
  inflation: number;
  /** Short-run volatility of purchasing power (%). Gold ~15, crypto ~70, fiat ~2. */
  volatility: number;
  /** How widely accepted & convenient for everyday payment (0–100). */
  acceptance: number;
}

export const DEFAULT_INPUTS: Inputs = {
  inflation: 2.5,
  volatility: 2,
  acceptance: 95,
};

export interface JobRead {
  key: JobKey;
  label: string;
  /** What this job most wants from money. */
  prefers: string;
  /** 0–100. */
  score: number;
  band: Band;
  verdict: string;
}

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  inputs: Inputs;
}

/**
 * Five substrates, each a different corner of the trilemma. Numbers are
 * representative readings, not precise measurements — the point is the shape
 * of the trade-off, not the decimals.
 */
export const PRESETS: Preset[] = [
  {
    id: "fiat",
    name: "Modern fiat",
    blurb: "A well-run fiat currency: spends everywhere, prices stay legible, and it loses value only slowly. The everyday winner — but a mediocre long-run store of value.",
    inputs: { inflation: 2.5, volatility: 2, acceptance: 95 },
  },
  {
    id: "gold",
    name: "Gold standard",
    blurb: "Scarce and durable: a strong store of value, but clumsy to spend at the grocery store and prone to deflationary swings.",
    inputs: { inflation: 0, volatility: 15, acceptance: 25 },
  },
  {
    id: "bitcoin",
    name: "Bitcoin",
    blurb: "Fixed supply, but wild price swings. The volatility breaks it as everyday money and strains it as a store of value — closer to a speculative asset than money today.",
    inputs: { inflation: 0, volatility: 70, acceptance: 20 },
  },
  {
    id: "stablecoin",
    name: "USD stablecoin",
    blurb: "Digital and pegged to the dollar: a legible unit of account and a dollar-grade store of value, with acceptance that's growing but not yet universal.",
    inputs: { inflation: 2.5, volatility: 1, acceptance: 62 },
  },
  {
    id: "hyperinflation",
    name: "Hyperinflation",
    blurb: "Inflation pinned at the chart's max (real episodes ran thousands of percent). Every job breaks at once: prices are meaningless, savings evaporate, and people flee to other money.",
    inputs: { inflation: 25, volatility: 70, acceptance: 30 },
  },
];

/* -------------------------- Scoring -------------------------- */

const clamp = (n: number) => Math.max(0, Math.min(100, n));

function band(score: number): Band {
  if (score >= 85) return "strong";
  if (score >= 60) return "workable";
  if (score >= 35) return "strained";
  return "broken";
}

/** Medium of exchange: mostly acceptance, wrecked by currency flight (very high inflation) and dampened by volatility. */
function readMoe(i: Inputs): JobRead {
  const flight = i.inflation > 20 ? (i.inflation - 20) * 2.5 : 0;
  const score = clamp(i.acceptance - flight - i.volatility * 0.25);
  const b = band(score);
  const verdict =
    b === "strong" ? "Spends anywhere, no friction."
    : b === "workable" ? "Usable, but not universally accepted."
    : b === "strained" ? "Accepted in pockets; awkward for daily payment."
    : "Rejected or impractical as everyday money.";
  return { key: "moe", label: "Medium of exchange", prefers: "convenience", score, band: b, verdict };
}

/** Unit of account: a stable measuring stick. Best near ~2% inflation; punished by deviation and volatility. */
function readUoa(i: Inputs): JobRead {
  const score = clamp(100 - Math.abs(i.inflation - 2) * 3 - i.volatility * 0.7);
  const b = band(score);
  const verdict =
    b === "strong" ? "Prices and contracts stay legible over time."
    : b === "workable" ? "Mostly stable; long contracts need indexing."
    : b === "strained" ? "Repricing is constant; menus and contracts lag."
    : "Prices are meaningless — the measuring stick won't hold still.";
  return { key: "uoa", label: "Unit of account", prefers: "stability", score, band: b, verdict };
}

/** Store of value: holds purchasing power. Eroded directly by inflation, discounted by volatility. */
function readSov(i: Inputs): JobRead {
  const score = clamp(100 - Math.max(0, i.inflation) * 6 - i.volatility * 0.8);
  const b = band(score);
  const verdict =
    b === "strong" ? "Holds purchasing power across years."
    : b === "workable" ? "Erodes slowly; fine for a few years, not a lifetime."
    : b === "strained" ? "Loses real value fast, or swings too much to trust."
    : "Savings evaporate — useless for storing wealth.";
  return { key: "sov", label: "Store of value", prefers: "scarcity", score, band: b, verdict };
}

export interface Scorecard {
  jobs: JobRead[];
  /** "Strong store of value · broken medium of exchange" style summary. */
  headline: string;
  /** One-line interpretation of the trade-off on display. */
  read: string;
}

export function score(inputs: Inputs): Scorecard {
  const jobs = [readMoe(inputs), readUoa(inputs), readSov(inputs)];

  const strong = jobs.filter((j) => j.band === "strong");
  const broken = jobs.filter((j) => j.band === "broken");
  const best = [...jobs].sort((a, b) => b.score - a.score)[0];
  const worst = [...jobs].sort((a, b) => a.score - b.score)[0];

  const headline =
    strong.length === 3
      ? "Rare: does all three jobs well"
      : broken.length === 3
        ? "All three jobs broken"
        : `${cap(best.band)} ${best.label.toLowerCase()} · ${worst.band} ${worst.label.toLowerCase()}`;

  const read =
    strong.length === 3
      ? "Every job is strong at once — a corner almost nothing reaches and never for long."
      : broken.length === 3
        ? "When money fails, it fails at every job together; people switch to whatever still works."
        : `This money is best at being a ${best.label.toLowerCase()} and worst at being a ${worst.label.toLowerCase()}. That's the trilemma: improving one property tends to cost you another.`;

  return { jobs, headline, read };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function bandTone(b: Band): "green" | "gold" | "red" {
  switch (b) {
    case "strong": return "green";
    case "workable": return "green";
    case "strained": return "gold";
    case "broken": return "red";
  }
}
