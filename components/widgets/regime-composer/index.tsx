"use client";

import { useId, useMemo, useState } from "react";
import { useRegime } from "@/components/providers/RegimeProvider";
import styles from "./regime-composer.module.css";
import {
  DEFAULT_INPUTS,
  PRESETS,
  compose,
  signalTone,
  type Inputs,
} from "./model";

/**
 * Regime composer (H1 hero + lab-mode writer).
 *
 * Dial the four regime axes by hand. Watch how the composite tally changes:
 * three-of-four is high-confidence, two-of-four is a turning point. Mirrors
 * the live /regime composite math; works as a sandbox for the same logic.
 *
 * When wrapped in a RegimeProvider (e.g. on `/lab`), this widget writes to
 * the shared regime context so reader widgets respond in real time. Outside
 * the provider (e.g. embedded in H1's MDX), it falls back to local state.
 */
export function RegimeComposer() {
  const regime = useRegime();

  const [localInputs, setLocalInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [localPresetId, setLocalPresetId] = useState<string>("current");

  const inputs = regime?.inputs ?? localInputs;
  const presetId = regime?.presetId ?? localPresetId;

  const inflId = useId();
  const fedId = useId();
  const unempId = useId();
  const sloosId = useId();

  const result = useMemo(() => compose(inputs), [inputs]);
  const activePreset = PRESETS.find((p) => p.id === presetId);

  function applyPreset(id: string) {
    if (regime) {
      regime.applyPreset(id);
      return;
    }
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setLocalPresetId(id);
    setLocalInputs(p.inputs);
  }

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    if (regime) {
      regime.patch({ [key]: value } as Partial<Inputs>);
      return;
    }
    setLocalInputs((p) => ({ ...p, [key]: value }));
    setLocalPresetId(""); // dirty
  }

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          Regime composer · dial the four axes
          <span
            style={{
              marginLeft: 10,
              padding: "2px 7px",
              borderRadius: 999,
              border: "1px solid var(--gold)",
              color: "var(--gold-deep)",
              background: "var(--gold-wash)",
              fontFamily: "var(--cw-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
            }}
          >
            Try the controls
          </span>
        </span>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`${styles.preset} ${
                presetId === p.id ? styles.presetActive : ""
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {activePreset && (
        <div className={styles.blurb}>{activePreset.blurb}</div>
      )}

      <div className={styles.body}>
        <div className={styles.dials}>
          <SliderField
            id={inflId}
            label="Inflation · CPI YoY"
            value={inputs.inflation}
            min={-2}
            max={12}
            step={0.1}
            unit="%"
            boundLeft="−2"
            boundMid="3"
            boundRight="12"
            onChange={(v) => update("inflation", v)}
          />
          <SliderField
            id={fedId}
            label="Money · Fed funds"
            value={inputs.fedFunds}
            min={0}
            max={12}
            step={0.1}
            unit="%"
            boundLeft="0 (ZIRP)"
            boundMid="3 (neutral)"
            boundRight="12"
            onChange={(v) => update("fedFunds", v)}
          />
          <SliderField
            id={unempId}
            label="Labor · U-3 unemployment"
            value={inputs.unemployment}
            min={2}
            max={12}
            step={0.1}
            unit="%"
            boundLeft="2"
            boundMid="5 (long-run avg)"
            boundRight="12"
            onChange={(v) => update("unemployment", v)}
          />
          <SliderField
            id={sloosId}
            label="Credit · SLOOS net % tightening"
            value={inputs.sloos}
            min={-40}
            max={80}
            step={1}
            unit="%"
            boundLeft="easing"
            boundMid="neutral"
            boundRight="tightening"
            onChange={(v) => update("sloos", v)}
          />
        </div>

        <div className={styles.composite}>
          <div>
            <div className={styles.eyebrow}>Regime headline</div>
            <div className={styles.headline}>{result.headline}</div>
          </div>

          <div className={styles.confirmingRow}>
            <span className={styles.confirmingValue}>
              {result.confirming} / {result.total}
            </span>
            <span className={styles.confirmingLabel}>
              axes confirming the dominant theme
            </span>
          </div>

          <div className={styles.confidence}>{result.confidence}</div>

          <div className={styles.axisGrid}>
            {result.axes.map((a) => {
              const tone = signalTone(a.signal);
              const sigClass =
                tone === "red"
                  ? `${styles.axisSignal} ${styles.axisSignalRed}`
                  : tone === "gold"
                    ? `${styles.axisSignal} ${styles.axisSignalGold}`
                    : `${styles.axisSignal} ${styles.axisSignalGreen}`;
              return (
                <div key={a.key} className={styles.axisRow}>
                  <span className={styles.axisLabel}>
                    <span
                      className={`${styles.confirmsDot} ${a.confirms ? styles.confirmsDotOn : styles.confirmsDotOff}`}
                      aria-hidden
                    />
                    {a.label}: {a.value.toFixed(1)}
                    {a.unit}
                  </span>
                  <span className={sigClass}>{a.signal}</span>
                  <span className={styles.axisVerdict}>{a.verdict}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          The regime tally is not a forecast. It&apos;s a count of how many
          orthogonal axes agree on the same theme. Three of four is decisive;
          two of four is the turning point.
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
          {value.toFixed(1)}
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
