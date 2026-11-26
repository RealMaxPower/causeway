"use client";

import { useId, useMemo, useState } from "react";
import styles from "./duration-stagger.module.css";
import { RateChart, ReturnChart } from "./charts";
import {
  DEFAULT_INPUTS,
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
                  update("startDuration", Math.min(30, Math.max(0, parseFloat(e.target.value) || 0)))
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
                  update("targetDuration", Math.min(30, Math.max(0, parseFloat(e.target.value) || 0)))
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
                  update("carryPct", Math.min(15, Math.max(0, parseFloat(e.target.value) || 0)))
                }
                className={styles.input}
              />
            </div>
          </div>
        </div>
      </div>

      {scenario && (
        <div className={styles.blurb}>
          {scenario.blurb}{" "}
          {scenario.confirmMonth === null
            ? "The wait strategy keeps its starting duration throughout."
            : `The first cut is observed at month ${scenario.confirmMonth}; the wait strategy then takes six monthly steps toward its target.`}
        </div>
      )}

      <div className={styles.charts}>
        <div>
          <div className={styles.chartHead}>
            <span>Bond-yield path · cumulative change (pp)</span>
            <span style={{ color: "var(--ink-3)" }}>24 months →</span>
          </div>
          {scenario && <RateChart rateChanges={scenario.rateChanges} />}
        </div>
        <div>
          <div className={styles.chartHead}>
            <span>Additive cumulative return (%) · all three strategies</span>
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
          <div className={styles.resultsCellHead}>Additive return</div>
          <div className={styles.resultsCellHead}>Max drawdown (% of peak)</div>
          <div className={styles.resultsCellHead}>Final duration</div>

          {results.map((r, i) => (
            <ResultRow key={r.strategy.id} result={r} isBest={i === bestIdx} />
          ))}
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>Model assumptions ▸</span>
        <span>
          Monthly contribution (%) ≈ carry ÷ 12 − duration × yield change in
          percentage points. Contributions are added without compounding;
          every strategy receives the same fixed carry. Duration measures price
          sensitivity, not maturity. This illustration assumes parallel yield
          changes and ignores convexity, fees and changing coupons. Drawdown is
          the largest percentage fall from prior peak wealth, starting at 100.
          Staggering uses quarter steps at months 0, 3, 6 and 9; it does not
          guarantee the best return or the smallest loss.
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
        {result.maxDrawdown > 0 ? "−" : ""}{result.maxDrawdown.toFixed(1)}%
      </div>
      <div className={`${styles.resultsCell} ${styles.resultsCellInk}`}>
        {result.finalDuration.toFixed(1)}y
      </div>
    </>
  );
}
