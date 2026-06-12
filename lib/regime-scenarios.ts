/**
 * Causeway · pinned regime scenarios.
 *
 * Stores user-defined named regimes alongside the 5 built-in historical
 * PRESETS in `components/widgets/regime-composer/model.ts`. Persisted under
 * `causeway.regime.scenarios.v1` in localStorage. SSR-safe (mirror the
 * pattern used by `lib/regime-store.ts` and `lib/playbook.ts`).
 *
 * Also owns the share-URL encode/decode for `/lab?regime=…&name=…`.
 */

import { base64UrlDecode, base64UrlEncode } from "./url-encoding";
import { normaliseRegime, type RegimeInputs } from "./regime-store";

export interface RegimeScenario {
  id: string;
  name: string;
  inputs: RegimeInputs;
  /** ISO timestamp when the scenario was pinned. */
  createdAt: string;
  /** ISO timestamp of the last time this scenario was applied. */
  lastUsedAt: string;
}

const STORAGE_KEY = "causeway.regime.scenarios.v1";
const MAX_SCENARIOS = 20;

export function loadScenarios(): RegimeScenario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return normaliseScenarios(parsed);
  } catch {
    return [];
  }
}

export function saveScenarios(list: RegimeScenario[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = list.slice(0, MAX_SCENARIOS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage disabled / quota exceeded. Pinning still works in-session.
  }
}

export function normaliseScenarios(parsed: unknown): RegimeScenario[] {
  if (!Array.isArray(parsed)) return [];
  const out: RegimeScenario[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) continue;
    const id =
      typeof r.id === "string" && r.id.length > 0 ? r.id : generateId();
    const inputs = normaliseRegime(r.inputs);
    const createdAt =
      typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString();
    const lastUsedAt =
      typeof r.lastUsedAt === "string" ? r.lastUsedAt : createdAt;
    out.push({ id, name, inputs, createdAt, lastUsedAt });
    if (out.length >= MAX_SCENARIOS) break;
  }
  return out;
}

export function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Fallback for older runtimes — short random id.
  return `s${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/* ---------- Share-URL encoding ---------- */

export function encodeRegimeForUrl(inputs: RegimeInputs): string {
  return base64UrlEncode(JSON.stringify(inputs));
}

export function decodeRegimeFromUrl(b64: string): RegimeInputs | null {
  try {
    const json = base64UrlDecode(b64);
    const parsed = JSON.parse(json);
    return normaliseRegime(parsed);
  } catch {
    return null;
  }
}

/**
 * Build a /lab?regime=...&name=... share URL relative to the current origin.
 * Caller is responsible for fronting it with origin if needed for clipboards.
 */
export function buildShareUrl(
  inputs: RegimeInputs,
  name?: string,
  origin = "",
): string {
  const params = new URLSearchParams();
  params.set("regime", encodeRegimeForUrl(inputs));
  if (name) params.set("name", name);
  return `${origin}/lab?${params.toString()}`;
}

export { MAX_SCENARIOS };

/* ---------- Bulk export / import ---------- */

const EXPORT_VERSION = 1;

interface ExportEnvelope {
  version: number;
  exportedAt: string;
  scenarios: RegimeScenario[];
}

/**
 * Serialise the scenarios list to a versioned JSON envelope suitable for
 * download. Pretty-printed (2-space) for human readability.
 */
export function exportScenariosToJson(list: RegimeScenario[]): string {
  const envelope: ExportEnvelope = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    scenarios: list,
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Parse a JSON string produced by `exportScenariosToJson` (or a bare array
 * of scenarios — older formats / hand-edited files) back into a normalised
 * list. Returns null on any parse / shape failure so the caller can show a
 * friendly error rather than crash.
 */
export function importScenariosFromJson(
  raw: string,
): RegimeScenario[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return normaliseScenarios(parsed);
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { scenarios?: unknown }).scenarios)
    ) {
      return normaliseScenarios(
        (parsed as { scenarios: unknown[] }).scenarios,
      );
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Suggested download filename: `causeway-scenarios-YYYY-MM-DD.json`.
 */
export function suggestedExportFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `causeway-scenarios-${y}-${m}-${d}.json`;
}
