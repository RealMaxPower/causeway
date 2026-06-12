/**
 * Causeway · shared regime state for "lab mode".
 *
 * The canonical regime shape — four macro axes — lives in
 * `components/widgets/regime-composer/model.ts` as `Inputs` / `DEFAULT_INPUTS`
 * / `PRESETS`. This module re-exports the type under a clearer name and
 * owns the localStorage persistence used by RegimeProvider.
 *
 * SSR-safe: `loadRegime` returns the default on the server, `saveRegime`
 * is a no-op when `window` is undefined. Same pattern as `lib/playbook.ts`.
 */

import {
  DEFAULT_INPUTS,
  PRESETS,
  type Inputs,
  type Preset,
} from "@/components/widgets/regime-composer/model";

export type RegimeInputs = Inputs;
export const DEFAULT_REGIME: RegimeInputs = DEFAULT_INPUTS;
export { PRESETS };
export type { Preset };

const STORAGE_KEY = "causeway.regime.v1";

const RANGES: Record<keyof RegimeInputs, [number, number]> = {
  inflation: [-5, 20],
  fedFunds: [0, 20],
  unemployment: [2, 15],
  sloos: [-50, 100],
};

export function loadRegime(): RegimeInputs {
  if (typeof window === "undefined") return DEFAULT_REGIME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REGIME;
    const parsed = JSON.parse(raw) as unknown;
    return normaliseRegime(parsed);
  } catch {
    return DEFAULT_REGIME;
  }
}

export function saveRegime(r: RegimeInputs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  } catch {
    // localStorage disabled (incognito Safari, quota). Lab still works in-session.
  }
}

export function clearRegime(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function normaliseRegime(parsed: unknown): RegimeInputs {
  if (!parsed || typeof parsed !== "object") return DEFAULT_REGIME;
  const p = parsed as Record<string, unknown>;
  return {
    inflation: clampNum(p.inflation, "inflation"),
    fedFunds: clampNum(p.fedFunds, "fedFunds"),
    unemployment: clampNum(p.unemployment, "unemployment"),
    sloos: clampNum(p.sloos, "sloos"),
  };
}

function clampNum(v: unknown, key: keyof RegimeInputs): number {
  const fallback = DEFAULT_REGIME[key];
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  const [lo, hi] = RANGES[key];
  return Math.min(hi, Math.max(lo, v));
}
