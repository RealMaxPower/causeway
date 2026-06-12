/**
 * Causeway · personal playbook state + helpers.
 *
 * The /playbook route hosts a structured Q&A across the eight Track H
 * axes. This module owns the typed shape, localStorage persistence,
 * URL-encoded sharing, and the per-axis guidance derivation.
 *
 * All helpers are SSR-safe: `loadState` returns the empty state on the
 * server, and `saveState` is a no-op when `window` is undefined.
 */

import { base64UrlDecode, base64UrlEncode } from "./url-encoding";

export type RegimeChoice = "easing" | "neutral" | "tightening";
export type SavingStance =
  | "aggressive-cash"
  | "balanced"
  | "extending-duration";
export type HousingDecision =
  | "renting-watching"
  | "buying-soon"
  | "owner-locked"
  | "owner-trading-up";
export type CareerPhase = "early" | "mid" | "late" | "counter-cyclical";
export type BigPurchaseWindow =
  | "buy-now"
  | "wait-6mo"
  | "wait-12mo"
  | "no-window";
export type CurrencyStance =
  | "domestic-only"
  | "modest-fx"
  | "active-hedger";
export type DebtStance = "conservative" | "moderate" | "leveraged";
export type PortfolioDuration = "short" | "balanced" | "long";

export interface PlaybookState {
  regime: RegimeChoice | null;
  saving: SavingStance | null;
  housing: HousingDecision | null;
  career: CareerPhase | null;
  purchases: BigPurchaseWindow | null;
  currency: CurrencyStance | null;
  debt: DebtStance | null;
  portfolio: PortfolioDuration | null;
  notes: string;
  lastEditedAt: string | null;
}

export function emptyState(): PlaybookState {
  return {
    regime: null,
    saving: null,
    housing: null,
    career: null,
    purchases: null,
    currency: null,
    debt: null,
    portfolio: null,
    notes: "",
    lastEditedAt: null,
  };
}

const STORAGE_KEY = "causeway.playbook.v1";

export function loadState(): PlaybookState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as unknown;
    return normaliseState(parsed);
  } catch {
    return emptyState();
  }
}

export function saveState(s: PlaybookState): void {
  if (typeof window === "undefined") return;
  try {
    const withTs: PlaybookState = { ...s, lastEditedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withTs));
  } catch {
    // localStorage disabled (incognito Safari, quota, etc.). The user can
    // still complete the form in-session and use the share-link.
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Defensive parse: missing keys default to null/empty, unknown values reset
 * to null so a schema drift in v1 → v2 doesn't crash the form.
 */
export function normaliseState(parsed: unknown): PlaybookState {
  const empty = emptyState();
  if (!parsed || typeof parsed !== "object") return empty;
  const p = parsed as Record<string, unknown>;
  return {
    regime: enumOrNull(p.regime, REGIME_OPTIONS),
    saving: enumOrNull(p.saving, SAVING_OPTIONS),
    housing: enumOrNull(p.housing, HOUSING_OPTIONS),
    career: enumOrNull(p.career, CAREER_OPTIONS),
    purchases: enumOrNull(p.purchases, PURCHASE_OPTIONS),
    currency: enumOrNull(p.currency, CURRENCY_OPTIONS),
    debt: enumOrNull(p.debt, DEBT_OPTIONS),
    portfolio: enumOrNull(p.portfolio, PORTFOLIO_OPTIONS),
    notes: typeof p.notes === "string" ? p.notes : "",
    lastEditedAt:
      typeof p.lastEditedAt === "string" ? p.lastEditedAt : null,
  };
}

function enumOrNull<T extends string>(
  v: unknown,
  options: ReadonlyArray<{ value: T }>,
): T | null {
  if (typeof v !== "string") return null;
  return options.some((o) => o.value === v) ? (v as T) : null;
}

/* ----------------------------- URL sharing ----------------------------- */

/**
 * Encode the state as a base64url string for use in `/playbook?state=…`.
 * Uses `btoa`/`atob`; ASCII-only state is fine because the JSON keys are
 * ASCII and the values are short enum strings + the notes field.
 */
export function encodeShareable(s: PlaybookState): string {
  const json = JSON.stringify(s);
  return base64UrlEncode(json);
}

export function decodeShareable(b64: string): PlaybookState | null {
  try {
    const json = base64UrlDecode(b64);
    return normaliseState(JSON.parse(json));
  } catch {
    return null;
  }
}

/* --------------------------- Option catalogues ------------------------ */

export interface Option<T extends string> {
  value: T;
  label: string;
  /** What this answer means for the playbook line. */
  blurb: string;
}

export const REGIME_OPTIONS: ReadonlyArray<Option<RegimeChoice>> = [
  { value: "easing", label: "Easing — cuts in the pipeline", blurb: "Front of the curve is in motion; long duration starts to recover." },
  { value: "neutral", label: "Neutral — policy near the long-run rate", blurb: "Carry trumps timing. No structural reason to bet on direction." },
  { value: "tightening", label: "Tightening — hikes still ahead", blurb: "Real yields rising; long duration vulnerable; cash earns." },
];

export const SAVING_OPTIONS: ReadonlyArray<Option<SavingStance>> = [
  { value: "aggressive-cash", label: "Hold cash · short Treasuries", blurb: "Front of the curve · 0-2y T-bills · CD ladders. Real yield without lock-in." },
  { value: "balanced", label: "Balanced · mix of cash and duration", blurb: "Half front of curve, half belly. Hedges either direction at the cost of pure conviction." },
  { value: "extending-duration", label: "Extend duration · 5-10y Treasuries", blurb: "Locking in real yields ahead of cuts. Vulnerable if inflation re-accelerates." },
];

export const HOUSING_OPTIONS: ReadonlyArray<Option<HousingDecision>> = [
  { value: "renting-watching", label: "Renting · watching for the window", blurb: "Don't chase rate; watch the 10y–30y mortgage spread. The headline number lags the spread." },
  { value: "buying-soon", label: "Buying in the next 12 months", blurb: "Pre-shop financing; ARMs and points are negotiable once you have a lender bid in hand." },
  { value: "owner-locked", label: "Own · locked-in at low rate", blurb: "Don't refinance unless rates fall well below your lock. The optionality you have is rare." },
  { value: "owner-trading-up", label: "Own · trading up or relocating", blurb: "Buyer concessions are negotiable in slow markets; mortgage credits more so than price cuts." },
];

export const CAREER_OPTIONS: ReadonlyArray<Option<CareerPhase>> = [
  { value: "early", label: "Early-cycle sector · leads up and down", blurb: "Get in fast in recoveries; build runway and network outside the sector before the next rotation." },
  { value: "mid", label: "Mid-cycle sector · peak leverage now", blurb: "Use offers as leverage; lock in or negotiate. Update résumé before headlines change." },
  { value: "late", label: "Late-cycle sector · bonuses peak before they vanish", blurb: "Take the bonuses, prepare for the turn. Don't extrapolate the comp curve." },
  { value: "counter-cyclical", label: "Counter-cyclical sector · stable through cycles", blurb: "Pay rises slowly; mobility into the sector during downturns is unusually attractive." },
];

export const PURCHASE_OPTIONS: ReadonlyArray<Option<BigPurchaseWindow>> = [
  { value: "buy-now", label: "Buy now · supply window is open", blurb: "Buyer's market; negotiate hard, document the financing alternatives." },
  { value: "wait-6mo", label: "Wait 6 months · expect cheaper", blurb: "Holding cash earns; rates and supply may both shift in your favor." },
  { value: "wait-12mo", label: "Wait 12+ months · cycle still turning", blurb: "Don't deplete reserves for non-essential durables this far from a regime turn." },
  { value: "no-window", label: "No window · structural need", blurb: "Optimise the financing rather than the timing — the trade-off has flipped." },
];

export const CURRENCY_OPTIONS: ReadonlyArray<Option<CurrencyStance>> = [
  { value: "domestic-only", label: "Domestic only · no FX exposure", blurb: "Lowest variance, but you're implicitly long your home currency. Stress-test the structural devaluation case." },
  { value: "modest-fx", label: "Modest FX · holiday + future spend", blurb: "Pre-buy when home is strong; don't panic-hedge when it weakens. Document the exposures." },
  { value: "active-hedger", label: "Active hedger · multi-currency assets", blurb: "Treat FX as a position, not noise. Maintain a hedge ratio policy and rebalance to it, not to instinct." },
];

export const DEBT_OPTIONS: ReadonlyArray<Option<DebtStance>> = [
  { value: "conservative", label: "Conservative · no consumer debt", blurb: "Build optionality. Stay reactive to opportunities when capital comes off the table." },
  { value: "moderate", label: "Moderate · mortgage only", blurb: "Refinance when the savings exceed two years of cash outflow on the cost of the refi." },
  { value: "leveraged", label: "Leveraged · margin or BTL property", blurb: "Stress-test your worst case: tightening + bad year. The cost of running leverage rises with policy." },
];

export const PORTFOLIO_OPTIONS: ReadonlyArray<Option<PortfolioDuration>> = [
  { value: "short", label: "Short duration · cash-heavy", blurb: "Carry without timing. Re-evaluate quarterly as the curve re-shapes." },
  { value: "balanced", label: "Balanced · stocks + bonds mix", blurb: "60/40 or close. Rebalance to the policy; don't drift with the market." },
  { value: "long", label: "Long duration · stocks + long bonds", blurb: "Pre-positioned for easing. Vulnerable to inflation surprises; size the tail." },
];

/* --------------------------- Guidance derivation ----------------------- */

export interface DerivedGuidance {
  /** Per-axis bullet (label · blurb). */
  bullets: Array<{
    axis: string;
    nodeRef: string;
    choiceLabel: string;
    blurb: string;
  }>;
  /** How many of the eight axes the user has answered. */
  completed: number;
  total: number;
}

/**
 * Build a CSV (one row per answered axis) for spreadsheet export.
 * Columns: Axis, Node, Choice, Guidance.
 *
 * RFC 4180 quoting: wrap in quotes and double any internal quote.
 */
export function buildCsv(s: PlaybookState): string {
  const g = deriveGuidance(s);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows: string[] = ['"Axis","Node","Choice","Guidance"'];
  for (const b of g.bullets) {
    rows.push(
      [escape(b.axis), escape(b.nodeRef), escape(b.choiceLabel), escape(b.blurb)].join(","),
    );
  }
  if (s.notes.trim().length > 0) {
    rows.push([escape("Notes"), '""', '""', escape(s.notes.trim())].join(","));
  }
  return rows.join("\n") + "\n";
}

/**
 * Build a mailto: URL whose body summarises the playbook. Useful as a
 * "save this to myself" handoff — opens the user's mail client with
 * the summary pre-filled.
 */
export function buildMailto(s: PlaybookState, shareUrl?: string): string {
  const g = deriveGuidance(s);
  const lines: string[] = ["Your Causeway playbook", ""];
  for (const b of g.bullets) {
    lines.push(`• ${b.axis} — ${b.choiceLabel}`);
    lines.push(`    ${b.blurb}`);
    lines.push("");
  }
  if (s.notes.trim().length > 0) {
    lines.push("Notes:");
    lines.push(s.notes.trim());
    lines.push("");
  }
  if (shareUrl) {
    lines.push(`Saved at: ${shareUrl}`);
  }
  lines.push("");
  lines.push("Directional defaults, not advice. — Causeway");
  const subject = encodeURIComponent("My Causeway playbook");
  const body = encodeURIComponent(lines.join("\n"));
  return `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Compose the eight-line printable playbook from the state. Missing
 * answers are simply omitted from the bullets list (we don't bullet
 * a non-answer).
 */
export function deriveGuidance(s: PlaybookState): DerivedGuidance {
  const bullets: DerivedGuidance["bullets"] = [];

  push(s.regime, REGIME_OPTIONS, "H1 · Regime read", "/nodes/H1");
  push(s.saving, SAVING_OPTIONS, "H2 · Saving stance", "/nodes/H2");
  push(s.housing, HOUSING_OPTIONS, "H3 · Housing decision", "/nodes/H3");
  push(s.career, CAREER_OPTIONS, "H4 · Career phase", "/nodes/H4");
  push(s.purchases, PURCHASE_OPTIONS, "H5 · Big-purchase window", "/nodes/H5");
  push(s.currency, CURRENCY_OPTIONS, "H6 · Currency stance", "/nodes/H6");
  push(s.debt, DEBT_OPTIONS, "H7 · Debt structure", "/nodes/H7");
  push(s.portfolio, PORTFOLIO_OPTIONS, "H8 · Portfolio duration", "/nodes/H8");

  return { bullets, completed: bullets.length, total: 8 };

  function push<T extends string>(
    value: T | null,
    options: ReadonlyArray<Option<T>>,
    axis: string,
    nodeRef: string,
  ): void {
    if (value === null) return;
    const opt = options.find((o) => o.value === value);
    if (!opt) return;
    bullets.push({ axis, nodeRef, choiceLabel: opt.label, blurb: opt.blurb });
  }
}
