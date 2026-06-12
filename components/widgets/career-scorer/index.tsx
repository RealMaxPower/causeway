"use client";

import { useId, useMemo, useState } from "react";
import styles from "./career-scorer.module.css";
import {
  DEFAULT_INPUTS,
  SECTORS,
  bandTone,
  phaseLabel,
  score,
  type Inputs,
} from "./model";

/**
 * Career resilience scorer (H4 hero).
 *
 * Pick a sector + tune three personal modifiers (tenure, skill
 * liquidity, geographic mobility). Get back a 0-100 score, a band,
 * a cycle-phase tag, and cycle-aware advice. Pure state.
 */
export function CareerScorer() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const sectorId = useId();
  const tenureId = useId();
  const skillId = useId();
  const geoId = useId();

  const sector = SECTORS.find((s) => s.id === inputs.sectorId) ?? SECTORS[0];
  const result = useMemo(() => score(inputs), [inputs]);
  const tone = bandTone(result.band);

  const scoreClass =
    tone === "red"
      ? `${styles.scoreValue} ${styles.scoreValueRed}`
      : tone === "gold"
        ? `${styles.scoreValue} ${styles.scoreValueGold}`
        : `${styles.scoreValue} ${styles.scoreValueGreen}`;

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className={styles.widget}>
      <div className={styles.head}>Career resilience · score your sector + your situation</div>

      <div className={styles.body}>
        <div className={styles.inputs}>
          <div className={styles.field}>
            <label htmlFor={sectorId} className={styles.fieldLabel}>
              Sector
            </label>
            <select
              id={sectorId}
              value={inputs.sectorId}
              onChange={(e) => update("sectorId", e.target.value)}
              className={styles.sectorSelect}
            >
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className={styles.sectorNote}>{sector.note}</p>
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={tenureId} className={styles.fieldLabel}>
                Tenure in this sector
              </label>
              <span className={styles.sliderValue}>
                {inputs.tenure}
                {inputs.tenure >= 10 ? "+" : ""} yr
              </span>
            </div>
            <input
              id={tenureId}
              type="range"
              min={0}
              max={20}
              step={1}
              value={inputs.tenure}
              onChange={(e) => update("tenure", parseInt(e.target.value))}
              className={styles.range}
            />
            <div className={styles.sliderBounds}>
              <span>0y</span>
              <span>10y</span>
              <span>20y+</span>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={skillId} className={styles.fieldLabel}>
                Skill liquidity (transferable outside sector)
              </label>
              <span className={styles.sliderValue}>{inputs.skillLiquidity}/100</span>
            </div>
            <input
              id={skillId}
              type="range"
              min={0}
              max={100}
              step={5}
              value={inputs.skillLiquidity}
              onChange={(e) => update("skillLiquidity", parseInt(e.target.value))}
              className={styles.range}
            />
            <div className={styles.sliderBounds}>
              <span>specialised</span>
              <span>portable</span>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={geoId} className={styles.fieldLabel}>
                Geographic mobility
              </label>
              <span className={styles.sliderValue}>{inputs.geoMobility}/100</span>
            </div>
            <input
              id={geoId}
              type="range"
              min={0}
              max={100}
              step={5}
              value={inputs.geoMobility}
              onChange={(e) => update("geoMobility", parseInt(e.target.value))}
              className={styles.range}
            />
            <div className={styles.sliderBounds}>
              <span>rooted</span>
              <span>open to relocating</span>
            </div>
          </div>
        </div>

        <div className={styles.summary}>
          <div>
            <div className={styles.eyebrow}>Resilience score</div>
            <div className={scoreClass}>
              {Math.round(result.total)}
              <span className={styles.scoreOutOf}> / 100</span>
            </div>
            <div
              className={styles.scoreBand}
              style={{
                color:
                  tone === "red"
                    ? "var(--cw-red)"
                    : tone === "gold"
                      ? "var(--gold-deep)"
                      : "var(--cw-green)",
              }}
            >
              {result.band}
            </div>
          </div>

          <div className={styles.scorePhase}>
            <div className={styles.scorePhaseTag}>{phaseLabel(result.phase)}</div>
            <div>
              Your sector typically peaks{" "}
              {result.phase === "early"
                ? "first in a recovery; it leads up and it leads down."
                : result.phase === "mid"
                  ? "in mid-expansion; you have lead time on turns."
                  : result.phase === "late"
                    ? "in late expansion; bonuses are largest right before they vanish."
                    : "regardless of the macro cycle; modest highs, modest lows."}
            </div>
          </div>

          <div className={styles.contribTable}>
            <div className={styles.contribRow}>
              <span className={styles.contribLabel}>Sector base</span>
              <span className={styles.contribValue}>
                +{result.contributions.sectorBase.toFixed(0)}
              </span>
            </div>
            <div className={styles.contribRow}>
              <span className={styles.contribLabel}>Tenure</span>
              <span className={styles.contribValue}>
                +{result.contributions.tenure.toFixed(1)}
              </span>
            </div>
            <div className={styles.contribRow}>
              <span className={styles.contribLabel}>Skill liquidity</span>
              <span className={styles.contribValue}>
                +{result.contributions.skillLiquidity.toFixed(1)}
              </span>
            </div>
            <div className={styles.contribRow}>
              <span className={styles.contribLabel}>Geographic mobility</span>
              <span className={styles.contribValue}>
                +{result.contributions.geoMobility.toFixed(1)}
              </span>
            </div>
            <div className={`${styles.contribRow} ${styles.contribTotal}`}>
              <span className={styles.contribLabel}>Total</span>
              <span className={styles.contribValue}>
                {result.total.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.advice}>
        <div className={styles.adviceLabel}>What to do ▸</div>
        <div className={styles.adviceBody}>{result.advice}</div>
      </div>

      <div className={styles.foot}>
        Sector matters more than skill on the macro cycle. <em>Skill matters more than sector on the individual cycle.</em>
      </div>
    </div>
  );
}
