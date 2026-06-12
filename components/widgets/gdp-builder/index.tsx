"use client";

import { useId, useMemo, useState } from "react";
import styles from "./gdp-builder.module.css";
import { DEFAULT_INPUTS, PRESETS, compute, fmtT, type Inputs } from "./model";

const COMPONENT_COLORS: Record<string, string> = {
  c: "var(--cw-green)",
  i: "var(--gold-deep)",
  g: "var(--ink-2)",
  nx: "var(--cw-red)",
};

/**
 * GDP, properly (C1 hero).
 *
 * Build headline GDP from C + I + G + NX, then apply the honesty adjustments
 * GDP omits or miscounts. The gap between the headline and the welfare-adjusted
 * figure is the node's whole point: the scoreboard is not the score.
 */
export function GdpBuilder() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [presetId, setPresetId] = useState<string>("us2024");

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

  const totalAbs = r.components.reduce((s, c) => s + Math.abs(c.value), 0) || 1;
  const toneClass = r.read.tone === "red" ? styles.red : r.read.tone === "gold" ? styles.gold : styles.green;

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          GDP, properly · the scoreboard vs the score
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
          <div className={styles.bigRow}>
            <div>
              <div className={styles.eyebrow}>Headline GDP</div>
              <div className={styles.bigNum}>{fmtT(r.headline)}</div>
            </div>
            <div className={styles.arrow}>→</div>
            <div>
              <div className={styles.eyebrow}>Welfare-adjusted (illustrative)</div>
              <div className={styles.bigNum}>
                {fmtT(r.adjusted)}
                <span className={`${styles.gapBadge} ${r.gap >= 0 ? styles.gapUp : styles.gapDown}`}>
                  {r.gap >= 0 ? "+" : "−"}{fmtT(Math.abs(r.gap)).slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* expenditure stack */}
          <div className={styles.barWrap}>
            <div className={styles.bar}>
              {r.components.map((c) => (
                <div
                  key={c.key}
                  className={styles.seg}
                  style={{ flexBasis: `${(Math.abs(c.value) / totalAbs) * 100}%`, background: COMPONENT_COLORS[c.key] }}
                  title={`${c.label}: ${fmtT(c.value)}`}
                />
              ))}
            </div>
            <div className={styles.legend}>
              {r.components.map((c) => (
                <span key={c.key} className={styles.legendItem}>
                  <span className={styles.dot} style={{ background: COMPONENT_COLORS[c.key] }} />
                  {c.label} {fmtT(c.value)}
                </span>
              ))}
            </div>
          </div>

          {/* adjustments */}
          <div className={styles.adjList}>
            {r.adjustments.map((a) => (
              <div key={a.key} className={styles.adjRow}>
                <span className={styles.adjLabel}>{a.label}</span>
                <span className={`${styles.adjVal} ${a.sign > 0 ? styles.green : styles.red}`}>
                  {a.sign > 0 ? "+" : "−"}{fmtT(a.value).slice(1)}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.readHead}>
            <span className={`${styles.readChip} ${toneClass}`}>{r.read.label}</span>
          </div>
          <div className={styles.readVerdict}>{r.read.verdict}</div>
        </div>

        <div className={styles.controls}>
          <div className={styles.groupLabel}>Expenditure (headline)</div>
          <SliderField label="Consumption" value={inputs.c} min={10} max={26} step={0.1} onChange={(v) => update("c", v)} />
          <SliderField label="Investment" value={inputs.i} min={1} max={10} step={0.1} onChange={(v) => update("i", v)} />
          <SliderField label="Government" value={inputs.g} min={2} max={9} step={0.1} onChange={(v) => update("g", v)} />
          <SliderField label="Net exports" value={inputs.nx} min={-3} max={2} step={0.1} onChange={(v) => update("nx", v)} />
          <div className={styles.groupLabel}>Honesty adjustments</div>
          <SliderField label="Household & volunteer (+)" value={inputs.household} min={0} max={14} step={0.1} onChange={(v) => update("household", v)} />
          <SliderField label="Environmental cost (−)" value={inputs.environment} min={0} max={8} step={0.1} onChange={(v) => update("environment", v)} />
          <SliderField label="Defensive / cleanup (−)" value={inputs.defensive} min={0} max={5} step={0.1} onChange={(v) => update("defensive", v)} />
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          Headline GDP is the four expenditure components, full stop — that&apos;s
          all the news number contains. The adjustments below it are real, but
          uncounted: unpaid work GDP can&apos;t see, environmental costs it
          ignores, and cleanup it cheerfully counts as growth. Same headline,
          very different welfare.
        </span>
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <div className={styles.sliderHead}>
        <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
        <span className={styles.sliderValue}>{fmtT(value)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className={styles.range} />
    </div>
  );
}
