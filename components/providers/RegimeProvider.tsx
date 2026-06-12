"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_REGIME,
  PRESETS,
  loadRegime,
  saveRegime,
  type RegimeInputs,
} from "@/lib/regime-store";
import {
  generateId,
  loadScenarios,
  MAX_SCENARIOS,
  saveScenarios,
  type RegimeScenario,
} from "@/lib/regime-scenarios";

export interface RegimeContextValue {
  inputs: RegimeInputs;
  setInputs: (next: RegimeInputs) => void;
  /** Merge a partial update — convenient for single-axis edits. */
  patch: (delta: Partial<RegimeInputs>) => void;
  /** Apply a named preset by id (see PRESETS). No-op if id unknown. */
  applyPreset: (presetId: string) => void;
  /** Reset to DEFAULT_REGIME and clear localStorage. */
  reset: () => void;
  /** The id of the preset whose values currently match `inputs`, or "" if dirty. */
  presetId: string;

  /* ---------- Pinned scenarios (user-defined regimes) ---------- */
  scenarios: RegimeScenario[];
  /**
   * Pin the current `inputs` as a new scenario. Throws when the name is empty
   * or the list is already at MAX_SCENARIOS.
   */
  pinCurrent: (name: string) => RegimeScenario;
  applyScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  /** Accepts the full id list in the desired display order. */
  reorderScenarios: (orderedIds: string[]) => void;
  /** Replace the entire scenarios list — used by JSON import. Trims to MAX_SCENARIOS. */
  replaceScenarios: (next: RegimeScenario[]) => void;
}

const RegimeContext = createContext<RegimeContextValue | null>(null);

/**
 * Wraps the lab route (and any future regime-coupled routes) so descendants
 * can call `useRegime()`. Outside this provider, `useRegime()` returns null —
 * widgets that opt into the regime context fall back to their local state.
 */
export function RegimeProvider({ children }: { children: ReactNode }) {
  // Mount with the deterministic default so SSR markup matches first render.
  // Then on the client, hydrate from localStorage.
  const [inputs, setInputsState] = useState<RegimeInputs>(DEFAULT_REGIME);
  const [presetId, setPresetId] = useState<string>("current");
  const [scenarios, setScenariosState] = useState<RegimeScenario[]>([]);

  useEffect(() => {
    // Hydrate from localStorage after first paint to avoid SSR/client mismatch.
    // Same pattern as components/chrome/SideNavList.tsx.
    const storedRegime = loadRegime();
    const storedScenarios = loadScenarios();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputsState(storedRegime);
    setPresetId(matchPreset(storedRegime));
    setScenariosState(storedScenarios);
  }, []);

  const setInputs = useCallback((next: RegimeInputs) => {
    setInputsState(next);
    setPresetId(matchPreset(next));
    saveRegime(next);
  }, []);

  const patch = useCallback((delta: Partial<RegimeInputs>) => {
    setInputsState((prev) => {
      const next = { ...prev, ...delta };
      setPresetId(matchPreset(next));
      saveRegime(next);
      return next;
    });
  }, []);

  const applyPreset = useCallback((id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setInputsState(p.inputs);
    setPresetId(id);
    saveRegime(p.inputs);
  }, []);

  const reset = useCallback(() => {
    setInputsState(DEFAULT_REGIME);
    setPresetId("current");
    saveRegime(DEFAULT_REGIME);
  }, []);

  const persistScenarios = useCallback((list: RegimeScenario[]) => {
    setScenariosState(list);
    saveScenarios(list);
  }, []);

  const pinCurrent = useCallback(
    (name: string): RegimeScenario => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Scenario name cannot be empty.");
      if (scenarios.length >= MAX_SCENARIOS) {
        throw new Error(`At most ${MAX_SCENARIOS} pinned scenarios.`);
      }
      const now = new Date().toISOString();
      const scenario: RegimeScenario = {
        id: generateId(),
        name: trimmed,
        inputs: { ...inputs },
        createdAt: now,
        lastUsedAt: now,
      };
      persistScenarios([scenario, ...scenarios]);
      return scenario;
    },
    [inputs, scenarios, persistScenarios],
  );

  const applyScenario = useCallback(
    (id: string) => {
      const s = scenarios.find((x) => x.id === id);
      if (!s) return;
      const now = new Date().toISOString();
      const updated = scenarios.map((x) =>
        x.id === id ? { ...x, lastUsedAt: now } : x,
      );
      setInputsState(s.inputs);
      setPresetId(matchPreset(s.inputs));
      saveRegime(s.inputs);
      persistScenarios(updated);
    },
    [scenarios, persistScenarios],
  );

  const deleteScenario = useCallback(
    (id: string) => {
      persistScenarios(scenarios.filter((x) => x.id !== id));
    },
    [scenarios, persistScenarios],
  );

  const renameScenario = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      persistScenarios(
        scenarios.map((x) => (x.id === id ? { ...x, name: trimmed } : x)),
      );
    },
    [scenarios, persistScenarios],
  );

  const reorderScenarios = useCallback(
    (orderedIds: string[]) => {
      const byId = new Map(scenarios.map((s) => [s.id, s]));
      const ordered: RegimeScenario[] = [];
      for (const id of orderedIds) {
        const s = byId.get(id);
        if (s) {
          ordered.push(s);
          byId.delete(id);
        }
      }
      // Append any scenarios not mentioned (defensive — shouldn't happen).
      for (const s of byId.values()) ordered.push(s);
      persistScenarios(ordered);
    },
    [scenarios, persistScenarios],
  );

  const replaceScenarios = useCallback(
    (next: RegimeScenario[]) => {
      persistScenarios(next.slice(0, MAX_SCENARIOS));
    },
    [persistScenarios],
  );

  const value: RegimeContextValue = {
    inputs,
    setInputs,
    patch,
    applyPreset,
    reset,
    presetId,
    scenarios,
    pinCurrent,
    applyScenario,
    deleteScenario,
    renameScenario,
    reorderScenarios,
    replaceScenarios,
  };

  return (
    <RegimeContext.Provider value={value}>{children}</RegimeContext.Provider>
  );
}

/**
 * Hook returning the regime context, or null when called outside a
 * RegimeProvider. Widgets that opt in should check for null and fall back
 * to their existing local state.
 */
export function useRegime(): RegimeContextValue | null {
  return useContext(RegimeContext);
}

function matchPreset(inputs: RegimeInputs): string {
  const hit = PRESETS.find(
    (p) =>
      eq(p.inputs.inflation, inputs.inflation) &&
      eq(p.inputs.fedFunds, inputs.fedFunds) &&
      eq(p.inputs.unemployment, inputs.unemployment) &&
      eq(p.inputs.sloos, inputs.sloos),
  );
  return hit?.id ?? "";
}

function eq(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.05;
}
