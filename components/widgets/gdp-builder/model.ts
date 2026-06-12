/**
 * GDP, properly (C1).
 *
 * Build headline GDP from the expenditure identity (C + I + G + NX), then
 * apply the honesty adjustments the node is about: add the household and
 * volunteer production GDP misses, subtract the environmental cost it ignores,
 * subtract the defensive/cleanup spending it counts as growth. The gap between
 * the headline and the adjusted figure is the gap between scoreboard and score.
 *
 * Figures are in $ trillions, defaulted to rough US-2024 magnitudes. The
 * adjustments are illustrative — the point is the shape of the gap, not BEA
 * precision. Pure compute.
 */

export interface Inputs {
  c: number; // consumption
  i: number; // investment
  g: number; // government
  nx: number; // net exports (can be negative)
  household: number; // unpaid household + volunteer production GDP misses (+)
  environment: number; // resource depletion / pollution GDP ignores (−)
  defensive: number; // cleanup / replacement counted as growth (−)
}

export const DEFAULT_INPUTS: Inputs = {
  c: 19.8,
  i: 5.0,
  g: 4.9,
  nx: -0.9,
  household: 6.0,
  environment: 1.5,
  defensive: 1.0,
};

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  inputs: Inputs;
}

export const PRESETS: Preset[] = [
  {
    id: "us2024",
    name: "US 2024",
    blurb: "Rough actual magnitudes: consumption two-thirds of the total, a trade deficit netting out, ~$29T headline. The adjustments below it never appear in the number you read in the news.",
    inputs: { c: 19.8, i: 5.0, g: 4.9, nx: -0.9, household: 6.0, environment: 1.5, defensive: 1.0 },
  },
  {
    id: "disaster",
    name: "Disaster year",
    blurb: "A hurricane season. Rebuilding lifts investment and government spending, so headline GDP rises — but most of it is just replacing destroyed value. The defensive-spending adjustment eats the 'growth.'",
    inputs: { c: 19.8, i: 6.2, g: 6.0, nx: -0.9, household: 6.0, environment: 2.5, defensive: 3.2 },
  },
  {
    id: "care",
    name: "Care economy counted",
    blurb: "Same market economy, but we credit the unpaid work — childcare, eldercare, housework, volunteering. The adjusted figure jumps well above headline: trillions of real production are simply invisible to GDP.",
    inputs: { c: 19.8, i: 5.0, g: 4.9, nx: -0.9, household: 11.0, environment: 1.5, defensive: 1.0 },
  },
  {
    id: "dirty-growth",
    name: "Growth at any cost",
    blurb: "Headline booms on investment, but it's powered by depleting resources and dumping costs on the future. Subtract those and the adjusted figure barely moves — growth that isn't really making anyone richer.",
    inputs: { c: 20.5, i: 7.5, g: 4.9, nx: -1.2, household: 6.0, environment: 6.5, defensive: 1.5 },
  },
];

export interface Result {
  headline: number;
  adjusted: number;
  gap: number;
  components: { key: string; label: string; value: number }[];
  adjustments: { key: string; label: string; value: number; sign: 1 | -1 }[];
  read: { tone: "green" | "gold" | "red"; label: string; verdict: string };
}

export function compute(inputs: Inputs): Result {
  const headline = inputs.c + inputs.i + inputs.g + inputs.nx;
  const adjusted = headline + inputs.household - inputs.environment - inputs.defensive;
  const gap = adjusted - headline;

  const components = [
    { key: "c", label: "Consumption", value: inputs.c },
    { key: "i", label: "Investment", value: inputs.i },
    { key: "g", label: "Government", value: inputs.g },
    { key: "nx", label: "Net exports", value: inputs.nx },
  ];
  const adjustments = [
    { key: "household", label: "+ Household & volunteer work", value: inputs.household, sign: 1 as const },
    { key: "environment", label: "− Environmental cost", value: inputs.environment, sign: -1 as const },
    { key: "defensive", label: "− Defensive / cleanup spend", value: inputs.defensive, sign: -1 as const },
  ];

  const defensiveShare = headline > 0 ? inputs.defensive / headline : 0;
  let tone: "green" | "gold" | "red";
  let label: string;
  let verdict: string;
  if (defensiveShare > 0.08) {
    tone = "red";
    label = "growth ≠ progress";
    verdict =
      "A large share of this headline is defensive spending — replacing what was destroyed. GDP counts the rebuild as growth, but no one is better off than before.";
  } else if (inputs.household > headline * 0.28) {
    tone = "gold";
    label = "invisible production";
    verdict =
      "Most of the gap is unpaid work the headline can't see. The market economy is smaller than the real one — caregiving, housework and volunteering are simply uncounted.";
  } else if (inputs.environment > headline * 0.12) {
    tone = "red";
    label = "borrowed from the future";
    verdict =
      "The headline ignores the resource depletion and pollution funding this output. Net it out and the 'growth' is partly a transfer from the future.";
  } else {
    tone = "gold";
    label = "scoreboard, not score";
    verdict =
      "GDP tracks market activity well, but the adjustments below it — unpaid work, environmental cost, defensive spending — never show up in the headline you read.";
  }

  return { headline, adjusted, gap, components, adjustments, read: { tone, label, verdict } };
}

export function fmtT(n: number): string {
  return `$${n.toFixed(1)}T`;
}
