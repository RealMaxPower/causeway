"use client";

import { useId, useMemo, useState } from "react";
import styles from "./supply-demand.module.css";
import { DEFAULT_INPUTS, PRESETS, compute, fmt0, type Inputs } from "./model";

const W = 520;
const H = 300;
const PAD = 48;

/**
 * Supply and demand, properly (B1 hero).
 *
 * Shift either curve or change its elasticity and watch the equilibrium move
 * and the surplus areas — consumer surplus above the price, producer surplus
 * below it — expand and contract. The inframarginal trades shaded here are
 * where the gains from trade actually live.
 */
export function SupplyDemand() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [presetId, setPresetId] = useState<string>("balanced");

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

  const xFor = (q: number) => PAD + (q / r.qMax) * (W - 2 * PAD);
  const yFor = (p: number) => H - PAD - (p / r.pMax) * (H - 2 * PAD);

  // Demand line (0,a) → where it hits P=0 (or chart edge).
  const dEndX = Math.min(r.qMax, r.a / r.b);
  const dEndP = r.a - r.b * dEndX;
  // Supply line (0,c) → chart edge / top.
  const sEndX = Math.min(r.qMax, (r.pMax - r.c) / r.d);
  const sEndP = r.c + r.d * sEndX;

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          Supply &amp; demand · the surplus is the point
          <span className={styles.tryPill}>Try the controls</span>
        </span>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`${styles.preset} ${presetId === p.id ? styles.presetActive : ""}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {activePreset && <div className={styles.blurb}>{activePreset.blurb}</div>}

      <div className={styles.body}>
        <div className={styles.chartCol}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Supply and demand with consumer and producer surplus">
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--ink-2)" />
            <line x1={PAD} y1={H - PAD} x2={PAD} y2={PAD} stroke="var(--ink-2)" />

            {r.eqQ > 0 && (
              <>
                {/* consumer surplus (under demand, above price) */}
                <polygon
                  points={`${xFor(0)},${yFor(r.a)} ${xFor(0)},${yFor(r.eqP)} ${xFor(r.eqQ)},${yFor(r.eqP)}`}
                  fill="var(--cw-green)"
                  opacity="0.16"
                />
                {/* producer surplus (above supply, below price) */}
                <polygon
                  points={`${xFor(0)},${yFor(r.c)} ${xFor(0)},${yFor(r.eqP)} ${xFor(r.eqQ)},${yFor(r.eqP)}`}
                  fill="var(--gold-deep)"
                  opacity="0.18"
                />
                {/* equilibrium guide lines */}
                <line x1={xFor(r.eqQ)} y1={H - PAD} x2={xFor(r.eqQ)} y2={yFor(r.eqP)} stroke="var(--ink-3)" strokeDasharray="3 3" />
                <line x1={PAD} y1={yFor(r.eqP)} x2={xFor(r.eqQ)} y2={yFor(r.eqP)} stroke="var(--ink-3)" strokeDasharray="3 3" />
              </>
            )}

            {/* demand + supply lines */}
            <line x1={xFor(0)} y1={yFor(r.a)} x2={xFor(dEndX)} y2={yFor(Math.max(0, dEndP))} stroke="var(--cw-green)" strokeWidth="2.5" />
            <line x1={xFor(0)} y1={yFor(r.c)} x2={xFor(sEndX)} y2={yFor(sEndP)} stroke="var(--cw-red)" strokeWidth="2.5" />

            {r.eqQ > 0 && <circle cx={xFor(r.eqQ)} cy={yFor(r.eqP)} r="4.5" fill="var(--gold-deep)" />}

            {/* tick labels */}
            {r.eqQ > 0 && (
              <>
                <text x={PAD - 6} y={yFor(r.eqP) + 3} textAnchor="end" fontSize="9.5" fontFamily="var(--cw-mono)" fill="var(--gold-deep)">
                  P {fmt0(r.eqP)}
                </text>
                <text x={xFor(r.eqQ)} y={H - PAD + 14} textAnchor="middle" fontSize="9.5" fontFamily="var(--cw-mono)" fill="var(--gold-deep)">
                  Q {fmt0(r.eqQ)}
                </text>
              </>
            )}

            <text x={xFor(dEndX)} y={yFor(Math.max(0, dEndP)) - 4} textAnchor="end" fontSize="10" fontFamily="var(--cw-mono)" fill="var(--cw-green)">
              demand
            </text>
            <text x={xFor(sEndX) - 2} y={yFor(sEndP) + 2} textAnchor="end" fontSize="10" fontFamily="var(--cw-mono)" fill="var(--cw-red)">
              supply
            </text>
            <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fontFamily="var(--cw-mono)" fill="var(--ink-2)">
              Quantity
            </text>
            <text x="14" y={H / 2} textAnchor="middle" fontSize="10.5" fontFamily="var(--cw-mono)" fill="var(--ink-2)" transform={`rotate(-90 14 ${H / 2})`}>
              Price
            </text>
          </svg>

          <div className={styles.readPanel}>
            <div className={styles.surplusRow}>
              <div className={styles.surplusCell}>
                <span className={styles.surplusLabelCs}>Consumer surplus</span>
                <span className={styles.surplusVal}>{fmt0(r.cs)}</span>
              </div>
              <div className={styles.surplusCell}>
                <span className={styles.surplusLabelPs}>Producer surplus</span>
                <span className={styles.surplusVal}>{fmt0(r.ps)}</span>
              </div>
              <div className={styles.surplusCell}>
                <span className={styles.surplusLabelTot}>Total surplus</span>
                <span className={styles.surplusVal}>{fmt0(r.total)}</span>
              </div>
            </div>
            <div className={styles.readHead}>
              <span className={`${styles.readChip} ${styles.gold}`}>{r.read.label}</span>
            </div>
            <div className={styles.readVerdict}>{r.read.verdict}</div>
          </div>
        </div>

        <div className={styles.controls}>
          <SliderField label="Demand level" value={inputs.demandShift} min={-30} max={30} step={1}
            fmt={(v) => (v > 0 ? `+${v}` : `${v}`)} boundLeft="slump" boundRight="surge"
            onChange={(v) => update("demandShift", v)} />
          <SliderField label="Supply cost" value={inputs.supplyShift} min={-15} max={30} step={1}
            fmt={(v) => (v > 0 ? `+${v}` : `${v}`)} boundLeft="cheaper" boundRight="costly"
            onChange={(v) => update("supplyShift", v)} />
          <SliderField label="Demand elasticity" value={inputs.demandSlope} min={0.3} max={3} step={0.1}
            fmt={(v) => (v <= 0.6 ? "elastic" : v >= 1.8 ? "inelastic" : "mid")} boundLeft="elastic" boundRight="inelastic"
            onChange={(v) => update("demandSlope", v)} />
          <SliderField label="Supply elasticity" value={inputs.supplySlope} min={0.3} max={3} step={0.1}
            fmt={(v) => (v <= 0.6 ? "elastic" : v >= 1.8 ? "inelastic" : "mid")} boundLeft="elastic" boundRight="inelastic"
            onChange={(v) => update("supplySlope", v)} />
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          The crossing point is just the marginal trade. The shaded triangles —
          buyers who&apos;d have paid more, sellers who&apos;d have taken less —
          are the inframarginal trades where the gains from trade live. Total
          surplus is what&apos;s at stake when a policy or shock moves a curve.
        </span>
      </div>
    </div>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  boundLeft: string;
  boundRight: string;
  onChange: (v: number) => void;
}

function SliderField({ label, value, min, max, step, fmt, boundLeft, boundRight, onChange }: SliderFieldProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <div className={styles.sliderHead}>
        <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
        <span className={styles.sliderValue}>{fmt(value)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className={styles.range} />
      <div className={styles.sliderBounds}>
        <span>{boundLeft}</span>
        <span>{boundRight}</span>
      </div>
    </div>
  );
}
