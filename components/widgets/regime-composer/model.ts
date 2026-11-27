/** Single-period teaching scenarios. No history, measured trend, or cycle score. */
import { classifyLevel, type AxisKey, type AxisLevel, type AxisTone } from "@/lib/regime-classification";

export interface AxisRead {
  key: AxisKey;
  label: string;
  /** Preserve the input value; classification must not use a rounded display. */
  value: number;
  unit: string;
  level: AxisLevel;
  verdict: string;
  tone: AxisTone;
}

export interface Inputs {
  /** CPI YoY (%). */
  inflation: number;
  /** Effective federal funds rate (%). */
  fedFunds: number;
  /** Unemployment U-3 (%). */
  unemployment: number;
  /** SLOOS net % tightening — negative = easing, positive = tightening. */
  sloos: number;
}

export const DEFAULT_INPUTS: Inputs = {
  inflation: 2.5,
  fedFunds: 4.0,
  unemployment: 4.1,
  sloos: -3.0,
};

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  inputs: Inputs;
}

/** Illustrations, not dated observations. IDs remain stable for saved lab state. */
export const PRESETS: Preset[] = [
  {
    id: "current",
    name: "Illustrative baseline",
    blurb: "A hypothetical mix of above-reference inflation and money, lower unemployment, and net easing of lending standards. No direction of change is supplied.",
    inputs: DEFAULT_INPUTS,
  },
  {
    id: "2022",
    name: "Inflation surge illustration",
    blurb: "High annual inflation, an effective rate within the assumed reference band, low unemployment, and net tightening. These values do not reconstruct a historical month.",
    inputs: { inflation: 8.0, fedFunds: 2.5, unemployment: 3.6, sloos: 25 },
  },
  {
    id: "2009",
    name: "Weak employment illustration",
    blurb: "Low positive inflation, a low effective rate, high unemployment, and net tightening. The levels alone do not establish whether conditions are improving or worsening.",
    inputs: { inflation: 0.5, fedFunds: 0.2, unemployment: 10.0, sloos: 65 },
  },
  {
    id: "1979",
    name: "High inflation and unemployment",
    blurb: "Inflation, the effective rate, and unemployment are above the teaching bands; banks report net tightening. This is an illustration, not a dated historical snapshot.",
    inputs: { inflation: 11.0, fedFunds: 11.0, unemployment: 6.0, sloos: 30 },
  },
  {
    id: "1998",
    name: "Lower inflation with net easing",
    blurb: "Lower-band inflation, an above-reference effective rate, unemployment within its band, and net easing. The axes describe separate conditions, not an all-good regime.",
    inputs: { inflation: 2.2, fedFunds: 5.0, unemployment: 4.5, sloos: -10 },
  },
];

export interface RegimeRead {
  axes: AxisRead[];
  headline: string;
  detail: string;
}

export function compose(inputs: Inputs): RegimeRead {
  const readings: { key: AxisKey; label: string; value: number }[] = [
    { key: "inflation", label: "Inflation (CPI YoY)", value: inputs.inflation },
    { key: "money", label: "Money (effective Fed funds)", value: inputs.fedFunds },
    { key: "labor", label: "Labor (U-3 unemployment)", value: inputs.unemployment },
    { key: "credit", label: "Credit (SLOOS net % tightening)", value: inputs.sloos },
  ];
  return {
    axes: readings.map((reading) => ({ ...reading, unit: "%", ...classifyLevel(reading.key, reading.value) })),
    headline: "Single-period scenario; direction unavailable",
    detail: "Each input is classified independently against the reference stated below. Without earlier observations, these levels cannot establish a trend, turning point, or confidence in one economic cycle.",
  };
}
