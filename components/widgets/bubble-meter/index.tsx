"use client";

import { useId, useMemo, useState } from "react";
import styles from "./bubble-meter.module.css";
import { DEFAULT_INPUTS, PRESETS, compute, type Inputs } from "./model";

function barTone(v: number): string {
  return v >= 70 ? "var(--cw-red)" : v >= 40 ? "var(--gold-deep)" : "var(--cw-green)";
}

/**
 * Bubble detection (F3 hero).
 *
 * Dial the public indicators (valuation, leverage, credit growth, price
 * acceleration, retail froth) and read the composite bubble-risk score. The
 * lesson is confluence — and that a credit-fuelled bubble is the one that
 * becomes a crisis.
 */
export function BubbleMeter() {
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

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          Bubble-o-meter · confluence, not a single tell
          <span className={styles.tryPill}>Try the controls</span>
        </span>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
              className={`${styles.preset} ${presetId === p.id ? styles.presetActive : ""}`}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {activePreset && <div className={styles.blurb}>{activePreset.blurb}</div>}

      <div className={styles.body}>
        <div className={styles.vizCol}>
          <div className={styles.gaugeRow}>
            <div className={styles.score}>{Math.round(r.score)}</div>
            <div className={styles.gaugeMeta}>
              <span className={`${styles.bandChip} ${toneClass}`}>{r.band}</span>
              {r.creditFuelled && <span className={styles.creditFlag}>credit-fuelled</span>}
              <div className={styles.scoreLabel}>composite bubble risk · 0–100</div>
            </div>
          </div>
          <div className={styles.gaugeTrack}>
            <div className={styles.gaugeFill} style={{ width: `${r.score}%`, background: barTone(r.score) }} />
          </div>

          <div className={styles.bars}>
            {r.indicators.map((ind) => (
              <div key={ind.key} className={styles.barRow}>
                <span className={styles.barLabel}>{ind.label}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${ind.value}%`, background: barTone(ind.value) }} />
                </div>
                <span className={styles.barVal}>{Math.round(ind.value)}</span>
              </div>
            ))}
          </div>

          <div className={styles.readVerdict}>{r.verdict}</div>
        </div>

        <div className={styles.controls}>
          <SliderField label="Valuation vs history" value={inputs.valuation} onChange={(v) => update("valuation", v)} />
          <SliderField label="Leverage funding it" value={inputs.leverage} onChange={(v) => update("leverage", v)} />
          <SliderField label="Credit growth" value={inputs.creditGrowth} onChange={(v) => update("creditGrowth", v)} />
          <SliderField label="Price acceleration" value={inputs.acceleration} onChange={(v) => update("acceleration", v)} />
          <SliderField label="Retail froth / narrative" value={inputs.froth} onChange={(v) => update("froth", v)} />
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          No single dial proves a bubble — &quot;expensive&quot; isn&apos;t a
          bubble, and a permabear is wrong most of the time. Risk lives in the
          confluence, and especially in leverage: a credit-fuelled mania becomes
          a crisis, an equity-funded one just de-rates. You can&apos;t time the
          top, so the honest response is sizing the risk you carry, not calling it.
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
