"use client";

import { useId, useMemo, useState } from "react";
import styles from "./deleveraging.module.css";
import { DEFAULT_INPUTS, PRESETS, compute, type Inputs } from "./model";

const OUTCOME_LABEL: Record<string, string> = {
  beautiful: "beautiful deleveraging",
  deflationary: "deflationary depression",
  inflationary: "inflationary debasement",
  stuck: "stuck / lost decade",
};

/**
 * Debt cycles, long and short (F4 hero).
 *
 * The long debt cycle has peaked; debt/income must come down. Pull the four
 * levers — austerity, defaults, printing, transfers — and see whether the mix
 * produces a beautiful deleveraging, a depression, or a debasement.
 */
export function Deleveraging() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [presetId, setPresetId] = useState<string>("");

  const r = useMemo(() => compute(inputs), [inputs]);
  const activePreset = PRESETS.find((p) => p.id === presetId);

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setInputs(p.inputs);
  }
  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((p) => ({ ...p, [key]: value }));
    setPresetId("");
  }

  const toneClass = r.tone === "red" ? styles.red : r.tone === "gold" ? styles.gold : styles.green;
  const debtPct = (v: number) => `${Math.min(100, (v / 400) * 100)}%`;

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          Deleveraging · four levers, one outcome
          <span className={styles.tryPill}>Try the controls</span>
        </span>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
              className={`${styles.preset} ${presetId === p.id ? styles.presetActive : ""}`}>
              {p.name.split(" (")[0]}
            </button>
          ))}
        </div>
      </div>

      {activePreset && <div className={styles.blurb}>{activePreset.blurb}</div>}

      <div className={styles.body}>
        <div className={styles.vizCol}>
          <div className={styles.outcomeHead}>
            <span className={`${styles.outcomeChip} ${toneClass}`}>{OUTCOME_LABEL[r.outcome]}</span>
          </div>

          {/* debt/income start → end */}
          <div className={styles.debtBlock}>
            <div className={styles.debtLabel}>Debt / income</div>
            <div className={styles.debtTrack}>
              <div className={styles.debtStart} style={{ left: debtPct(r.startDebt) }} title={`start ${r.startDebt}%`} />
              <div className={styles.debtFill} style={{ width: debtPct(r.endDebt), background: r.tone === "red" ? "var(--cw-red)" : r.tone === "gold" ? "var(--gold-deep)" : "var(--cw-green)" }} />
            </div>
            <div className={styles.debtScale}>
              <span>{r.endDebt}% now</span>
              <span className={styles.debtStartLabel}>start {r.startDebt}%</span>
            </div>
          </div>

          <div className={styles.tiles}>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Debt / income</span>
              <span className={styles.tileVal}>{r.endDebt}%</span>
              <span className={`${styles.tileDelta} ${r.endDebt < r.startDebt ? styles.green : styles.red}`}>
                {r.endDebt < r.startDebt ? "−" : "+"}{Math.abs(r.endDebt - r.startDebt)} pts
              </span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Income</span>
              <span className={`${styles.tileVal} ${r.incomeChange >= 0 ? styles.greenText : styles.redText}`}>
                {r.incomeChange >= 0 ? "+" : ""}{r.incomeChange}%
              </span>
              <span className={styles.tileDelta}>vs cycle peak</span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Inflation</span>
              <span className={`${styles.tileVal} ${r.inflation >= 10 ? styles.redText : ""}`}>{r.inflation}%</span>
              <span className={styles.tileDelta}>price level</span>
            </div>
          </div>

          <div className={styles.readVerdict}>{r.verdict}</div>
        </div>

        <div className={styles.controls}>
          <div className={styles.groupLabel}>Deflationary levers</div>
          <SliderField label="Austerity (spending cuts)" value={inputs.austerity} onChange={(v) => update("austerity", v)} />
          <SliderField label="Defaults / restructuring" value={inputs.defaults} onChange={(v) => update("defaults", v)} />
          <div className={styles.groupLabel}>Reflationary levers</div>
          <SliderField label="Money printing" value={inputs.printing} onChange={(v) => update("printing", v)} />
          <SliderField label="Wealth transfers" value={inputs.transfers} onChange={(v) => update("transfers", v)} />
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          A debt that can&apos;t be grown out of comes down only four ways, and
          two are deflationary (austerity, defaults) while one is inflationary
          (printing). A &quot;beautiful deleveraging&quot; balances them so debt
          falls while income holds — but lean too hard on either side and you get
          a depression or a debasement. That balance is the macro question of the
          decade.
        </span>
      </div>
    </div>
  );
}

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className={styles.field}>
      <div className={styles.sliderHead}>
        <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
        <span className={styles.sliderValue}>{Math.round(value)}</span>
      </div>
      <input id={id} type="range" min={0} max={100} step={1} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className={styles.range} />
    </div>
  );
}
