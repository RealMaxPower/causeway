"use client";

import { useMemo, useState, useId } from "react";
import styles from "./inflation-quadrant.module.css";
import {
  DRIVERS,
  PRESETS,
  classify,
  type Drivers,
  type Driver,
} from "./model";

const SIZE = 280;

/**
 * Inflation-quadrant — the C4 hero. Four driver sliders pin a dot in a
 * 2×2 (demand vs supply origin; anchored vs unanchored expectations).
 * The quadrant maps to a regime label and the textbook cure. Five
 * historical presets snap to known episodes (Idle 2019, 2022 spike,
 * 1970s stagflation, 1990s low, Argentina 2024).
 */
export function InflationQuadrant() {
  const [d, setD] = useState<Drivers>({
    demand: 50,
    supply: 50,
    expectations: 30,
    fiscal: 40,
  });
  const [presetName, setPresetName] = useState<string>("");
  const r = useMemo(() => classify(d), [d]);
  const id = useId();

  function applyPreset(name: string) {
    const p = PRESETS.find((x) => x.name === name);
    if (!p) return;
    setD({
      demand: p.demand,
      supply: p.supply,
      expectations: p.expectations,
      fiscal: p.fiscal,
    });
    setPresetName(name);
  }

  function set(k: keyof Drivers, v: number) {
    setD((s) => ({ ...s, [k]: v }));
    setPresetName(""); // dirtied
  }

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          Inflation regime classifier · live
        </div>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className={`${styles.preset} ${
                presetName === p.name ? styles.presetActive : ""
              }`}
              onClick={() => applyPreset(p.name)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.col}>
          <div className={styles.eyebrow}>Drivers · slide each</div>
          <div className={styles.driverGroup}>
            {DRIVERS.map((drv) => (
              <DriverSlider
                key={drv.id}
                driver={drv}
                value={d[drv.id]}
                onChange={(v) => set(drv.id, v)}
                id={`${id}-${drv.id}`}
              />
            ))}
          </div>
        </div>

        <div className={`${styles.col} ${styles.quadrantCol}`}>
          <div className={styles.eyebrow} style={{ alignSelf: "stretch" }}>
            Where you land
          </div>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className={styles.quadrantSvg}
            role="img"
            aria-label="Inflation regime quadrant"
          >
            <rect x="0" y="0" width={SIZE / 2} height={SIZE / 2} fill="oklch(0.55 0.13 80 / 0.08)" />
            <rect x={SIZE / 2} y="0" width={SIZE / 2} height={SIZE / 2} fill="oklch(0.55 0.13 25 / 0.08)" />
            <rect x="0" y={SIZE / 2} width={SIZE / 2} height={SIZE / 2} fill="oklch(0.50 0.13 285 / 0.08)" />
            <rect x={SIZE / 2} y={SIZE / 2} width={SIZE / 2} height={SIZE / 2} fill="oklch(0.50 0.13 145 / 0.08)" />

            <line x1="0" y1={SIZE / 2} x2={SIZE} y2={SIZE / 2} stroke="var(--rule-strong)" strokeWidth="1" />
            <line x1={SIZE / 2} y1="0" x2={SIZE / 2} y2={SIZE} stroke="var(--rule-strong)" strokeWidth="1" />

            <text x="12" y="20" fontSize="10" fontFamily="var(--cw-mono)" fill="var(--gold-deep)" letterSpacing="0.6">COST-PUSH</text>
            <text x={SIZE - 12} y="20" fontSize="10" fontFamily="var(--cw-mono)" fill="var(--cw-red)" letterSpacing="0.6" textAnchor="end">DEMAND-PULL</text>
            <text x="12" y={SIZE - 8} fontSize="10" fontFamily="var(--cw-mono)" fill="var(--cw-blue)" letterSpacing="0.6">FISCAL-DOMINANT</text>
            <text x={SIZE - 12} y={SIZE - 8} fontSize="10" fontFamily="var(--cw-mono)" fill="var(--cw-green)" letterSpacing="0.6" textAnchor="end">EXPECTATIONS</text>

            <text x={SIZE / 2} y="12" fontSize="9" fontFamily="var(--cw-mono)" fill="var(--ink-3)" textAnchor="middle" letterSpacing="0.8">← supply · demand →</text>
            <text x="6" y={SIZE / 2 - 6} fontSize="9" fontFamily="var(--cw-mono)" fill="var(--ink-3)" letterSpacing="0.8" transform={`rotate(-90 6 ${SIZE / 2 - 6})`}>← unanchored · anchored →</text>

            <circle
              cx={(r.xPct / 100) * SIZE}
              cy={SIZE - (1 - r.yPct / 100) * SIZE}
              r="9"
              fill={r.color}
              stroke="var(--paper)"
              strokeWidth="2"
              style={{ transition: "all 200ms ease" }}
            />
            <circle
              cx={(r.xPct / 100) * SIZE}
              cy={SIZE - (1 - r.yPct / 100) * SIZE}
              r="18"
              fill="none"
              stroke={r.color}
              strokeWidth="1"
              opacity="0.4"
              style={{ transition: "all 200ms ease" }}
            />
          </svg>
        </div>

        <div className={`${styles.col} ${styles.readout}`}>
          <div>
            <div className={styles.eyebrow}>Composite headline</div>
            <div className={styles.headline} style={{ color: r.color }}>
              {r.headline}%
            </div>
            <div className={styles.headlineSub}>
              Rough composite. Reality is messier.
            </div>
          </div>

          <div>
            <div className={styles.eyebrow}>Dominant regime</div>
            <div className={styles.regime} style={{ color: r.color }}>
              {r.regime}
            </div>
          </div>

          <div>
            <div className={styles.eyebrow}>What the textbook says to do</div>
            <p className={styles.cureBody}>{r.cure}</p>
          </div>

          <div>
            <div className={styles.eyebrow} style={{ marginBottom: 8 }}>
              Contribution stack
            </div>
            <ContribBar lbl="Demand-pull" v={r.parts.demandPull} color="var(--cw-red)" />
            <ContribBar lbl="Cost-push" v={r.parts.costPush} color="var(--gold-deep)" />
            <ContribBar lbl="Expectations" v={r.parts.expContrib} color="var(--cw-green)" />
            <ContribBar lbl="Fiscal" v={r.parts.fiscalContrib} color="var(--cw-blue)" />
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        Heuristic, not a forecast. The cure that fits one quadrant is wrong in
        the others.
      </div>
    </div>
  );
}

interface DriverSliderProps {
  driver: Driver;
  value: number;
  onChange: (v: number) => void;
  id: string;
}

function DriverSlider({ driver, value, onChange, id }: DriverSliderProps) {
  return (
    <div className={styles.slider}>
      <div className={styles.sliderHead}>
        <label htmlFor={id} className={styles.sliderLabel}>
          {driver.label}
        </label>
        <span className={styles.sliderValue} style={{ color: driver.tone }}>
          {value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={styles.range}
        style={{ accentColor: driver.tone }}
      />
      <div className={styles.sliderBounds}>
        <span>{driver.lo}</span>
        <span>{driver.hi}</span>
      </div>
    </div>
  );
}

interface ContribBarProps {
  lbl: string;
  v: number;
  color: string;
}

function ContribBar({ lbl, v, color }: ContribBarProps) {
  return (
    <div className={styles.contribRow}>
      <div className={styles.contribLabel}>{lbl}</div>
      <div className={styles.contribBar}>
        <div
          className={styles.contribFill}
          style={{ width: `${Math.min(v * 18, 100)}%`, background: color }}
        />
      </div>
      <div className={styles.contribValue}>+{v.toFixed(1)}%</div>
    </div>
  );
}
