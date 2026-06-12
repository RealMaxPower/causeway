"use client";

import { useId, useMemo, useState } from "react";
import styles from "./demographics.module.css";
import { DEFAULT_INPUTS, PRESETS, compute, fmt1, type Inputs } from "./model";

const GROUP_COLOR = {
  young: "var(--gold-deep)",
  working: "var(--cw-green)",
  old: "var(--ink-2)",
} as const;

/**
 * Demographics is destiny, slowly (G3 hero).
 *
 * Set fertility, longevity, and immigration; the population pyramid reshapes
 * and the dependency ratios follow. The arithmetic of who supports the old is
 * the most predictable macro variable — and the slowest to move.
 */
export function Demographics() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [presetId, setPresetId] = useState<string>("replacement");

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

  const maxShare = Math.max(...r.bands.map((b) => b.share), 1);
  const toneClass = r.read.tone === "red" ? styles.red : r.read.tone === "gold" ? styles.gold : styles.green;

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          Population pyramid · who supports the old
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
          <div className={styles.pyramid}>
            {[...r.bands].reverse().map((b) => (
              <div key={b.label} className={styles.pyRow}>
                <span className={styles.pyAge}>{b.label}</span>
                <div className={styles.pyBarWrap}>
                  <div className={styles.pyBar} style={{ width: `${(b.share / maxShare) * 100}%`, background: GROUP_COLOR[b.group] }} />
                </div>
                <span className={styles.pyPct}>{b.share.toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <div className={styles.legend}>
            <span className={styles.legendItem}><span className={styles.dot} style={{ background: GROUP_COLOR.young }} /> 0–19 young</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{ background: GROUP_COLOR.working }} /> 20–64 working</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{ background: GROUP_COLOR.old }} /> 65+ old</span>
          </div>

          <div className={styles.tiles}>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Dependency ratio</span>
              <span className={styles.tileVal}>{r.dependencyRatio.toFixed(0)}</span>
              <span className={styles.tileSub}>dependents / 100 workers</span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Old-age dependency</span>
              <span className={styles.tileVal}>{r.oldAgeDependency.toFixed(0)}</span>
              <span className={styles.tileSub}>65+ / 100 workers</span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Support ratio</span>
              <span className={styles.tileVal}>{fmt1(r.supportRatio)}</span>
              <span className={styles.tileSub}>workers / retiree</span>
            </div>
          </div>

          <div className={styles.readHead}>
            <span className={`${styles.readChip} ${toneClass}`}>{r.read.label}</span>
          </div>
          <div className={styles.readVerdict}>{r.read.verdict}</div>
        </div>

        <div className={styles.controls}>
          <SliderField label="Fertility · births / woman" value={inputs.tfr} min={1} max={4} step={0.1}
            fmt={(v) => `${v.toFixed(1)}${Math.abs(v - 2.1) < 0.05 ? " (replace)" : ""}`} onChange={(v) => update("tfr", v)} />
          <SliderField label="Life expectancy" value={inputs.lifeExp} min={60} max={90} step={1} fmt={(v) => `${v}y`} onChange={(v) => update("lifeExp", v)} />
          <SliderField label="Net immigration" value={inputs.immigration} min={0} max={6} step={0.5}
            fmt={(v) => (v === 0 ? "none" : v >= 4 ? "high" : "some")} onChange={(v) => update("immigration", v)} />
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          The babies in the bottom bar are the workforce in the middle bar 25
          years from now — there&apos;s no policy that changes that arithmetic
          fast. Fertility and longevity reshape the pyramid over decades;
          immigration is the one quick lever. The support ratio is what pension
          and health systems actually run on.
        </span>
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, fmt, onChange }: {
  label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <div className={styles.sliderHead}>
        <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
        <span className={styles.sliderValue}>{fmt(value)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className={styles.range} />
    </div>
  );
}
