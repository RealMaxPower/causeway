"use client";

import { useId, useMemo, useState } from "react";
import { useRegime } from "@/components/providers/RegimeProvider";
import styles from "./regime-composer.module.css";
import {
  DEFAULT_INPUTS,
  PRESETS,
  compose,
  type Inputs,
} from "./model";

/**
 * Regime composer (H1 hero + lab-mode writer).
 *
 * Dial four hypothetical values and compare their levels with the same
 * teaching references used on /regime. No history is supplied here.
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
              aria-pressed={presetId === p.id}
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
            boundMid="3 (reference)"
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
            boundMid="5 (reference)"
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
            boundMid="0 (net balance)"
            boundRight="tightening"
            onChange={(v) => update("sloos", v)}
          />
        </div>

        <div className={styles.composite}>
          <div>
            <div className={styles.eyebrow}>Hypothetical levels</div>
            <div className={styles.headline}>{result.headline}</div>
          </div>

          <div className={styles.detail}>{result.detail}</div>

          <div className={styles.axisGrid}>
            {result.axes.map((a) => {
              const tone = a.tone;
              const sigClass =
                tone === "red"
                  ? `${styles.axisSignal} ${styles.axisSignalRed}`
                  : tone === "gold"
                    ? `${styles.axisSignal} ${styles.axisSignalGold}`
                    : tone === "blue"
                      ? `${styles.axisSignal} ${styles.axisSignalBlue}`
                      : `${styles.axisSignal} ${styles.axisSignalGreen}`;
              return (
                <div key={a.key} className={styles.axisRow}>
                  <span className={styles.axisLabel}>
                    {a.label}: {a.value}
                    {a.unit}
                  </span>
                  <span className={sigClass}>{a.level.band}</span>
                  <span className={styles.axisVerdict}>{a.verdict}</span>
                  <span className={styles.axisReference}>{a.level.reference}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          Presets are illustrations, not current readings or reconstructions of
          dated historical episodes. Badges compare each value with its stated
          teaching reference; they do not score confidence or forecast a cycle.
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
