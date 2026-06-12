"use client";

import { useState, useId } from "react";
import styles from "./dollar-smile.module.css";
import {
  REGIME_PRESETS,
  regimeCaption,
  regimeName,
  smileFor,
} from "./model";

const W = 540;
const H = 280;

function projectY(v: number): number {
  return H - 40 - ((v - 88) / 30) * (H - 60);
}

function projectX(r: number): number {
  return 50 + (r / 10) * (W - 80);
}

function curveAt(growthOffset: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let r = 0; r <= 10; r += 0.5) {
    const v =
      95 +
      growthOffset * 4 +
      Math.pow(r, 1.4) * 1.5 +
      (growthOffset === 0 && r < 3 ? -3 : 0);
    pts.push([projectX(r), projectY(v)]);
  }
  return pts;
}

/**
 * Dollar-smile widget. Two inputs (US growth differential, global risk-off)
 * compute the implied DXY on the smile curve. Six historical regime presets
 * snap to documented moments (1995 tech boom, 2008 GFC flight, 2020 COVID,
 * 2022 Fed exceptionalism, etc.).
 *
 * Pure state. The visual scales via viewBox.
 */
export function DollarSmile() {
  const [growth, setGrowth] = useState(1.5);
  const [risk, setRisk] = useState(4);

  const dxy = smileFor(growth, risk);

  const curveBaseline = curveAt(0);
  const curveStrong = curveAt(2);
  const curveWeak = curveAt(-2);

  const dotX = projectX(risk);
  const dotY = projectY(dxy);

  const growthId = useId();
  const riskId = useId();

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          The dollar smile · place a moment in history on the curve
        </div>
        <div className={styles.presets}>
          {REGIME_PRESETS.map((r) => (
            <button
              key={r.name}
              type="button"
              className={styles.preset}
              onClick={() => {
                setGrowth(r.growth);
                setRisk(r.risk);
              }}
              title={r.label}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <div className={styles.controlLabelRow}>
              <label htmlFor={growthId} className={styles.controlLabel}>
                US growth differential
              </label>
              <span className={styles.controlValueGrowth}>
                {growth > 0 ? "+" : ""}
                {growth.toFixed(1)}pp
              </span>
            </div>
            <input
              id={growthId}
              type="range"
              min={-3}
              max={3}
              step={0.1}
              value={growth}
              onChange={(e) => setGrowth(parseFloat(e.target.value))}
              className={styles.rangeGrowth}
            />
            <div className={styles.controlHint}>vs developed-world average</div>
          </div>

          <div className={styles.controlGroup}>
            <div className={styles.controlLabelRow}>
              <label htmlFor={riskId} className={styles.controlLabel}>
                Global risk-off intensity
              </label>
              <span className={styles.controlValueRisk}>{risk.toFixed(1)}/10</span>
            </div>
            <input
              id={riskId}
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={risk}
              onChange={(e) => setRisk(parseFloat(e.target.value))}
              className={styles.rangeRisk}
            />
            <div className={styles.controlHint}>0 = calm; 10 = full panic</div>
          </div>

          <div className={styles.caption}>{regimeCaption(growth, risk)}</div>
        </div>

        <div className={styles.chart}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Dollar smile chart">
            {/* y-axis grid */}
            {[88, 95, 105, 115].map((v) => (
              <g key={v}>
                <line
                  x1="50"
                  x2={W}
                  y1={projectY(v)}
                  y2={projectY(v)}
                  stroke="var(--rule)"
                  strokeDasharray="2 3"
                />
                <text
                  x="44"
                  y={projectY(v) + 3}
                  textAnchor="end"
                  fontSize="9"
                  fontFamily="var(--cw-mono)"
                  fill="var(--ink-3)"
                >
                  {v}
                </text>
              </g>
            ))}

            {/* x-axis ticks */}
            {[0, 2.5, 5, 7.5, 10].map((r) => (
              <g key={r}>
                <line
                  x1={projectX(r)}
                  x2={projectX(r)}
                  y1={H - 40}
                  y2={H - 36}
                  stroke="var(--ink-3)"
                />
                <text
                  x={projectX(r)}
                  y={H - 24}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="var(--cw-mono)"
                  fill="var(--ink-3)"
                >
                  {r}
                </text>
              </g>
            ))}
            <text
              x={W / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize="10.5"
              fontFamily="var(--cw-mono)"
              fill="var(--ink-2)"
            >
              Global risk-off intensity
            </text>
            <text
              x="14"
              y={H / 2}
              textAnchor="middle"
              fontSize="10.5"
              fontFamily="var(--cw-mono)"
              fill="var(--ink-2)"
              transform={`rotate(-90 14 ${H / 2})`}
            >
              DXY
            </text>

            {/* Three smile curves */}
            <polyline
              points={curveStrong.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke="var(--cw-green)"
              strokeWidth="1.5"
              opacity="0.45"
              strokeDasharray="3 3"
            />
            <polyline
              points={curveBaseline.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="2"
            />
            <polyline
              points={curveWeak.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke="var(--cw-red)"
              strokeWidth="1.5"
              opacity="0.45"
              strokeDasharray="3 3"
            />

            {/* Current dot */}
            <circle
              cx={dotX}
              cy={dotY}
              r="9"
              fill="var(--gold-deep)"
              stroke="var(--paper)"
              strokeWidth="2"
            />

            {/* Annotations */}
            <text
              x={curveBaseline[0][0] - 2}
              y={curveBaseline[0][1] - 8}
              fontSize="10"
              fontFamily="var(--cw-mono)"
              fill="var(--ink-3)"
            >
              Calm middle
            </text>
            <text
              x={curveBaseline[curveBaseline.length - 1][0] + 2}
              y={curveBaseline[curveBaseline.length - 1][1] - 8}
              fontSize="10"
              fontFamily="var(--cw-mono)"
              fill="var(--ink-3)"
              textAnchor="end"
            >
              Risk-off rally
            </text>

            {/* Curve labels on the right */}
            <text
              x={W - 4}
              y={curveStrong[curveStrong.length - 1][1] + 4}
              textAnchor="end"
              fontSize="9"
              fontFamily="var(--cw-mono)"
              fill="var(--cw-green)"
            >
              +2pp US growth
            </text>
            <text
              x={W - 4}
              y={curveBaseline[curveBaseline.length - 1][1] + 4}
              textAnchor="end"
              fontSize="9"
              fontFamily="var(--cw-mono)"
              fill="var(--ink)"
            >
              growth = world avg
            </text>
            <text
              x={W - 4}
              y={curveWeak[curveWeak.length - 1][1] + 4}
              textAnchor="end"
              fontSize="9"
              fontFamily="var(--cw-mono)"
              fill="var(--cw-red)"
            >
              −2pp US growth
            </text>
          </svg>
        </div>

        <div className={styles.summary}>
          <div>
            <div className={styles.summaryEyebrow}>Implied DXY</div>
            <div className={styles.summaryValue}>{dxy.toFixed(1)}</div>
            <div className={styles.summarySub}>
              Baseline 100. 1995 = 84. 2022 peak = 114.
            </div>
          </div>

          <div className={styles.summarySection}>
            <div className={styles.summaryEyebrow}>Regime</div>
            <div className={styles.summaryRegime}>{regimeName(growth, risk)}</div>
          </div>

          <div className={`${styles.summarySection} ${styles.summaryParagraph}`}>
            Two opposite states produce the same dollar move.{" "}
            <strong>It&apos;s not paradox</strong> — the dollar is both a growth
            asset (when US wins) and a safe asset (when nobody else does).
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        The dollar smiles. <em>It frowns at no one in particular and bites everyone in turn.</em>
      </div>
    </div>
  );
}
