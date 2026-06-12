"use client";

import { useId, useMemo, useState } from "react";
import styles from "./trade-balance.module.css";
import {
  DEFAULT_INPUTS,
  PRESETS,
  compute,
  formatPct,
  regimeLabel,
  regimeTone,
  type Inputs,
} from "./model";

/**
 * Trade balance simulator (D2 hero).
 *
 * Move exports, imports, and the FDI/portfolio mix. Watch the identity
 * CA + KA = 0 hold every time. The narrative tag classifies the
 * configuration into one of five regime types keyed to historical
 * analogues; the prose underneath spells out the implication.
 */
export function TradeBalance() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [presetName, setPresetName] = useState<string>("USA 2024");

  const expId = useId();
  const impId = useId();
  const fdiId = useId();

  const result = useMemo(() => compute(inputs), [inputs]);
  const tone = regimeTone(result.regime);
  const tradeColor = tone === "red"
    ? styles.bigValueRed
    : tone === "green"
      ? styles.bigValueGreen
      : styles.bigValueInk;

  function applyPreset(name: string) {
    const p = PRESETS.find((x) => x.name === name);
    if (!p) return;
    setPresetName(name);
    setInputs(p.inputs);
  }

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((p) => ({ ...p, [key]: value }));
    setPresetName(""); // dirty
  }

  const activePreset = PRESETS.find((p) => p.name === presetName);

  // Bar scaling: max(|trade|) across realistic range is ~25% of GDP.
  // Use a fixed denominator so the bars don't rescale every keystroke.
  const BAR_MAX = 20;
  const tradePct = Math.min(Math.abs(result.tradeBalance) / BAR_MAX, 1);
  const capitalPct = Math.min(Math.abs(result.capitalAccount) / BAR_MAX, 1);

  const regimeTagClass =
    tone === "red"
      ? `${styles.regimeTag} ${styles.regimeTagRed}`
      : tone === "green"
        ? `${styles.regimeTag} ${styles.regimeTagGreen}`
        : `${styles.regimeTag} ${styles.regimeTagGold}`;

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span>Trade balance simulator · the identity holds, always</span>
        <div className={styles.presetRow}>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p.name)}
              className={`${styles.preset} ${
                presetName === p.name ? styles.presetActive : ""
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.inputs}>
          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={expId} className={styles.fieldLabel}>
                Exports (% of GDP)
              </label>
              <span className={styles.sliderValue}>
                {inputs.exports.toFixed(0)}%
              </span>
            </div>
            <input
              id={expId}
              type="range"
              min={0}
              max={50}
              step={1}
              value={inputs.exports}
              onChange={(e) => update("exports", parseInt(e.target.value))}
              className={styles.range}
            />
            <div className={styles.sliderBounds}>
              <span>0</span>
              <span>25</span>
              <span>50</span>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={impId} className={styles.fieldLabel}>
                Imports (% of GDP)
              </label>
              <span className={styles.sliderValue}>
                {inputs.imports.toFixed(0)}%
              </span>
            </div>
            <input
              id={impId}
              type="range"
              min={0}
              max={50}
              step={1}
              value={inputs.imports}
              onChange={(e) => update("imports", parseInt(e.target.value))}
              className={styles.range}
            />
            <div className={styles.sliderBounds}>
              <span>0</span>
              <span>25</span>
              <span>50</span>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={fdiId} className={styles.fieldLabel}>
                Capital mix · share that is FDI (productive)
              </label>
              <span className={styles.sliderValue}>{inputs.fdiShare}%</span>
            </div>
            <input
              id={fdiId}
              type="range"
              min={0}
              max={100}
              step={5}
              value={inputs.fdiShare}
              onChange={(e) => update("fdiShare", parseInt(e.target.value))}
              className={styles.range}
            />
            <div className={styles.sliderBounds}>
              <span>portfolio / hot money</span>
              <span>direct investment</span>
            </div>
          </div>

          {activePreset && (
            <div className={styles.presetNote}>{activePreset.note}</div>
          )}
        </div>

        <div className={styles.identity}>
          <div>
            <div className={styles.eyebrow}>Trade balance · X − M</div>
            <div className={`${styles.bigValue} ${tradeColor}`}>
              {formatPct(result.tradeBalance)}
            </div>
            <div className={styles.smallSub}>of GDP</div>
            <div className={styles.barLabel}>
              <span>deficit</span>
              <span>surplus</span>
            </div>
            <div className={styles.bar} aria-hidden>
              <div className={styles.barCenter} />
              {result.tradeBalance < 0 ? (
                <div
                  className={styles.barFillNeg}
                  style={{ width: `${tradePct * 50}%` }}
                />
              ) : (
                <div
                  className={styles.barFillPos}
                  style={{ width: `${tradePct * 50}%` }}
                />
              )}
            </div>
          </div>

          <div className={styles.divider} />

          <div>
            <div className={styles.eyebrow}>Capital account · −(X − M)</div>
            <div className={`${styles.bigValue} ${
              result.capitalAccount > 0
                ? styles.bigValueGreen
                : result.capitalAccount < 0
                  ? styles.bigValueRed
                  : styles.bigValueInk
            }`}>
              {formatPct(result.capitalAccount)}
            </div>
            <div className={styles.smallSub}>of GDP</div>
            <div className={styles.bar} aria-hidden>
              <div className={styles.barCenter} />
              {result.capitalAccount < 0 ? (
                <div
                  className={styles.barFillNeg}
                  style={{ width: `${capitalPct * 50}%` }}
                />
              ) : (
                <div
                  className={styles.barFillPos}
                  style={{ width: `${capitalPct * 50}%` }}
                />
              )}
            </div>
          </div>

          <div className={styles.divider} />

          <div>
            <div className={styles.eyebrow}>Composition</div>
            <div className={styles.composition}>
              <span>FDI (productive)</span>
              <span className={styles.compositionValue}>
                {formatPct(result.fdi)}
              </span>
            </div>
            <div className={styles.composition}>
              <span>Portfolio (hot money)</span>
              <span className={styles.compositionValue}>
                {formatPct(result.portfolio)}
              </span>
            </div>
            <div className={regimeTagClass}>{regimeLabel(result.regime)}</div>
          </div>
        </div>
      </div>

      <div className={styles.story}>
        <div className={styles.storyLabel}>What this is ▸</div>
        <div className={styles.storyBody}>{result.story}</div>
      </div>

      <div className={styles.foot}>
        Trade deficit and capital surplus are the same sentence.{" "}
        <em>The argument is about what kind, not whether.</em>
      </div>
    </div>
  );
}
