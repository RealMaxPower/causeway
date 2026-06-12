/**
 * Phase-clock model — the C2 working model.
 *
 * The business cycle is one oscillator measured eight ways. Each indicator
 * is a sinusoid around the same cycle, shifted by a characteristic phase
 * offset. Leading indicators lead; coincident track; lagging trail. The
 * phase-shift values are pedagogical, not econometric.
 */

export const TAU = Math.PI * 2;

export type IndicatorKind = "leading" | "coincident" | "lagging";

export interface Indicator {
  id: string;
  name: string;
  kind: IndicatorKind;
  /** Radians offset along the unit cycle. */
  phaseShift: number;
  unit: string;
  base: number;
  amp: number;
  /** If true, a high value of the cycle pushes this indicator down. */
  invert?: boolean;
}

export const INDICATORS: Indicator[] = [
  { id: "yieldCurve", name: "Yield curve slope (10y-2y)", kind: "leading", phaseShift: -0.6 * Math.PI, unit: "bps", base: 80, amp: 130, invert: true },
  { id: "buildPerms", name: "Building permits", kind: "leading", phaseShift: -0.45 * Math.PI, unit: "% YoY", base: 5, amp: 18 },
  { id: "creditSpd", name: "HY credit spread", kind: "leading", phaseShift: 0.55 * Math.PI, unit: "bps", base: 480, amp: 350 },

  { id: "ip", name: "Industrial production", kind: "coincident", phaseShift: -0.05 * Math.PI, unit: "% YoY", base: 2.5, amp: 5.5 },
  { id: "retail", name: "Real retail sales", kind: "coincident", phaseShift: 0.0, unit: "% YoY", base: 2, amp: 4.5 },

  { id: "unemp", name: "Unemployment rate", kind: "lagging", phaseShift: 0.55 * Math.PI, unit: "%", base: 5, amp: 2.5 },
  { id: "coreInf", name: "Core inflation", kind: "lagging", phaseShift: 0.35 * Math.PI, unit: "%", base: 2.5, amp: 1.8 },
  { id: "wage", name: "Wage growth", kind: "lagging", phaseShift: 0.3 * Math.PI, unit: "% YoY", base: 3.5, amp: 1.5 },
];

export interface Phase {
  id: 1 | 2 | 3 | 4;
  name: string;
  range: [number, number];
  color: string;
  desc: string;
}

export const PHASES: Phase[] = [
  {
    id: 1,
    name: "Early expansion",
    range: [0, Math.PI / 2],
    color: "oklch(0.62 0.13 145)",
    desc: "Output rising from trough. Slack abundant. Inflation low. Curve steep. Fed easy.",
  },
  {
    id: 2,
    name: "Mid expansion",
    range: [Math.PI / 2, Math.PI],
    color: "oklch(0.65 0.12 95)",
    desc: "Growth at trend or above. Hiring strong. Inflation drifting up. Fed moving to neutral.",
  },
  {
    id: 3,
    name: "Late / peak",
    range: [Math.PI, (3 * Math.PI) / 2],
    color: "oklch(0.62 0.13 68)",
    desc: "Capacity constrained. Wages accelerating. Inflation above target. Fed tight. Curve flat or inverting.",
  },
  {
    id: 4,
    name: "Contraction",
    range: [(3 * Math.PI) / 2, TAU],
    color: "oklch(0.55 0.13 25)",
    desc: "Output falling. Unemployment rising. Inflation peaking then falling. Fed pivoting to ease.",
  },
];

export function valueAt(ind: Indicator, theta: number): number {
  const x = Math.sin(theta + ind.phaseShift);
  const sign = ind.invert ? -1 : 1;
  return ind.base + sign * ind.amp * x;
}

export function phaseAt(theta: number): Phase {
  const t = ((theta % TAU) + TAU) % TAU;
  if (t < Math.PI / 2) return PHASES[0];
  if (t < Math.PI) return PHASES[1];
  if (t < (3 * Math.PI) / 2) return PHASES[2];
  return PHASES[3];
}

/** Quick-snap presets — observable moments in the US postwar cycle. */
export interface CyclePreset {
  name: string;
  theta: number;
  caption: string;
}

export const CYCLE_PRESETS: CyclePreset[] = [
  { name: "2010 Q1 · Recovery", theta: 0.35, caption: "Output troughed; the curve is steep; unemployment still rising. Early-expansion archetype." },
  { name: "2015–16 · Mid-cycle", theta: Math.PI * 0.7, caption: "Growth at trend, no inflation, Fed dithering on liftoff. Mid-expansion drift." },
  { name: "2019 H2 · Late cycle", theta: Math.PI * 1.15, caption: "Yield curve inverted; spreads widening; unemployment still 3.5%. Classic late-cycle reading." },
  { name: "2008 Q4 · Crash", theta: Math.PI * 1.7, caption: "Output collapsing, credit frozen, unemployment climbing. Contraction in full." },
];
