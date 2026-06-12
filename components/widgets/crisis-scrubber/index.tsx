"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./crisis-scrubber.module.css";
import { EPISODES, STAGE_NAMES } from "./data";

interface CrisisScrubberProps {
  /** Name of the episode to start on. Defaults to 2008 GFC. */
  defaultEpisode?: string;
}

/**
 * Crisis-scrubber widget (F1/F2 hero). Six-stage template applied to
 * three reference episodes (2008 GFC, 1997 Asian Crisis, 1929 Great
 * Depression). The user clicks through stages and reads three columns:
 * what's visible to a normal observer, what's happening underneath, and
 * a metric strip with the current stage marked along each metric's path.
 *
 * Keyboard ← / → also scrubs.
 */
export function CrisisScrubber({
  defaultEpisode = "2008 · Global Financial Crisis",
}: CrisisScrubberProps) {
  const [episodeName, setEpisodeName] = useState(defaultEpisode);
  const [stage, setStage] = useState(0);

  const episode = useMemo(
    () => EPISODES.find((e) => e.name === episodeName) ?? EPISODES[0],
    [episodeName],
  );
  const currentStage = episode.stages[stage];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.matches("input, textarea")) return;
      if (e.key === "ArrowRight") setStage((s) => Math.min(5, s + 1));
      if (e.key === "ArrowLeft") setStage((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          Six-stage template · scrub three episodes
        </div>
        <div className={styles.episodeBtns}>
          {EPISODES.map((ep) => (
            <button
              key={ep.name}
              type="button"
              className={`${styles.episodeBtn} ${
                episodeName === ep.name ? styles.episodeBtnActive : ""
              }`}
              onClick={() => {
                setEpisodeName(ep.name);
                setStage(0);
              }}
            >
              {ep.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.blurb}>{episode.blurb}</div>

      <div className={styles.scrubber}>
        <div className={styles.stages}>
          {STAGE_NAMES.map((name, i) => {
            const cls =
              i === stage
                ? `${styles.stage} ${styles.stageCurrent}`
                : i < stage
                  ? `${styles.stage} ${styles.stagePast}`
                  : styles.stage;
            return (
              <button
                key={name}
                type="button"
                className={cls}
                onClick={() => setStage(i)}
              >
                <span className={styles.stageNo}>
                  STAGE {String(i + 1).padStart(2, "0")}
                </span>
                <span className={styles.stageName}>{name}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.hint}>
          ← / → to scrub · {currentStage.window}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.col}>
          <div className={styles.colLabel}>What&apos;s visible to a normal observer</div>
          <p className={styles.colBody}>{currentStage.visible}</p>
        </div>

        <div className={`${styles.col} ${styles.colUnderneath}`}>
          <div className={`${styles.colLabel} ${styles.colLabelUnderneath}`}>
            What&apos;s happening underneath
          </div>
          <p className={styles.colBody}>{currentStage.underneath}</p>
        </div>

        <div className={styles.col}>
          <div className={styles.metricsLabel}>Metrics at this stage</div>
          {episode.metrics.map((m) => {
            const v = m.vals[stage];
            const min = Math.min(...m.vals);
            const max = Math.max(...m.vals);
            const pct = max === min ? 0.5 : (v - min) / (max - min);
            return (
              <div key={m.lbl} className={styles.metric}>
                <div className={styles.metricHead}>
                  <span>{m.lbl}</span>
                  <span className={styles.metricValue}>{v}</span>
                </div>
                <div className={styles.metricBar}>
                  <div
                    className={styles.metricFill}
                    style={{ width: `${pct * 100}%` }}
                  />
                  {m.vals.map((vv, j) => {
                    const p = max === min ? 0.5 : (vv - min) / (max - min);
                    return (
                      <div
                        key={j}
                        className={`${styles.metricDot} ${
                          j === stage ? styles.metricDotCurrent : styles.metricDotOther
                        }`}
                        style={{ left: `calc(${p * 100}% - 2px)` }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.tell}>
        <div className={styles.tellLabel}>The tell ▸</div>
        <div className={styles.tellBody}>{currentStage.tell}</div>
      </div>

      <div className={styles.foot}>
        Same shape, different costumes.{" "}
        <em>The tells live in the right column.</em>
      </div>
    </div>
  );
}
