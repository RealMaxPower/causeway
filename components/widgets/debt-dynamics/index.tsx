"use client";

import { useId, useMemo, useState } from "react";
import styles from "./debt-dynamics.module.css";
import { DEFAULT_INPUTS, PRESETS, compute, fmtPct, type Inputs } from "./model";

const W = 520;
const H = 290;
const PAD = 50;
const CAP = 400; // chart ceiling for debt/GDP

/**
 * Fiscal basics (E1 hero).
 *
 * Set interest rate, growth, primary balance, and starting debt; watch the
 * debt-to-GDP path. The headline is r vs g: growth below the rate makes the
 * line bend down to a finite level; growth above it makes the line compound.
 */
export function DebtDynamics() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [presetId, setPresetId] = useState<string>("moderation");

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

  const maxDebt = Math.max(...r.path.map((p) => p.debt), inputs.d0);
  const yMax = Math.min(Math.max(maxDebt * 1.1, 120), CAP);
  const offChart = maxDebt > CAP;
  const xFor = (yr: number) => PAD + (yr / 30) * (W - 2 * PAD);
  const yFor = (v: number) => H - PAD - (Math.min(v, yMax) / yMax) * (H - 2 * PAD);

  const linePath = r.path
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.year)} ${yFor(p.debt)}`)
    .join(" ");

  const toneClass = r.read.tone === "red" ? styles.red : r.read.tone === "gold" ? styles.gold : styles.green;
  const lineColor = r.read.tone === "red" ? "var(--cw-red)" : r.read.tone === "gold" ? "var(--gold-deep)" : "var(--cw-green)";

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          Debt dynamics · r vs g decides everything
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
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Debt-to-GDP trajectory over 30 years">
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--ink-2)" />
            <line x1={PAD} y1={H - PAD} x2={PAD} y2={PAD} stroke="var(--ink-2)" />

            {[0, 0.5, 1].map((t) => {
              const v = t * yMax;
              return (
                <g key={t}>
                  <line x1={PAD} x2={W - PAD} y1={yFor(v)} y2={yFor(v)} stroke="var(--rule)" strokeDasharray={t === 0 ? "0" : "2 3"} />
                  <text x={PAD - 6} y={yFor(v) + 3} textAnchor="end" fontSize="9.5" fontFamily="var(--cw-mono)" fill="var(--ink-3)">
                    {fmtPct(v)}
                  </text>
                </g>
              );
            })}

            {/* starting-level reference */}
            <line x1={PAD} x2={W - PAD} y1={yFor(inputs.d0)} y2={yFor(inputs.d0)} stroke="var(--ink-3)" strokeDasharray="4 4" opacity="0.5" />

            <path d={linePath} stroke={lineColor} strokeWidth="2.5" fill="none" />
            <circle cx={xFor(30)} cy={yFor(r.path[30].debt)} r="4" fill={lineColor} />
            <text x={xFor(30) - 6} y={yFor(r.path[30].debt) + (r.path[30].debt > inputs.d0 ? 16 : -8)} textAnchor="end" fontSize="11" fontFamily="var(--cw-mono)" fontWeight="500" fill={lineColor}>
              {offChart ? "off the chart" : `${fmtPct(r.final)} in 30y`}
            </text>

            {[0, 15, 30].map((yr) => (
              <text key={yr} x={xFor(yr)} y={H - PAD + 15} textAnchor="middle" fontSize="10" fontFamily="var(--cw-mono)" fill="var(--ink-3)">
                y{yr}
              </text>
            ))}
            <text x="15" y={H / 2} textAnchor="middle" fontSize="10.5" fontFamily="var(--cw-mono)" fill="var(--ink-2)" transform={`rotate(-90 15 ${H / 2})`}>
              Debt / GDP
            </text>
          </svg>

          <div className={styles.readPanel}>
            <div className={styles.statRow}>
              <span className={styles.bigNum}>{offChart ? "→ ∞" : fmtPct(r.final)}</span>
              <span className={styles.statLabel}>debt/GDP in 30 years</span>
              <span className={`${styles.rgBadge} ${r.rMinusG > 0 ? styles.red : styles.green}`}>
                r − g = {r.rMinusG > 0 ? "+" : ""}{r.rMinusG.toFixed(1)}
              </span>
            </div>
            <div className={styles.readHead}>
              <span className={`${styles.readChip} ${toneClass}`}>{r.read.label}</span>
            </div>
            <div className={styles.readVerdict}>{r.read.verdict}</div>
          </div>
        </div>

        <div className={styles.controls}>
          <SliderField label="Interest rate · r" value={inputs.r} min={0} max={8} step={0.1} fmt={(v) => `${v.toFixed(1)}%`} onChange={(v) => update("r", v)} />
          <SliderField label="GDP growth · g" value={inputs.g} min={0} max={8} step={0.1} fmt={(v) => `${v.toFixed(1)}%`} onChange={(v) => update("g", v)} />
          <SliderField label="Primary balance" value={inputs.pb} min={-6} max={6} step={0.1}
            fmt={(v) => (v >= 0 ? `+${v.toFixed(1)}% surplus` : `${v.toFixed(1)}% deficit`)} onChange={(v) => update("pb", v)} />
          <SliderField label="Starting debt/GDP" value={inputs.d0} min={20} max={260} step={5} fmt={(v) => `${v}%`} onChange={(v) => update("d0", v)} />
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          Debt doesn&apos;t have to be &quot;repaid&quot; — it has to grow slower
          than the economy. When growth beats the interest rate, the line bends
          down on its own, deficits and all. When the rate beats growth, every
          year&apos;s interest compounds and only a primary surplus can hold the
          line. That single comparison, r vs g, is fiscal sustainability.
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
