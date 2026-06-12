"use client";

import { useId, useMemo, useState } from "react";
import { useRegime } from "@/components/providers/RegimeProvider";
import type { RegimeInputs } from "@/lib/regime-store";
import styles from "./regime-assets.module.css";
import {
  REGIMES,
  findRegime,
  sixtyFortyReturn,
  verdictsFor,
  type RegimeKey,
} from "./model";

/** Inflation threshold separating disinflationary from inflationary quadrants (CPI YoY %). */
const INFLATION_THRESHOLD = 3.3;
/** Unemployment threshold separating boom from bust quadrants (U-3 %). */
const UNEMPLOYMENT_THRESHOLD = 5.0;

function regimeFromInputs(inputs: RegimeInputs): RegimeKey {
  const inflationUp = inputs.inflation >= INFLATION_THRESHOLD;
  const growthUp = inputs.unemployment < UNEMPLOYMENT_THRESHOLD;
  if (inflationUp && growthUp) return "inflationary-boom";
  if (inflationUp && !growthUp) return "stagflation";
  if (!inflationUp && growthUp) return "disinflationary-boom";
  return "disinflationary-bust";
}

/**
 * Regime × assets matrix (H2 hero).
 *
 * Pick one of the four canonical regimes; see how each asset class has
 * historically performed in real terms, ranked best to worst. The 60/40
 * implied return at the bottom of the panel makes the "stagflation
 * breaks 60/40" insight concrete.
 *
 * Lab-mode reader: when wrapped in a RegimeProvider, the canonical quadrant
 * is derived from the continuous regime (inflation vs 3.3%, unemployment
 * vs 5%) and pinned. Clicking a quadrant still works — it writes back to
 * the regime by inverting the mapping. Outside the provider, behaviour is
 * unchanged.
 */
export function RegimeAssets() {
  const lab = useRegime();
  const derivedKey = lab ? regimeFromInputs(lab.inputs) : null;

  const [localKey, setLocalKey] = useState<RegimeKey>("disinflationary-boom");
  const [followRegime, setFollowRegime] = useState(false);
  const regimeKey = derivedKey ?? localKey;
  const isFollowing = lab !== null && followRegime;
  const followId = useId();

  const regime = findRegime(regimeKey);
  const verdicts = useMemo(() => verdictsFor(regimeKey), [regimeKey]);
  const sf = useMemo(() => sixtyFortyReturn(regimeKey), [regimeKey]);

  if (!regime) return null;

  function pickRegime(key: RegimeKey) {
    if (isFollowing) return; // locked — regime is the source of truth
    if (lab) {
      // Write back to the regime by snapping to representative axis values
      // for the chosen quadrant.
      const inflationUp = key === "inflationary-boom" || key === "stagflation";
      const growthUp = key === "disinflationary-boom" || key === "inflationary-boom";
      lab.patch({
        inflation: inflationUp ? 5.5 : 1.8,
        unemployment: growthUp ? 4.0 : 6.5,
      });
      return;
    }
    setLocalKey(key);
  }

  // Scale bars relative to ±15% so the same widget reads consistently
  // across regimes.
  const SCALE = 15;

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        Regime × assets · pick a quadrant, see which assets dominate
      </div>

      <div className={styles.regimePicker}>
        {REGIMES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => pickRegime(r.key)}
            className={`${styles.regimeCell} ${
              r.key === regimeKey ? styles.regimeCellActive : ""
            }`}
            aria-pressed={r.key === regimeKey}
            disabled={isFollowing && r.key !== regimeKey}
          >
            <span className={styles.regimeLong}>{r.long}</span>
            <span className={styles.regimeShort}>{r.short}</span>
            <span className={styles.regimeEra}>{r.era}</span>
          </button>
        ))}
      </div>

      {lab && (
        <div className={styles.regimeBanner}>
          <span className={styles.regimeBannerLabel}>
            {isFollowing ? "Regime locked" : "Regime auto-selected"}
          </span>
          <span>
            From lab inputs · inflation {lab.inputs.inflation.toFixed(1)}%
            (threshold {INFLATION_THRESHOLD}%) · unemployment{" "}
            {lab.inputs.unemployment.toFixed(1)}% (threshold{" "}
            {UNEMPLOYMENT_THRESHOLD}%).
          </span>
          <label htmlFor={followId} className={styles.regimeBannerToggle}>
            <input
              id={followId}
              type="checkbox"
              checked={followRegime}
              onChange={(e) => setFollowRegime(e.target.checked)}
            />
            <span>Follow regime (lock quadrant picker)</span>
          </label>
        </div>
      )}

      <div className={styles.blurb}>{regime.blurb}</div>

      <div className={styles.assetList}>
        {verdicts.map((v) => {
          const widthPct = Math.min(
            (Math.abs(v.returnPct) / SCALE) * 50,
            50,
          );
          const isNeg = v.returnPct < 0;
          const barClass = isNeg
            ? styles.barFillRed
            : v.tone === "green"
              ? styles.barFillGreen
              : styles.barFillGold;
          const valueClass = isNeg
            ? `${styles.returnValue} ${styles.returnValueRed}`
            : v.tone === "green"
              ? `${styles.returnValue} ${styles.returnValueGreen}`
              : `${styles.returnValue} ${styles.returnValueGold}`;
          return (
            <div key={v.asset.key} className={styles.assetRow}>
              <span
                className={`${styles.rankPip} ${v.rank === 1 ? styles.rankPip1 : ""}`}
                aria-label={`Rank ${v.rank}`}
              >
                {v.rank}
              </span>
              <span className={styles.assetLabel}>{v.asset.label}</span>
              <div className={styles.barWrap} aria-hidden>
                <div className={styles.barCenter} />
                <div className={barClass} style={{ width: `${widthPct}%` }} />
              </div>
              <span className={valueClass}>
                {v.returnPct > 0 ? "+" : ""}
                {v.returnPct}% / yr
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.sixtyForty}>
        <span className={styles.sixtyFortyLabel}>
          Implied 60/40 (stocks/long bonds) real return in this regime
        </span>
        <span
          className={`${styles.sixtyFortyValue} ${
            sf >= 0 ? styles.returnValueGreen : styles.returnValueRed
          }`}
        >
          {sf > 0 ? "+" : ""}
          {sf.toFixed(1)}% / yr
        </span>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          Long-sample post-1970 averages, US-listed assets, real returns. Single
          years deviate widely. The point of the table is the <em>ranking</em> —
          which assets dominate in which regime — not the precision of the
          numbers.
        </span>
      </div>
    </div>
  );
}
