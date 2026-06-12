/**
 * Career resilience scorer (H4).
 *
 * The user picks a sector + a few personal modifiers and gets back:
 *   - cyclicality (early / mid / late / counter-cyclical) — when does
 *     hiring in this sector peak relative to the macro cycle
 *   - a resilience score 0-100 combining sector base + skill liquidity +
 *     geographic mobility + tenure
 *   - cycle-aware advice keyed to the four cycle phases
 *
 * Pure compute, no DOM, no globals.
 */

export type CyclePhase = "early" | "mid" | "late" | "counter";

export interface Sector {
  id: string;
  name: string;
  phase: CyclePhase;
  /** Base resilience contribution before personal modifiers (0-50). */
  base: number;
  /** One-line description of where this sector sits in the cycle. */
  note: string;
}

export const SECTORS: Sector[] = [
  { id: "tech",        name: "Tech / software",       phase: "early",    base: 22, note: "Leads up; leads down. First-cut, first-rehire. Volatile compensation, high optionality." },
  { id: "finance",     name: "Finance / banking",     phase: "early",    base: 24, note: "Tracks the credit cycle directly. Big bonuses late-cycle; deep cuts in contractions." },
  { id: "marketing",   name: "Advertising / marketing", phase: "early",  base: 18, note: "Discretionary spend. First budget cut when revenue softens; rebounds fast on recovery." },
  { id: "manufacturing", name: "Manufacturing",       phase: "mid",      base: 26, note: "Mid-cycle hiring; tracks capex cycles. Geographic concentration matters." },
  { id: "construction", name: "Construction / real estate", phase: "mid", base: 20, note: "Highly cyclical — booms in rate-cuts, busts on tightening. Hiring lags rates by 6-12 months." },
  { id: "autos",       name: "Autos",                 phase: "mid",      base: 22, note: "Big-ticket cyclical. Demand collapses fast in recessions; hiring follows." },
  { id: "retail",      name: "Retail / hospitality",  phase: "mid",      base: 18, note: "Tied to consumer confidence. Wage gains in tight labor markets; first to feel slowdown." },
  { id: "professional", name: "Professional services (law, consulting)", phase: "late", base: 30, note: "Late-cycle peak hiring; downsizes through attrition in downturns." },
  { id: "energy",      name: "Energy",                phase: "late",     base: 28, note: "Late-cycle cyclical, often inflationary. Bonuses peak in commodity bulls." },
  { id: "healthcare",  name: "Healthcare",            phase: "counter",  base: 38, note: "Demand grows in good times AND bad. Aging population guarantees structural growth." },
  { id: "public",      name: "Public sector / education", phase: "counter", base: 36, note: "Pay lags but employment is stable. Counter-cyclical hiring during recessions." },
  { id: "utilities",   name: "Utilities",             phase: "counter",  base: 34, note: "Demand inelastic. Stable employment; modest growth; rate-sensitive valuations." },
];

export interface Inputs {
  sectorId: string;
  /** Years in current role / industry. */
  tenure: number;
  /** 0-100: how transferable are your skills outside your sector? */
  skillLiquidity: number;
  /** 0-100: how willing/able are you to relocate for work? */
  geoMobility: number;
}

export const DEFAULT_INPUTS: Inputs = {
  sectorId: "tech",
  tenure: 5,
  skillLiquidity: 50,
  geoMobility: 50,
};

export interface Score {
  total: number;        // 0-100
  band: "low" | "moderate" | "strong";
  phase: CyclePhase;
  sectorName: string;
  /** What the user should be paying attention to. */
  advice: string;
  /** Where each point came from. */
  contributions: {
    sectorBase: number;
    tenure: number;
    skillLiquidity: number;
    geoMobility: number;
  };
}

const PHASE_ADVICE: Record<CyclePhase, { hot: string; cold: string }> = {
  early: {
    hot:  "Early-cycle: this sector hires aggressively in the first 18 months of recovery. If you're not in, get in. Wages reset upward fastest here.",
    cold: "Early-cycle sectors get cut first in downturns. Build runway, document skills, network outside the sector before the next rotation.",
  },
  mid: {
    hot:  "Mid-cycle: peak hiring and peak negotiation leverage. Lock in or use offers as leverage. Refinance long-term commitments here.",
    cold: "Mid-cycle sectors trail by 6-12 months in downturns — you have lead time but not infinite time. Update résumé before headlines do.",
  },
  late: {
    hot:  "Late-cycle: bonuses peak just before they vanish. The right move is to take them and prepare for the turn, not extrapolate.",
    cold: "Late-cycle hiring tightens before it cuts. Negotiating leverage is collapsing; if you have an offer in hand, this is the moment.",
  },
  counter: {
    hot:  "Counter-cyclical sectors keep hiring through recessions. Your sector's peak hiring lags general macro by quarters. Patience pays.",
    cold: "Counter-cyclical hiring continues — but pay rises slowly. Mobility into the sector during downturns is unusually attractive.",
  },
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function score(inputs: Inputs): Score {
  const sector = SECTORS.find((s) => s.id === inputs.sectorId) ?? SECTORS[0];

  // Tenure: diminishing returns past 10y; max +15.
  const tenurePoints = clamp(Math.min(inputs.tenure, 10) * 1.5, 0, 15);
  // Skill liquidity: 0-100 input maps to 0-20 points (transferable skills
  // are the strongest moderator on cyclical sectors).
  const skillPoints = clamp((inputs.skillLiquidity / 100) * 20, 0, 20);
  // Geographic mobility: 0-100 → 0-15 points (mostly matters when local
  // labor markets are weaker than national).
  const geoPoints = clamp((inputs.geoMobility / 100) * 15, 0, 15);

  const total = clamp(
    sector.base + tenurePoints + skillPoints + geoPoints,
    0,
    100,
  );

  const band: Score["band"] =
    total >= 70 ? "strong" : total >= 50 ? "moderate" : "low";

  // For now, write advice as if the cycle is in mid-expansion (the
  // common case). A real version would read the live regime from
  // /regime. The hot path is the default; the cold note is shown
  // alongside.
  const advice = PHASE_ADVICE[sector.phase].hot;

  return {
    total,
    band,
    phase: sector.phase,
    sectorName: sector.name,
    advice,
    contributions: {
      sectorBase: sector.base,
      tenure: tenurePoints,
      skillLiquidity: skillPoints,
      geoMobility: geoPoints,
    },
  };
}

export function phaseLabel(p: CyclePhase): string {
  switch (p) {
    case "early":   return "Early-cycle";
    case "mid":     return "Mid-cycle";
    case "late":    return "Late-cycle";
    case "counter": return "Counter-cyclical";
  }
}

export function bandTone(band: Score["band"]): "red" | "gold" | "green" {
  return band === "low" ? "red" : band === "moderate" ? "gold" : "green";
}
