/**
 * The dollar-smile model. Pure function — no DOM, no state, no globals.
 *
 * Two inputs:
 *   growth: US growth differential vs world, percentage points (-3..+3)
 *   risk:   Global risk-off intensity, 0..10
 *
 * Returns: implied DXY index value.
 *
 * The "smile" shape: DXY is high on the right (US exceptionalism), high
 * on the left (global panic → flight to dollar), low in the boring
 * middle (no reason to bid up the dollar).
 */

export function smileFor(growth: number, risk: number): number {
  const growthEffect = growth * 4;
  const riskEffect = Math.pow(risk, 1.4) * 1.5;
  // Penalty when both inputs are mild — the bottom of the smile
  const mildPenalty = Math.abs(growth) < 0.5 && risk < 3 ? -3 : 0;
  return 95 + growthEffect + riskEffect + mildPenalty;
}

/** Historical regime presets used as quick-jump buttons. */
export interface RegimePreset {
  name: string;
  growth: number;
  risk: number;
  label: string;
}

export const REGIME_PRESETS: RegimePreset[] = [
  {
    name: "1995–2001 · Strong dollar era",
    growth: 2.5,
    risk: 1,
    label: "US tech boom, Greenspan rates, world average. Dollar surges.",
  },
  {
    name: "2003–2008 · Boring middle",
    growth: -0.5,
    risk: 2,
    label: "Eurozone catches up, dollar drifts down. Pre-GFC complacency.",
  },
  {
    name: "2008 Q4 · GFC flight",
    growth: -1,
    risk: 9,
    label:
      "Despite US being epicentre, world flees to dollar safety. Smile's left side.",
  },
  {
    name: "2014–2016 · Taper + China",
    growth: 1.5,
    risk: 4,
    label: "Fed normalising, China slowing. Dollar runs hard.",
  },
  {
    name: "2020 Q1 · COVID spike",
    growth: -2,
    risk: 10,
    label:
      "Pandemic risk-off. Dollar spikes for 3 weeks until Fed swap lines flood.",
  },
  {
    name: "2022–2023 · Fed exceptionalism",
    growth: 1.8,
    risk: 6,
    label:
      "Fastest Fed hiking cycle in 40 years + Ukraine war risk. DXY hits 114.",
  },
];

export function regimeName(growth: number, risk: number): string {
  if (risk > 6) return "Risk-off rally";
  if (growth > 1) return "US exceptionalism";
  if (growth < -0.5 && risk < 4) return "Dollar weakness";
  return "Mixed / drift";
}

export function regimeCaption(growth: number, risk: number): string {
  if (risk > 6 && growth < 0.5) {
    return "Risk-off regime. Even with weak US growth, the dollar strengthens — the world is fleeing to it.";
  }
  if (risk < 4 && growth > 1) {
    return "US-exceptionalism regime. Capital chases higher US returns; dollar runs.";
  }
  if (risk < 4 && growth < 0.5) {
    return "Boring middle. No reason to bid up the dollar; it drifts down.";
  }
  if (risk > 5 && growth > 1) {
    return "Both forces pushing the dollar up. This is the punishing regime for the rest of the world.";
  }
  return "Mixed signals. The two forces partially cancel.";
}
