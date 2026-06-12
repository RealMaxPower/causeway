"use client";

import { useMemo } from "react";
import { useRegime } from "@/components/providers/RegimeProvider";
import { PRESETS } from "@/lib/regime-store";
import styles from "./presets-row.module.css";

/**
 * Lab-mode scenario picker. Sits above the RegimeComposer on /lab and flips
 * every widget on the page to the chosen historical regime in one click.
 * Renders the 5 built-in PRESETS plus any user-pinned scenarios as gold-
 * bordered chips after the built-ins. Drawer (ScenariosDrawer) is the place
 * to manage; this row is the place to apply.
 */
export function PresetsRow() {
  const regime = useRegime();

  const activeBuiltIn = useMemo(
    () => (regime ? PRESETS.find((p) => p.id === regime.presetId) : null),
    [regime],
  );

  const activeScenarioId = useMemo(() => {
    if (!regime) return null;
    const s = regime.scenarios.find(
      (s) =>
        approxEq(s.inputs.inflation, regime.inputs.inflation) &&
        approxEq(s.inputs.fedFunds, regime.inputs.fedFunds) &&
        approxEq(s.inputs.unemployment, regime.inputs.unemployment) &&
        approxEq(s.inputs.sloos, regime.inputs.sloos),
    );
    return s?.id ?? null;
  }, [regime]);

  if (!regime) return null;

  return (
    <section className={styles.row} aria-label="Scenario picker">
      <div className={styles.label}>Scenario · pick a regime</div>
      <div className={styles.buttons}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => regime.applyPreset(p.id)}
            className={`${styles.button} ${
              regime.presetId === p.id ? styles.buttonActive : ""
            }`}
            aria-pressed={regime.presetId === p.id}
          >
            {p.name}
          </button>
        ))}
        {regime.scenarios.length > 0 && (
          <span className={styles.divider} aria-hidden />
        )}
        {regime.scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => regime.applyScenario(s.id)}
            className={`${styles.button} ${styles.buttonPinned} ${
              activeScenarioId === s.id ? styles.buttonActive : ""
            }`}
            aria-pressed={activeScenarioId === s.id}
            title={`Pinned · ${s.name}`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className={styles.blurb}>
        {activeBuiltIn
          ? activeBuiltIn.blurb
          : "Custom — the regime has been edited away from any preset. The widgets below all read from this regime."}
      </div>
    </section>
  );
}

function approxEq(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.05;
}
