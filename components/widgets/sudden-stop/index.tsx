"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./sudden-stop.module.css";
import { PRESETS, simulate, type Preset } from "./model";

const W = 540;
const H = 200;

/**
 * Sudden-stop simulator (D4 hero). 12-period crisis playback with five
 * historical presets (Thailand 1997, Argentina 2001, Turkey 2018,
 * Mexico 1994, calm baseline). Scrub the timeline or play to watch the
 * sentiment → flow → FX → GDP cascade.
 *
 * Pure state. simulate() is a pure function in model.ts.
 */
export function SuddenStop() {
  const [presetName, setPresetName] = useState<string>(PRESETS[0].name);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(11);

  const preset: Preset = useMemo(
    () => PRESETS.find((p) => p.name === presetName) ?? PRESETS[0],
    [presetName],
  );
  const series = useMemo(
    () => simulate(preset.sentimentPath, preset.defend, preset.cbRate),
    [preset],
  );
  const maxStep = series.length - 1;
  const visible = series.slice(0, step + 1);

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      if (now - last > 600) {
        setStep((s) => {
          if (s >= maxStep) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
        last = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, maxStep]);

  const xFor = (t: number) => 30 + (t / maxStep) * (W - 40);

  function lineFor(
    key: "fx" | "gdp" | "reserves",
    yMin: number,
    yMax: number,
    color: string,
    dashed = false,
  ) {
    const yFor = (v: number) => H - 18 - ((v - yMin) / (yMax - yMin)) * (H - 30);
    const pts = visible.map((d) => `${xFor(d.t)},${yFor(d[key])}`).join(" ");
    return (
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={dashed ? "4 2" : undefined}
      />
    );
  }

  const latest = visible[visible.length - 1];

  function applyPreset(name: string) {
    setPresetName(name);
    setStep(11);
    setPlaying(false);
  }

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          Sudden-stop simulator · {preset.label}
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
        <div className={styles.charts}>
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.playBtn}
              onClick={() => {
                setStep(0);
                setPlaying(true);
              }}
            >
              ▶ Play crisis
            </button>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={() => {
                setStep(11);
                setPlaying(false);
              }}
            >
              Show all
            </button>
            <input
              type="range"
              min={0}
              max={maxStep}
              value={step}
              onChange={(e) => {
                setPlaying(false);
                setStep(parseInt(e.target.value));
              }}
              className={styles.scrubber}
            />
            <span className={styles.scrubberLabel}>
              Q{step + 1}/{series.length}
            </span>
          </div>

          <div className={styles.chartBlock}>
            <div className={styles.chartLabel}>
              Net foreign capital flow (% change)
            </div>
            <svg viewBox={`0 0 ${W} ${H}`}>
              <line
                x1="30"
                x2={W}
                y1={H - 18 - ((0 - -30) / 60) * (H - 30)}
                y2={H - 18 - ((0 - -30) / 60) * (H - 30)}
                stroke="var(--rule)"
              />
              {visible.map((d) => {
                const flowY0 = H - 18 - ((0 - -30) / 60) * (H - 30);
                const flowY1 = H - 18 - ((d.flow - -30) / 60) * (H - 30);
                return (
                  <rect
                    key={d.t}
                    x={xFor(d.t) - 8}
                    y={Math.min(flowY0, flowY1)}
                    width="16"
                    height={Math.abs(flowY1 - flowY0)}
                    fill={d.flow >= 0 ? "var(--cw-green)" : "var(--cw-red)"}
                    opacity="0.6"
                  />
                );
              })}
              <text x="4" y="14" fontSize="9" fontFamily="var(--cw-mono)" fill="var(--ink-3)">
                +30
              </text>
              <text x="4" y={H - 4} fontSize="9" fontFamily="var(--cw-mono)" fill="var(--ink-3)">
                −30
              </text>
            </svg>
          </div>

          <div className={styles.chartBlock}>
            <div className={styles.chartLabel}>
              FX (gold) · GDP index (green) · Reserves (blue dashed)
            </div>
            <svg viewBox={`0 0 ${W} ${H}`}>
              {[0, 0.5, 1].map((v) => (
                <line
                  key={v}
                  x1="30"
                  x2={W}
                  y1={H - 18 - v * (H - 30)}
                  y2={H - 18 - v * (H - 30)}
                  stroke="var(--rule)"
                  strokeDasharray="2 3"
                />
              ))}
              {lineFor("fx", 0.2, 1.1, "var(--gold-deep)")}
              {lineFor("gdp", 80, 105, "var(--cw-green)")}
              {lineFor("reserves", 0, 50, "var(--cw-blue)", true)}
              <text x="4" y="14" fontSize="9" fontFamily="var(--cw-mono)" fill="var(--ink-3)">
                high
              </text>
              <text x="4" y={H - 4} fontSize="9" fontFamily="var(--cw-mono)" fill="var(--ink-3)">
                low
              </text>
            </svg>
          </div>
        </div>

        <div className={styles.readout}>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>Sentiment</div>
            <div
              className={`${styles.metricValue} ${
                latest.sent < 45 ? styles.metricValueDanger : styles.metricValueInk
              }`}
            >
              {latest.sent}/100
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>FX rate</div>
            <div className={`${styles.metricValue} ${styles.metricValueGold}`}>
              {latest.fx.toFixed(2)}
            </div>
            <div className={styles.metricSub}>
              {((latest.fx - 1) * 100).toFixed(0)}% vs baseline
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>GDP index</div>
            <div className={`${styles.metricValue} ${styles.metricValueGreen}`}>
              {latest.gdp.toFixed(1)}
            </div>
            <div className={styles.metricSub}>
              {(latest.gdp - 100).toFixed(1)}% vs baseline
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>Reserves</div>
            <div className={`${styles.metricValue} ${styles.metricValueBlue}`}>
              {latest.reserves.toFixed(1)}
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>Policy rate</div>
            <div className={`${styles.metricValue} ${styles.metricValueInk}`}>
              {latest.rate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        Foreign capital is not a steady stream.{" "}
        <em>It is a confidence vote, and it can switch sign.</em>
      </div>
    </div>
  );
}
