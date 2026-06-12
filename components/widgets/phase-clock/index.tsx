"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import styles from "./phase-clock.module.css";
import {
  CYCLE_PRESETS,
  INDICATORS,
  type Indicator,
  PHASES,
  TAU,
  phaseAt,
  valueAt,
} from "./model";

const SIZE = 340;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 150;
const R_INNER = 90;

/**
 * Phase-clock — C2 working model.
 *
 * A circular dial. The hand rotates clockwise through four phases of the
 * business cycle. Eight indicators are plotted as phase-shifted sinusoids
 * around the same cycle; their dots move along the trail as θ advances.
 * The whole point: indicators don't peak at the same θ. Leading peaks first,
 * coincident tracks, lagging trails.
 *
 * Drive: drag the hand, press play, scrub the slider, or jump to a preset.
 */
export function PhaseClock() {
  const [theta, setTheta] = useState(0.4);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showTrails, setShowTrails] = useState(true);
  const dragRef = useRef(false);
  const scrubId = useId();

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTheta((t) => (t + 0.02 * speed) % TAU), 60);
    return () => clearInterval(id);
  }, [playing, speed]);

  const phase = phaseAt(theta);

  const angleFromPointer = useCallback(
    (svg: SVGSVGElement, clientX: number, clientY: number) => {
      const r = svg.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * SIZE - CX;
      const y = ((clientY - r.top) / r.height) * SIZE - CY;
      let a = Math.atan2(x, -y);
      if (a < 0) a += TAU;
      return a;
    },
    [],
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    dragRef.current = true;
    setPlaying(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    setTheta(angleFromPointer(e.currentTarget, e.clientX, e.clientY));
  };
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    setTheta(angleFromPointer(e.currentTarget, e.clientX, e.clientY));
  };
  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const cycleProgress = ((theta / TAU) * 100).toFixed(0);
  const presetCaption = nearestPresetCaption(theta);

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          Phase clock · indicators peel apart by phase
        </div>
        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.btn} ${playing ? styles.btnActive : ""}`}
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={playing}
          >
            {playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
          >
            Speed ×{speed}
          </button>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showTrails}
              onChange={(e) => setShowTrails(e.target.checked)}
            />
            trails
          </label>
        </div>
      </div>

      <div className={styles.presets}>
        <span className={styles.presetLabel}>Jump to</span>
        {CYCLE_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className={styles.btn}
            onClick={() => {
              setPlaying(false);
              setTheta(p.theta);
            }}
            title={p.caption}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        <div className={styles.clockCol}>
          <svg
            className={styles.clockSvg}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="img"
            aria-label={`Business cycle phase clock — currently ${phase.name}`}
          >
            {PHASES.map((p) => {
              const [a0, a1] = p.range;
              return (
                <path
                  key={p.id}
                  d={wedgePath(CX, CY, R_INNER, R_OUTER, a0, a1)}
                  fill={p.color}
                  opacity={phase.id === p.id ? 0.38 : 0.16}
                  stroke="var(--paper)"
                  strokeWidth="1.5"
                />
              );
            })}

            {PHASES.map((p) => {
              const mid = (p.range[0] + p.range[1]) / 2;
              const r = (R_INNER + R_OUTER) / 2;
              const x = CX + r * Math.sin(mid);
              const y = CY - r * Math.cos(mid);
              return (
                <g key={p.id}>
                  <text
                    x={x}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontFamily="var(--cw-mono)"
                    fill="var(--ink-2)"
                    letterSpacing="0.5"
                  >
                    {`PHASE 0${p.id}`}
                  </text>
                  <text
                    x={x}
                    y={y + 9}
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="var(--cw-serif)"
                    fontStyle="italic"
                    fill="var(--ink)"
                  >
                    {p.name}
                  </text>
                </g>
              );
            })}

            <circle
              cx={CX}
              cy={CY}
              r={R_INNER}
              fill="var(--paper)"
              stroke="var(--ink)"
              strokeWidth="1"
            />

            <g transform={`rotate(${(theta * 180) / Math.PI} ${CX} ${CY})`}>
              <line
                x1={CX}
                y1={CY}
                x2={CX}
                y2={CY - R_OUTER + 6}
                stroke="var(--ink)"
                strokeWidth="2"
              />
              <polygon
                points={`${CX - 6},${CY - R_OUTER + 14} ${CX + 6},${CY - R_OUTER + 14} ${CX},${CY - R_OUTER + 2}`}
                fill="var(--gold-deep)"
                stroke="var(--ink)"
                strokeWidth="1"
              />
              <circle cx={CX} cy={CY} r="6" fill="var(--ink)" />
            </g>

            <text
              x={CX}
              y={CY - 8}
              textAnchor="middle"
              fontSize="9.5"
              fontFamily="var(--cw-mono)"
              fill="var(--ink-3)"
              letterSpacing="0.5"
            >
              CURRENT
            </text>
            <text
              x={CX}
              y={CY + 8}
              textAnchor="middle"
              fontSize="14"
              fontFamily="var(--cw-serif)"
              fontStyle="italic"
              fill="var(--ink)"
            >
              {phase.name}
            </text>
            <text
              x={CX}
              y={CY + 24}
              textAnchor="middle"
              fontSize="10"
              fontFamily="var(--cw-mono)"
              fill="var(--ink-3)"
            >
              θ = {cycleProgress}%
            </text>
          </svg>

          <div className={styles.phaseDesc}>{phase.desc}</div>

          {presetCaption && (
            <div className={styles.phaseDesc} style={{ color: "var(--gold-deep)" }}>
              {presetCaption}
            </div>
          )}

          <div className={styles.scrubGroup}>
            <div className={styles.scrubLabelRow}>
              <label htmlFor={scrubId}>Scrub cycle</label>
              <span className={styles.scrubValue}>{cycleProgress}%</span>
            </div>
            <input
              id={scrubId}
              type="range"
              min={0}
              max={1000}
              value={Math.round((theta / TAU) * 1000)}
              onChange={(e) => {
                setPlaying(false);
                setTheta((parseInt(e.target.value, 10) / 1000) * TAU);
              }}
              className={styles.scrub}
              aria-label="Cycle position"
            />
          </div>
        </div>

        <div className={styles.indicatorsCol}>
          <div className={styles.indHeader}>Indicators by lead/lag</div>
          {(["leading", "coincident", "lagging"] as const).map((group) => (
            <div key={group} className={styles.group}>
              <div className={styles.groupTitle}>{group}</div>
              {INDICATORS.filter((i) => i.kind === group).map((ind) => (
                <IndRow
                  key={ind.id}
                  ind={ind}
                  theta={theta}
                  showTrail={showTrails}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.foot}>
        Drag the hand, scrub the slider, or press play.{" "}
        <em>The peaks don&apos;t line up — that&apos;s the whole game.</em>
      </div>
    </div>
  );
}

interface IndRowProps {
  ind: Indicator;
  theta: number;
  showTrail: boolean;
}

function IndRow({ ind, theta, showTrail }: IndRowProps) {
  const W = 280;
  const H = 22;
  const N = 64;
  const samples: number[] = [];
  for (let i = 0; i < N; i++) {
    samples.push(valueAt(ind, (i / N) * TAU));
  }
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const norm = (x: number) =>
    max === min ? 0.5 : (x - min) / (max - min);

  const dots = samples
    .map((s, i) => `${(i / N) * W},${H - norm(s) * H}`)
    .join(" ");
  const headIdx = Math.round((theta / TAU) * N) % N;
  const headX = (headIdx / N) * W;
  const headY = H - norm(samples[headIdx]) * H;

  const v = valueAt(ind, theta);

  return (
    <div className={styles.indRow}>
      <span className={styles.indName}>{ind.name}</span>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className={styles.indSpark}
        aria-hidden
      >
        {showTrail && (
          <polyline
            points={dots}
            fill="none"
            stroke="var(--rule-strong)"
            strokeWidth="1"
          />
        )}
        <circle cx={headX} cy={headY} r="3" fill="var(--gold-deep)" />
      </svg>
      <span className={styles.indValue}>
        {v.toFixed(1)}
        <span className={styles.indUnit}>{ind.unit}</span>
      </span>
    </div>
  );
}

function wedgePath(
  cx: number,
  cy: number,
  rI: number,
  rO: number,
  a0: number,
  a1: number,
): string {
  const p = (r: number, a: number) =>
    [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;
  const [x0o, y0o] = p(rO, a0);
  const [x1o, y1o] = p(rO, a1);
  const [x0i, y0i] = p(rI, a0);
  const [x1i, y1i] = p(rI, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0o} ${y0o} A ${rO} ${rO} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rI} ${rI} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

function nearestPresetCaption(theta: number): string | null {
  const tol = 0.06;
  for (const p of CYCLE_PRESETS) {
    const d = ((theta - p.theta + TAU) % TAU);
    const dist = Math.min(d, TAU - d);
    if (dist < tol) return p.caption;
  }
  return null;
}
