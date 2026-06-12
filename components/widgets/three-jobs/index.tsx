"use client";

import { useId, useMemo, useState } from "react";
import styles from "./three-jobs.module.css";
import {
  DEFAULT_INPUTS,
  PRESETS,
  score,
  bandTone,
  type Inputs,
} from "./model";

/**
 * Three jobs of money (A2 hero).
 *
 * Pick a monetary substrate, or dial inflation, volatility, and acceptance by
 * hand, and watch the three jobs of money score in real time. The lesson is in
 * the trade-off: no setting lights up all three at once.
 */
export function ThreeJobs() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [presetId, setPresetId] = useState<string>("fiat");

  const inflId = useId();
  const volId = useId();
  const accId = useId();

  const result = useMemo(() => score(inputs), [inputs]);
  const activePreset = PRESETS.find((p) => p.id === presetId);

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setInputs(p.inputs);
  }

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((p) => ({ ...p, [key]: value }));
    setPresetId(""); // dirty: no preset active any more
  }

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          Three jobs of money · pick a substrate or dial it yourself
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
        <div className={styles.dials}>
          <SliderField
            id={inflId}
            label="Inflation · annual"
            value={inputs.inflation}
            min={-5}
            max={25}
            step={0.5}
            unit="%"
            boundLeft="−5 (deflation)"
            boundMid="2"
            boundRight="25+"
            onChange={(v) => update("inflation", v)}
          />
          <SliderField
            id={volId}
            label="Volatility · purchasing power"
            value={inputs.volatility}
            min={0}
            max={80}
            step={1}
            unit="%"
            boundLeft="0 (stable)"
            boundMid="40"
            boundRight="80 (wild)"
            onChange={(v) => update("volatility", v)}
          />
          <SliderField
            id={accId}
            label="Acceptance · everyday payment"
            value={inputs.acceptance}
            min={0}
            max={100}
            step={1}
            unit=""
            boundLeft="niche"
            boundMid="50"
            boundRight="universal"
            onChange={(v) => update("acceptance", v)}
          />
        </div>

        <div className={styles.scorecard}>
          <div>
            <div className={styles.eyebrow}>The verdict</div>
            <div className={styles.headline}>{result.headline}</div>
          </div>
          <div className={styles.read}>{result.read}</div>

          <div className={styles.jobs}>
            {result.jobs.map((job) => {
              const tone = bandTone(job.band);
              const toneClass =
                tone === "red" ? styles.red : tone === "gold" ? styles.gold : styles.green;
              return (
                <div key={job.key} className={styles.job}>
                  <div className={styles.jobHead}>
                    <span className={styles.jobLabel}>
                      {job.label}
                      <span className={styles.jobPrefers}>wants {job.prefers}</span>
                    </span>
                    <span className={`${styles.bandChip} ${toneClass}`}>{job.band}</span>
                  </div>
                  <div className={styles.meter} role="img" aria-label={`${job.label}: ${job.band}`}>
                    <div
                      className={`${styles.meterFill} ${toneClass}`}
                      style={{ width: `${Math.round(job.score)}%` }}
                    />
                  </div>
                  <div className={styles.jobVerdict}>{job.verdict}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          A teaching model, not a measurement. The bands carry the lesson: drag
          any slider and watch a gain in one job cost you another. That trade-off
          is the whole reason monetary debates never end — they&apos;re really
          arguments about which job to optimise for.
        </span>
      </div>
    </div>
  );
}

interface SliderFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  boundLeft: string;
  boundMid: string;
  boundRight: string;
  onChange: (v: number) => void;
}

function SliderField({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  boundLeft,
  boundMid,
  boundRight,
  onChange,
}: SliderFieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.sliderHead}>
        <label htmlFor={id} className={styles.fieldLabel}>
          {label}
        </label>
        <span className={styles.sliderValue}>
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={styles.range}
      />
      <div className={styles.sliderBounds}>
        <span>{boundLeft}</span>
        <span>{boundMid}</span>
        <span>{boundRight}</span>
      </div>
    </div>
  );
}
