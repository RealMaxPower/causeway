"use client";

import { useId, useMemo, useState } from "react";
import styles from "./currency-planner.module.css";
import {
  CURRENCIES,
  DEFAULT_INPUTS,
  bandTone,
  formatCurrency,
  formatUSD,
  plan,
  strategyLabel,
  type Inputs,
} from "./model";

/**
 * Currency travel planner (H6 hero).
 *
 * Pick the currency you need + how much + when. The widget plots the
 * dollar's strength against that currency relative to its 5-year range,
 * recommends a strategy, and breaks the purchase into a monthly schedule
 * that front-loads when the dollar is strong and back-loads when it isn't.
 */
export function CurrencyPlanner() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const currencyId = useId();
  const amountId = useId();
  const monthsId = useId();

  const result = useMemo(() => plan(inputs), [inputs]);
  const tone = bandTone(result.usdBand);
  const bandClass =
    tone === "red"
      ? styles.bandRed
      : tone === "gold"
        ? styles.bandGold
        : styles.bandGreen;

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((p) => ({ ...p, [key]: value }));
  }

  const savedIfStrong = result.usdCostIfReverts - result.usdCostToday;
  const savedLabel =
    savedIfStrong > 0
      ? `+${formatUSD(savedIfStrong)} cheaper than median`
      : savedIfStrong < 0
        ? `${formatUSD(savedIfStrong)} more than median`
        : "in line with median";

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span>Currency travel planner · convert at the right time</span>
        <span className={styles.strategyTag}>
          {strategyLabel(result.strategy)}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.inputs}>
          <div className={styles.field}>
            <label htmlFor={currencyId} className={styles.fieldLabel}>
              Currency you need
            </label>
            <select
              id={currencyId}
              value={inputs.currencyCode}
              onChange={(e) => update("currencyCode", e.target.value)}
              className={styles.select}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
            <p className={styles.currencyNote}>{result.currency.note}</p>
          </div>

          <div className={styles.field}>
            <label htmlFor={amountId} className={styles.fieldLabel}>
              Amount needed ({inputs.currencyCode})
            </label>
            <div className={styles.amountRow}>
              <input
                id={amountId}
                type="number"
                inputMode="numeric"
                min={1}
                max={10_000_000}
                value={inputs.amount}
                onChange={(e) =>
                  update("amount", Math.max(1, parseFloat(e.target.value) || 0))
                }
                className={styles.amountInput}
              />
              <span className={styles.codeTag}>{inputs.currencyCode}</span>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={monthsId} className={styles.fieldLabel}>
                Months until you need it
              </label>
              <span className={styles.sliderValue}>
                {inputs.monthsToTrip} mo
              </span>
            </div>
            <input
              id={monthsId}
              type="range"
              min={1}
              max={18}
              step={1}
              value={inputs.monthsToTrip}
              onChange={(e) =>
                update("monthsToTrip", parseInt(e.target.value))
              }
              className={styles.range}
            />
            <div className={styles.sliderBounds}>
              <span>1 mo</span>
              <span>9 mo</span>
              <span>18 mo</span>
            </div>
          </div>
        </div>

        <div className={styles.summary}>
          <div>
            <div className={styles.eyebrow}>Spot today</div>
            <div className={styles.spot}>
              {result.spot.toLocaleString(undefined, {
                maximumFractionDigits: result.spot >= 100 ? 0 : 3,
              })}{" "}
              <span style={{ fontSize: 14, color: "var(--ink-3)" }}>
                {inputs.currencyCode}/USD
              </span>
            </div>
            <div className={styles.spotSub}>
              5-year range {result.currency.fiveYearMin.toLocaleString(undefined, { maximumFractionDigits: result.spot >= 100 ? 0 : 3 })} – {result.currency.fiveYearMax.toLocaleString(undefined, { maximumFractionDigits: result.spot >= 100 ? 0 : 3 })}
            </div>

            <div className={styles.rangeBar} role="img" aria-label={`USD strength ${Math.round(result.usdPercentile * 100)} percent of 5-year range`}>
              <div className={styles.rangeTrack} />
              <div
                className={styles.rangeMarker}
                style={{ left: `${result.usdPercentile * 100}%` }}
              />
            </div>
            <div className={styles.rangeLabels}>
              <span>USD weak</span>
              <span>median</span>
              <span>USD strong</span>
            </div>

            <div className={`${styles.band} ${bandClass}`}>
              USD {result.usdBand}{" "}
              <span style={{ opacity: 0.7 }}>
                · {Math.round(result.usdPercentile * 100)}th pct
              </span>
            </div>
          </div>

          <div>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>
                Cost in USD today for{" "}
                {formatCurrency(inputs.amount, inputs.currencyCode)}
              </span>
              <span className={styles.costValue}>
                {formatUSD(result.usdCostToday)}
              </span>
            </div>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>
                If spot reverts to median
              </span>
              <span className={styles.costValue}>
                {formatUSD(result.usdCostIfReverts)}
              </span>
            </div>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>vs median</span>
              <span
                className={styles.costValue}
                style={{
                  color:
                    savedIfStrong > 0
                      ? "var(--cw-green)"
                      : savedIfStrong < 0
                        ? "var(--cw-red)"
                        : "var(--ink-3)",
                }}
              >
                {savedLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.schedule}>
        <div className={styles.scheduleHead}>
          <span>Suggested monthly purchases</span>
          <span>Total {formatCurrency(inputs.amount, inputs.currencyCode)}</span>
        </div>
        <div className={styles.scheduleGrid}>
          {result.schedule.map((s) => (
            <div key={s.month} className={styles.scheduleCell}>
              <div className={styles.scheduleMonth}>
                {s.month === 0 ? "Now" : `+${s.month} mo`}
              </div>
              <div className={styles.scheduleAmount}>
                {formatCurrency(s.units, inputs.currencyCode)}
              </div>
              <div className={styles.scheduleShare}>
                {Math.round(s.share * 100)}%
              </div>
              <div className={styles.scheduleBarWrap}>
                <div
                  className={styles.scheduleBar}
                  style={{ width: `${Math.min(s.share * 100 * 3, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.advice}>
        <div className={styles.adviceLabel}>What to do ▸</div>
        <div className={styles.adviceBody}>{result.advice}</div>
      </div>

      <div className={styles.foot}>
        Hedging is cheapest when home currency is strong.{" "}
        <em>Most households do it backwards.</em>
      </div>
    </div>
  );
}
