"use client";

import { useId, useMemo, useState } from "react";
import styles from "./comparative-advantage.module.css";
import { DEFAULT_INPUTS, PRESETS, compute, type CountrySide, type Inputs } from "./model";

const W = 520;
const H = 320;
const PAD = 48;

const COLOR = { home: "var(--cw-green)", foreign: "var(--cw-red)" } as const;

/**
 * Comparative advantage (D1 hero).
 *
 * Two countries, two goods. Set each country's productivity; watch who gets
 * the comparative advantage in what, and how trade lets both consume beyond
 * their own production frontiers — even when one is absolutely better at both.
 */
export function ComparativeAdvantage() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [presetId, setPresetId] = useState<string>("classic");

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

  const xFor = (x: number) => PAD + (x / r.bounds.xMax) * (W - 2 * PAD);
  const yFor = (y: number) => H - PAD - (y / r.bounds.yMax) * (H - 2 * PAD);

  const toneClass = r.read.tone === "red" ? styles.red : r.read.tone === "gold" ? styles.gold : styles.green;

  const drawCountry = (s: CountrySide) => (
    <g key={s.name}>
      {/* trade (consumption-with-trade) line, dashed */}
      {r.hasCA && (
        <line
          x1={xFor(s.trade[0].x)} y1={yFor(s.trade[0].y)}
          x2={xFor(s.trade[1].x)} y2={yFor(s.trade[1].y)}
          stroke={COLOR[s.color]} strokeWidth="1.75" strokeDasharray="5 3" opacity="0.85"
        />
      )}
      {/* production frontier, solid */}
      <line
        x1={xFor(s.ppf[0].x)} y1={yFor(s.ppf[0].y)}
        x2={xFor(s.ppf[1].x)} y2={yFor(s.ppf[1].y)}
        stroke={COLOR[s.color]} strokeWidth="2.5"
      />
      {/* autarky point */}
      <circle cx={xFor(s.autarky.x)} cy={yFor(s.autarky.y)} r="3.5" fill={COLOR[s.color]} />
    </g>
  );

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          Comparative advantage · consume beyond your own frontier
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
        <div className={styles.chartCol}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Two-country production frontiers and trade lines">
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--ink-2)" />
            <line x1={PAD} y1={H - PAD} x2={PAD} y2={PAD} stroke="var(--ink-2)" />
            {drawCountry(r.home)}
            {drawCountry(r.foreign)}
            <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fontFamily="var(--cw-mono)" fill="var(--ink-2)">
              Chips
            </text>
            <text x="14" y={H / 2} textAnchor="middle" fontSize="10.5" fontFamily="var(--cw-mono)" fill="var(--ink-2)" transform={`rotate(-90 14 ${H / 2})`}>
              Grain
            </text>
          </svg>
          <div className={styles.legend}>
            <span className={styles.legendItem}><span className={styles.swatchHome} /> Home</span>
            <span className={styles.legendItem}><span className={styles.swatchForeign} /> Foreign</span>
            <span className={styles.legendItem}><span className={styles.swatchSolid} /> own frontier</span>
            <span className={styles.legendItem}><span className={styles.swatchDash} /> consume with trade</span>
          </div>

          <div className={styles.readPanel}>
            <div className={styles.caRow}>
              <span>Home → <strong>{r.home.caGood}</strong></span>
              <span>Foreign → <strong>{r.foreign.caGood}</strong></span>
              <span>price <strong>{r.price.toFixed(2)}</strong> grain/chip</span>
            </div>
            <div className={styles.readHead}>
              <span className={`${styles.readChip} ${toneClass}`}>{r.read.label}</span>
            </div>
            <div className={styles.readVerdict}>{r.read.verdict}</div>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.groupLabel}>Home · output per worker</div>
          <SliderField label="Chips" value={inputs.homeChips} min={1} max={10} step={1} tone="home" onChange={(v) => update("homeChips", v)} />
          <SliderField label="Grain" value={inputs.homeGrain} min={1} max={10} step={1} tone="home" onChange={(v) => update("homeGrain", v)} />
          <div className={styles.groupLabel}>Foreign · output per worker</div>
          <SliderField label="Chips" value={inputs.foreignChips} min={1} max={10} step={1} tone="foreign" onChange={(v) => update("foreignChips", v)} />
          <SliderField label="Grain" value={inputs.foreignGrain} min={1} max={10} step={1} tone="foreign" onChange={(v) => update("foreignGrain", v)} />
          <div className={styles.groupLabel}>Terms of trade</div>
          <SliderField label="Price within feasible band" value={inputs.split} min={0} max={1} step={0.01}
            fmt={(v) => (v <= 0.2 ? "favours one side" : v >= 0.8 ? "favours other" : "even")}
            onChange={(v) => update("split", v)} />
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          The solid line is each country&apos;s production frontier — the most it
          can make alone. The dashed line is what it can <em>consume</em> after
          specialising and trading: entirely outside its own frontier. That gap
          is the gain. Ricardo&apos;s math is right about the aggregate gain; the
          terms-of-trade slider is where the fight over <em>who gets it</em> lives.
        </span>
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, fmt, tone, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  fmt?: (v: number) => string; tone?: "home" | "foreign"; onChange: (v: number) => void;
}) {
  const id = useId();
  const valClass = tone === "home" ? styles.valHome : tone === "foreign" ? styles.valForeign : styles.sliderValue;
  return (
    <div className={styles.field}>
      <div className={styles.sliderHead}>
        <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
        <span className={valClass}>{fmt ? fmt(value) : value}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className={styles.range} />
    </div>
  );
}
