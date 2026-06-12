"use client";

import { useId, useMemo, useState } from "react";
import styles from "./duration-stagger.module.css";
import {
  DEFAULT_INPUTS,
  HORIZON_MONTHS,
  SCENARIOS,
  findScenario,
  simulateAll,
  type Inputs,
  type ScenarioId,
  type StrategyResult,
} from "./model";

/**
 * Duration stagger simulator (H8 hero).
 *
 * Pick a rate scenario (cuts on time / delayed / higher-for-longer), set
 * a starting and target duration, and compare three strategies side-by-side:
 * go-now (all in), stagger (4 chunks over 12 months), wait-for-confirmation
 * (hold short until cuts confirm). Outputs total return, max drawdown, and
 * final duration for each.
 */
export function DurationStagger() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);

  const startId = useId();
  const targetId = useId();
  const carryId = useId();

  const scenario = findScenario(inputs.scenarioId);
  const results = useMemo(() => simulateAll(inputs), [inputs]);

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((p) => ({ ...p, [key]: value }));
  }

  function setScenario(id: ScenarioId) {
    setInputs((p) => ({ ...p, scenarioId: id }));
  }

  // Find the best total-return strategy (for the gold "best" pip).
  const bestIdx = results.reduce(
    (bestI, r, i) => (r.totalReturn > results[bestI].totalReturn ? i : bestI),
    0,
  );

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        Duration stagger · three strategies, one rate scenario
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <div className={styles.controlLabel}>Rate scenario</div>
          <div className={styles.scenarioRow}>
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenario(s.id)}
                className={`${styles.scenario} ${
                  inputs.scenarioId === s.id ? styles.scenarioActive : ""
                }`}
                aria-pressed={inputs.scenarioId === s.id}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <div className={styles.controlLabel}>Portfolio inputs</div>
          <div className={styles.inputsInline}>
            <div className={styles.field}>
              <label htmlFor={startId} className={styles.fieldLabel}>
                Start duration (y)
              </label>
              <input
                id={startId}
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={inputs.startDuration}
                onChange={(e) =>
                  update("startDuration", Math.max(0, parseFloat(e.target.value) || 0))
                }
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={targetId} className={styles.fieldLabel}>
                Target duration (y)
              </label>
              <input
                id={targetId}
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={inputs.targetDuration}
                onChange={(e) =>
                  update("targetDuration", Math.max(0, parseFloat(e.target.value) || 0))
                }
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={carryId} className={styles.fieldLabel}>
                Carry (% / yr)
              </label>
              <input
                id={carryId}
                type="number"
                min={0}
                max={15}
                step={0.1}
                value={inputs.carryPct}
                onChange={(e) =>
                  update("carryPct", Math.max(0, parseFloat(e.target.value) || 0))
                }
                className={styles.input}
              />
            </div>
          </div>
        </div>
      </div>

      {scenario && <div className={styles.blurb}>{scenario.blurb}</div>}

      <div className={styles.charts}>
        <div>
          <div className={styles.chartHead}>
            <span>Rate path · cumulative change from month 0 (pp)</span>
            <span style={{ color: "var(--ink-3)" }}>24 months →</span>
          </div>
          {scenario && <RateChart rateChanges={scenario.rateChanges} />}
        </div>
        <div>
          <div className={styles.chartHead}>
            <span>Cumulative total return (%) · all three strategies</span>
            <span style={{ color: "var(--ink-3)" }}>24 months →</span>
          </div>
          <ReturnChart results={results} />
          <div className={styles.legend}>
            <span>
              <span
                className={styles.legendDot}
                style={{ background: "var(--cw-red)" }}
                aria-hidden
              />
              Go now
            </span>
            <span>
              <span
                className={styles.legendDot}
                style={{ background: "var(--gold-deep)" }}
                aria-hidden
              />
              Stagger
            </span>
            <span>
              <span
                className={styles.legendDot}
                style={{ background: "var(--cw-blue)" }}
                aria-hidden
              />
              Wait for confirmation
            </span>
          </div>
        </div>
      </div>

      <div className={styles.results}>
        <div className={styles.resultsHead}>
          Outcomes · 24-month horizon under the chosen scenario
        </div>
        <div className={styles.resultsTable}>
          <div className={styles.resultsCellHead}>Strategy</div>
          <div className={styles.resultsCellHead}>Total return</div>
          <div className={styles.resultsCellHead}>Max drawdown</div>
          <div className={styles.resultsCellHead}>Final duration</div>

          {results.map((r, i) => (
            <ResultRow key={r.strategy.id} result={r} isBest={i === bestIdx} />
          ))}
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          Staggering trades the theoretically-optimal outcome for robustness
          across scenarios. Walk all three rate paths — the stagger row is
          almost never the best, but it&apos;s almost never the worst either.
          That&apos;s the trade.
        </span>
      </div>
    </div>
  );
}

interface ResultRowProps {
  result: StrategyResult;
  isBest: boolean;
}

function ResultRow({ result, isBest }: ResultRowProps) {
  const ret = result.totalReturn;
  const retClass =
    ret >= 0
      ? `${styles.resultsCell} ${styles.resultsCellGreen}`
      : `${styles.resultsCell} ${styles.resultsCellRed}`;
  const labelClass = isBest
    ? `${styles.resultsCell} ${styles.resultsCellLabel} ${styles.resultsCellLabelBest}`
    : `${styles.resultsCell} ${styles.resultsCellLabel}`;
  return (
    <>
      <div className={labelClass}>
        {result.strategy.name}
        {isBest && <span className={styles.bestPip}>best</span>}
      </div>
      <div className={retClass}>
        {ret > 0 ? "+" : ""}
        {ret.toFixed(1)}%
      </div>
      <div className={`${styles.resultsCell} ${styles.resultsCellRed}`}>
        −{result.maxDrawdown.toFixed(1)}%
      </div>
      <div className={`${styles.resultsCell} ${styles.resultsCellInk}`}>
        {result.finalDuration.toFixed(1)}y
      </div>
    </>
  );
}

/* ----------------------------- Charts ----------------------------- */

const CHART_W = 660;
const CHART_H = 130;
const PAD_L = 38;
const PAD_R = 12;
const PAD_T = 10;
const PAD_B = 22;

function RateChart({ rateChanges }: { rateChanges: number[] }) {
  const cum: number[] = [];
  let s = 0;
  for (const dr of rateChanges) {
    s += dr;
    cum.push(s);
  }
  const yMin = Math.min(0, ...cum);
  const yMax = Math.max(0.1, ...cum);
  const yRange = Math.max(yMax - yMin, 0.5);

  const xFor = (m: number) =>
    PAD_L + (m / (HORIZON_MONTHS - 1)) * (CHART_W - PAD_L - PAD_R);
  const yFor = (v: number) =>
    CHART_H - PAD_B - ((v - yMin) / yRange) * (CHART_H - PAD_T - PAD_B);

  const d = cum.map((v, m) => `${m === 0 ? "M" : "L"} ${xFor(m)} ${yFor(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={styles.chartSvg} role="img" aria-label="Rate path">
      <line
        x1={PAD_L}
        y1={CHART_H - PAD_B}
        x2={CHART_W - PAD_R}
        y2={CHART_H - PAD_B}
        stroke="var(--ink-2)"
      />
      <line x1={PAD_L} y1={CHART_H - PAD_B} x2={PAD_L} y2={PAD_T} stroke="var(--ink-2)" />
      {/* zero line if range crosses zero */}
      {yMin < 0 && yMax > 0 && (
        <line
          x1={PAD_L}
          x2={CHART_W - PAD_R}
          y1={yFor(0)}
          y2={yFor(0)}
          stroke="var(--rule-strong)"
          strokeDasharray="2 3"
        />
      )}
      {/* y labels: min, mid, max */}
      {[yMin, (yMin + yMax) / 2, yMax].map((v, i) => (
        <text
          key={i}
          x={PAD_L - 4}
          y={yFor(v) + 3}
          textAnchor="end"
          fontSize="9"
          fontFamily="var(--cw-mono)"
          fill="var(--ink-3)"
        >
          {v >= 0 ? "+" : ""}
          {v.toFixed(1)}
        </text>
      ))}
      {/* x ticks */}
      {[0, 6, 12, 18, 23].map((m) => (
        <text
          key={m}
          x={xFor(m)}
          y={CHART_H - 6}
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--cw-mono)"
          fill="var(--ink-3)"
        >
          m{m}
        </text>
      ))}
      <path d={d} stroke="var(--ink)" strokeWidth="2" fill="none" />
    </svg>
  );
}

interface ReturnChartProps {
  results: StrategyResult[];
}

const STRATEGY_COLORS: Record<string, string> = {
  "go-now": "var(--cw-red)",
  "stagger": "var(--gold-deep)",
  "wait-confirmation": "var(--cw-blue)",
};

function ReturnChart({ results }: ReturnChartProps) {
  const all = results.flatMap((r) => r.points.map((p) => p.cumReturn));
  const yMin = Math.min(0, ...all);
  const yMax = Math.max(1, ...all);
  const yRange = Math.max(yMax - yMin, 1);

  const xFor = (m: number) =>
    PAD_L + (m / (HORIZON_MONTHS - 1)) * (CHART_W - PAD_L - PAD_R);
  const yFor = (v: number) =>
    CHART_H - PAD_B - ((v - yMin) / yRange) * (CHART_H - PAD_T - PAD_B);

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={styles.chartSvg} role="img" aria-label="Strategy returns">
      <line
        x1={PAD_L}
        y1={CHART_H - PAD_B}
        x2={CHART_W - PAD_R}
        y2={CHART_H - PAD_B}
        stroke="var(--ink-2)"
      />
      <line x1={PAD_L} y1={CHART_H - PAD_B} x2={PAD_L} y2={PAD_T} stroke="var(--ink-2)" />
      {yMin < 0 && yMax > 0 && (
        <line
          x1={PAD_L}
          x2={CHART_W - PAD_R}
          y1={yFor(0)}
          y2={yFor(0)}
          stroke="var(--rule-strong)"
          strokeDasharray="2 3"
        />
      )}
      {[yMin, (yMin + yMax) / 2, yMax].map((v, i) => (
        <text
          key={i}
          x={PAD_L - 4}
          y={yFor(v) + 3}
          textAnchor="end"
          fontSize="9"
          fontFamily="var(--cw-mono)"
          fill="var(--ink-3)"
        >
          {v >= 0 ? "+" : ""}
          {v.toFixed(1)}%
        </text>
      ))}
      {[0, 6, 12, 18, 23].map((m) => (
        <text
          key={m}
          x={xFor(m)}
          y={CHART_H - 6}
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--cw-mono)"
          fill="var(--ink-3)"
        >
          m{m}
        </text>
      ))}
      {results.map((r) => {
        const color = STRATEGY_COLORS[r.strategy.id] ?? "var(--ink)";
        const d = r.points
          .map((p, m) => `${m === 0 ? "M" : "L"} ${xFor(m)} ${yFor(p.cumReturn)}`)
          .join(" ");
        return <path key={r.strategy.id} d={d} stroke={color} strokeWidth="2" fill="none" />;
      })}
    </svg>
  );
}
