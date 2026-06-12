/**
 * Bubble detection (F3).
 *
 * You can't call the top — but you can size where you are. Dial the public
 * indicators the node names (valuation, leverage, credit growth, price
 * acceleration, retail froth) and read a composite bubble-risk score. The
 * lesson is confluence: no single dial proves a bubble, and a credit-fuelled
 * one is far more dangerous than mere expensive valuation, because it's the
 * leverage that turns a deflation into a crisis.
 *
 * Pure compute.
 */

export interface Inputs {
  /** Valuation vs long-run history (0 = cheap, 100 = record-stretched). */
  valuation: number;
  /** Leverage funding the position (margin debt, LTVs). */
  leverage: number;
  /** Speed of credit expansion into the asset. */
  creditGrowth: number;
  /** Price acceleration — is it going parabolic? */
  acceleration: number;
  /** Retail froth / "everyone's in" / this-time-is-different narrative. */
  froth: number;
}

export const DEFAULT_INPUTS: Inputs = {
  valuation: 55,
  leverage: 35,
  creditGrowth: 30,
  acceleration: 40,
  froth: 45,
};

// Credit/leverage weigh most: a credit-fuelled bubble is the one that becomes a crisis.
const WEIGHTS: Record<keyof Inputs, number> = {
  leverage: 0.26,
  creditGrowth: 0.24,
  acceleration: 0.2,
  froth: 0.16,
  valuation: 0.14,
};

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  inputs: Inputs;
}

export const PRESETS: Preset[] = [
  {
    id: "dotcom",
    name: "Dot-com 2000",
    blurb: "Valuations off the charts, price parabolic, retail mania total — but leverage modest. It popped hard, yet the damage stayed mostly in equities: little credit to transmit it into a banking crisis.",
    inputs: { valuation: 98, leverage: 35, creditGrowth: 40, acceleration: 88, froth: 95 },
  },
  {
    id: "housing07",
    name: "US housing 2007",
    blurb: "The dangerous kind. Valuation high, but the story is leverage and credit growth — the whole thing was built on mortgage debt. That's why its collapse became a systemic crisis, not just a drawdown.",
    inputs: { valuation: 78, leverage: 92, creditGrowth: 90, acceleration: 60, froth: 80 },
  },
  {
    id: "crypto21",
    name: "Crypto 2021",
    blurb: "Parabolic price and total froth, with real leverage stacked on top via crypto lending. High composite risk — and the leverage made the unwind cascade.",
    inputs: { valuation: 85, leverage: 70, creditGrowth: 55, acceleration: 95, froth: 96 },
  },
  {
    id: "expensive",
    name: "Expensive, not a bubble",
    blurb: "High valuation, but no leverage, no credit surge, no parabola, no mania. Expensive is not the same as a bubble — a pricey market funded by equity can de-rate slowly without a crisis.",
    inputs: { valuation: 80, leverage: 20, creditGrowth: 18, acceleration: 25, froth: 22 },
  },
  {
    id: "calm",
    name: "Calm market",
    blurb: "Everything middling-to-low. No confluence, no warning. Most of the time, this is what the dials read — which is why a permabear is wrong far more often than right.",
    inputs: { valuation: 40, leverage: 25, creditGrowth: 25, acceleration: 20, froth: 25 },
  },
];

export interface Indicator {
  key: keyof Inputs;
  label: string;
  value: number;
}

export interface Result {
  score: number;
  band: "calm" | "frothy" | "warning" | "mania";
  tone: "green" | "gold" | "red";
  indicators: Indicator[];
  /** True when credit/leverage dominate — the systemic-risk case. */
  creditFuelled: boolean;
  verdict: string;
}

const LABELS: Record<keyof Inputs, string> = {
  valuation: "Valuation vs history",
  leverage: "Leverage funding it",
  creditGrowth: "Credit growth",
  acceleration: "Price acceleration",
  froth: "Retail froth / narrative",
};

export function compute(inputs: Inputs): Result {
  const keys = Object.keys(WEIGHTS) as (keyof Inputs)[];
  const score = keys.reduce((s, k) => s + inputs[k] * WEIGHTS[k], 0);

  const band: Result["band"] =
    score < 30 ? "calm" : score < 55 ? "frothy" : score < 75 ? "warning" : "mania";
  const tone: Result["tone"] = band === "calm" ? "green" : band === "frothy" ? "gold" : "red";

  const indicators: Indicator[] = keys
    .map((k) => ({ key: k, label: LABELS[k], value: inputs[k] }))
    .sort((a, b) => b.value - a.value);

  const creditFuelled = (inputs.leverage + inputs.creditGrowth) / 2 > 65;

  let verdict: string;
  if (band === "calm") {
    verdict =
      "No confluence. A high reading on any one dial isn't a bubble — and the dials are quiet. The honest call here is to stay invested, not to hunt for a top.";
  } else if (creditFuelled && score >= 55) {
    verdict =
      "This is the dangerous kind: leverage and credit are funding it, so a fall won't stay contained — forced selling turns a drawdown into a crisis. Size down the risk you carry, don't bet on the exact top.";
  } else if (band === "frothy" || (score >= 55 && !creditFuelled)) {
    verdict =
      "Stretched, but not credit-fuelled — expensive isn't the same as a bubble. A market funded by equity can de-rate slowly without a crisis. Trim, don't panic.";
  } else {
    verdict =
      "High composite risk from price and froth. Even without heavy leverage, mania reverses violently. You can't time the top, so the response is position sizing through the late innings.";
  }

  return { score, band, tone, indicators, creditFuelled, verdict };
}
