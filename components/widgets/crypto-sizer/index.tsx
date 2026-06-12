"use client";

import { useId, useMemo, useState } from "react";
import { useRegime } from "@/components/providers/RegimeProvider";
import styles from "./crypto-sizer.module.css";
import {
  DEFAULT_INPUTS,
  compute,
  formatMoney,
  verdictTone,
  type Inputs,
} from "./model";

/** Fed inflation target — used as the reference point for debasement-hedge boost. */
const INFLATION_TARGET = 2.0;
/** Neutral fed-funds reference for the tight-policy drag. */
const NEUTRAL_FED_FUNDS = 3.5;
/** Reserve-asset return boost per 1pp inflation above target (debasement-hedge thesis). */
const RESERVE_BOOST_PER_PP = 2;
/** Tail-risk return drag per 1pp fed-funds above neutral (cost-of-capital). */
const TAIL_DRAG_PER_PP = 3;

/**
 * Crypto portfolio sizer (H9 hero).
 *
 * Two honest readings of bitcoin coexist — tail-risk and reserve-asset.
 * Drag the allocation; the two columns show what the portfolio looks like
 * under each reading. The verdict tells you whether the sizing survives
 * the wrong-reading scenario.
 *
 * Lab-mode reader: when wrapped in a RegimeProvider, the regime shifts the
 * effective return assumptions used by compute(). High inflation strengthens
 * the reserve-asset case (debasement hedge); tight policy weakens the
 * tail-risk case (speculative assets de-rate at higher cost of capital).
 * Outside the provider, behaviour is unchanged.
 */
export function CryptoSizer() {
  const regime = useRegime();
  const reserveBoost = regime
    ? Math.round((regime.inputs.inflation - INFLATION_TARGET) * RESERVE_BOOST_PER_PP)
    : 0;
  const tailDrag = regime
    ? Math.round((regime.inputs.fedFunds - NEUTRAL_FED_FUNDS) * -TAIL_DRAG_PER_PP)
    : 0;

  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [followRegime, setFollowRegime] = useState(false);

  const portfolioId = useId();
  const allocId = useId();
  const tailReturnId = useId();
  const tailVolId = useId();
  const reserveReturnId = useId();
  const reserveVolId = useId();
  const drawdownId = useId();
  const followId = useId();

  // When "follow" is on, the two return sliders lock to the regime-implied
  // baseline (DEFAULT_INPUTS + adjustment), with no user contribution.
  const isFollowing = regime !== null && followRegime;
  const tailSliderValue = isFollowing
    ? DEFAULT_INPUTS.tailReturnPct
    : inputs.tailReturnPct;
  const reserveSliderValue = isFollowing
    ? DEFAULT_INPUTS.reserveReturnPct
    : inputs.reserveReturnPct;

  const effectiveInputs = useMemo<Inputs>(() => {
    if (!regime) return inputs;
    return {
      ...inputs,
      tailReturnPct: tailSliderValue + tailDrag,
      reserveReturnPct: reserveSliderValue + reserveBoost,
    };
  }, [inputs, regime, tailDrag, reserveBoost, tailSliderValue, reserveSliderValue]);
  const result = useMemo(() => compute(effectiveInputs), [effectiveInputs]);

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((p) => ({ ...p, [key]: value }));
  }

  const tone = verdictTone(result.verdict);
  const verdictClass =
    tone === "green"
      ? `${styles.verdict} ${styles.verdictGreen}`
      : tone === "gold"
        ? `${styles.verdict} ${styles.verdictGold}`
        : `${styles.verdict} ${styles.verdictRed}`;

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          Crypto sizer · survive both readings
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
      </div>

      {regime && (
        <div className={styles.regimeBanner}>
          <span className={styles.regimeBannerLabel}>Regime adjustment</span>
          <span>
            Inflation {regime.inputs.inflation.toFixed(1)}% vs target {INFLATION_TARGET}% →
            reserve return {fmtDelta(reserveBoost)}pct ·
            Fed funds {regime.inputs.fedFunds.toFixed(1)}% vs neutral {NEUTRAL_FED_FUNDS}% →
            tail return {fmtDelta(tailDrag)}pct
          </span>
          <label htmlFor={followId} className={styles.regimeBannerToggle}>
            <input
              id={followId}
              type="checkbox"
              checked={followRegime}
              onChange={(e) => setFollowRegime(e.target.checked)}
            />
            <span>Follow regime (lock return sliders)</span>
          </label>
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.inputs}>
          <div className={styles.sectionLabel}>Position</div>

          <div className={styles.field}>
            <label htmlFor={portfolioId} className={styles.fieldLabel}>
              Total portfolio
            </label>
            <div className={styles.fieldRow}>
              <input
                id={portfolioId}
                type="number"
                min={0}
                max={100_000_000}
                step={5000}
                value={inputs.portfolio}
                onChange={(e) =>
                  update(
                    "portfolio",
                    Math.max(0, parseFloat(e.target.value) || 0),
                  )
                }
                className={styles.input}
              />
              <span className={styles.unit}>USD</span>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={allocId} className={styles.fieldLabel}>
                Crypto allocation
              </label>
              <span className={styles.sliderValue}>
                {inputs.allocationPct.toFixed(1)}%
              </span>
            </div>
            <input
              id={allocId}
              type="range"
              min={0}
              max={25}
              step={0.5}
              value={inputs.allocationPct}
              onChange={(e) =>
                update("allocationPct", parseFloat(e.target.value))
              }
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={drawdownId} className={styles.fieldLabel}>
                Tail drawdown scenario
              </label>
              <span className={styles.sliderValue}>
                −{inputs.drawdownPct}%
              </span>
            </div>
            <input
              id={drawdownId}
              type="range"
              min={0}
              max={100}
              step={5}
              value={inputs.drawdownPct}
              onChange={(e) =>
                update("drawdownPct", parseInt(e.target.value))
              }
              className={styles.range}
            />
          </div>

          <div className={styles.readingPair}>
            <div className={styles.readingBlock}>
              <div
                className={`${styles.sectionLabel} ${styles.sectionLabelTail}`}
              >
                Tail-risk reading
              </div>

              <div className={styles.field}>
                <div className={styles.sliderHead}>
                  <label htmlFor={tailReturnId} className={styles.fieldLabel}>
                    {isFollowing
                      ? `Expected return · regime ${fmtDelta(tailDrag)} (locked)`
                      : tailDrag !== 0
                        ? `Expected return · slider + regime ${fmtDelta(tailDrag)}`
                        : "Expected return"}
                  </label>
                  <span className={styles.sliderValue}>
                    {effectiveInputs.tailReturnPct > 0 ? "+" : ""}
                    {effectiveInputs.tailReturnPct}%
                  </span>
                </div>
                <input
                  id={tailReturnId}
                  type="range"
                  min={-50}
                  max={20}
                  step={1}
                  value={tailSliderValue}
                  onChange={(e) =>
                    update("tailReturnPct", parseInt(e.target.value))
                  }
                  disabled={isFollowing}
                  className={styles.range}
                />
              </div>

              <div className={styles.field}>
                <div className={styles.sliderHead}>
                  <label htmlFor={tailVolId} className={styles.fieldLabel}>
                    Annualised vol
                  </label>
                  <span className={styles.sliderValue}>
                    {inputs.tailVolPct}%
                  </span>
                </div>
                <input
                  id={tailVolId}
                  type="range"
                  min={20}
                  max={150}
                  step={5}
                  value={inputs.tailVolPct}
                  onChange={(e) =>
                    update("tailVolPct", parseInt(e.target.value))
                  }
                  className={styles.range}
                />
              </div>
            </div>

            <div className={styles.readingBlock}>
              <div
                className={`${styles.sectionLabel} ${styles.sectionLabelReserve}`}
              >
                Reserve-asset reading
              </div>

              <div className={styles.field}>
                <div className={styles.sliderHead}>
                  <label
                    htmlFor={reserveReturnId}
                    className={styles.fieldLabel}
                  >
                    {isFollowing
                      ? `Expected return · regime ${fmtDelta(reserveBoost)} (locked)`
                      : reserveBoost !== 0
                        ? `Expected return · slider + regime ${fmtDelta(reserveBoost)}`
                        : "Expected return"}
                  </label>
                  <span className={styles.sliderValue}>
                    +{effectiveInputs.reserveReturnPct}%
                  </span>
                </div>
                <input
                  id={reserveReturnId}
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={reserveSliderValue}
                  onChange={(e) =>
                    update("reserveReturnPct", parseInt(e.target.value))
                  }
                  disabled={isFollowing}
                  className={styles.range}
                />
              </div>

              <div className={styles.field}>
                <div className={styles.sliderHead}>
                  <label htmlFor={reserveVolId} className={styles.fieldLabel}>
                    Annualised vol
                  </label>
                  <span className={styles.sliderValue}>
                    {inputs.reserveVolPct}%
                  </span>
                </div>
                <input
                  id={reserveVolId}
                  type="range"
                  min={20}
                  max={120}
                  step={5}
                  value={inputs.reserveVolPct}
                  onChange={(e) =>
                    update("reserveVolPct", parseInt(e.target.value))
                  }
                  className={styles.range}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.results}>
          <div className={verdictClass}>
            {result.verdict.replace("-", " ")}
          </div>
          <p className={styles.explanation}>{result.explanation}</p>

          <div className={styles.compareTable}>
            <div className={styles.compareHead}>Metric</div>
            <div className={`${styles.compareHead} ${styles.compareHeadTail}`}>
              Tail-risk
            </div>
            <div
              className={`${styles.compareHead} ${styles.compareHeadReserve}`}
            >
              Reserve
            </div>

            <div
              className={`${styles.compareCell} ${styles.compareCellLabel}`}
            >
              Expected $ from crypto (1y)
            </div>
            <div
              className={`${styles.compareCell} ${result.tail.expectedDollar < 0 ? styles.compareCellRed : ""}`}
            >
              {formatMoney(result.tail.expectedDollar)}
            </div>
            <div
              className={`${styles.compareCell} ${result.reserve.expectedDollar > 0 ? styles.compareCellGreen : ""}`}
            >
              {formatMoney(result.reserve.expectedDollar)}
            </div>

            <div
              className={`${styles.compareCell} ${styles.compareCellLabel}`}
            >
              Portfolio return (1y)
            </div>
            <div className={styles.compareCell}>
              {result.tail.portfolioReturnPct.toFixed(1)}%
            </div>
            <div className={styles.compareCell}>
              {result.reserve.portfolioReturnPct.toFixed(1)}%
            </div>

            <div
              className={`${styles.compareCell} ${styles.compareCellLabel}`}
            >
              Crypto&apos;s share of portfolio vol
            </div>
            <div
              className={`${styles.compareCell} ${result.tail.volContribPct > 60 ? styles.compareCellRed : ""}`}
            >
              {result.tail.volContribPct.toFixed(0)}%
            </div>
            <div
              className={`${styles.compareCell} ${result.reserve.volContribPct > 60 ? styles.compareCellRed : ""}`}
            >
              {result.reserve.volContribPct.toFixed(0)}%
            </div>

            <div
              className={`${styles.compareCell} ${styles.compareCellLabel}`}
            >
              Drawdown if BTC −{inputs.drawdownPct}%
            </div>
            <div
              className={`${styles.compareCell} ${styles.compareCellRed}`}
            >
              −{result.tail.drawdownPortfolioPct.toFixed(1)}% of port
            </div>
            <div
              className={`${styles.compareCell} ${styles.compareCellRed}`}
            >
              −{result.reserve.drawdownPortfolioPct.toFixed(1)}% of port
            </div>
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What to do ▸</span>
        <span>
          Size for the wrong reading, not the right one. If the position
          breaks the portfolio under the tail-risk reading, you&apos;ve sized
          for a reserve-asset bet you can&apos;t afford to lose.
        </span>
      </div>
    </div>
  );
}

function fmtDelta(n: number): string {
  if (n > 0) return `+${n}pct`;
  if (n < 0) return `${n}pct`;
  return "0";
}
