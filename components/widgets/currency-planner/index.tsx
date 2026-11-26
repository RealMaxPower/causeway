"use client";

import { useId, useMemo, useState } from "react";
import styles from "./currency-planner.module.css";
import {
  CURRENCIES,
  DATA_NOTICE,
  DEFAULT_INPUTS,
  MAX_AMOUNT,
  MAX_MONTHS,
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
 * Pick the currency you need + how much + when. The widget plots an
 * illustrative rate within illustrative bounds and shows a fixed schedule.
 * It does not fetch live prices or forecast a future exchange-rate move.
 */
export function CurrencyPlanner() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const currencyId = useId();
  const amountId = useId();
  const monthsId = useId();

  const result = useMemo(() => plan(inputs), [inputs]);
  const tone = bandTone(result.rangeBand);
  const bandClass =
    tone === "red"
      ? styles.bandRed
      : tone === "gold"
        ? styles.bandGold
        : styles.bandGreen;

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((p) => ({ ...p, [key]: value }));
  }

  const difference = (Math.round(result.usdCostAtExampleRate * 100) - Math.round(result.usdCostAtMidpoint * 100)) / 100;
  const differenceLabel = difference > 0
    ? `${formatUSD(difference)} more at the example rate`
    : difference < 0 ? `${formatUSD(-difference)} less at the example rate` : "Same rounded USD cost";

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span>Currency travel planner · an illustrative schedule</span>
        <span className={styles.strategyTag}>
          {inputs.amount === 0 ? "No conversion" : inputs.monthsToTrip === 1 ? "One purchase now" : strategyLabel(result.strategy)}
        </span>
      </div>
      <p className={styles.notice}>{DATA_NOTICE}</p>

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
          </div>

          <div className={styles.field}>
            <label htmlFor={amountId} className={styles.fieldLabel}>
              Whole units needed ({inputs.currencyCode})
            </label>
            <div className={styles.amountRow}>
              <input
                id={amountId}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_AMOUNT}
                step={1}
                value={inputs.amount}
                onChange={(e) =>
                  update("amount", Math.min(MAX_AMOUNT, Math.max(0, Math.round(parseFloat(e.target.value) || 0))))
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
              max={MAX_MONTHS}
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
            <div className={styles.eyebrow}>Illustrative exchange rate</div>
            <div className={styles.spot}>
              {result.exampleRate.toLocaleString("en-US", {
                maximumFractionDigits: result.exampleRate >= 100 ? 0 : 3,
              })}{" "}
              <span style={{ fontSize: 14, color: "var(--ink-3)" }}>
                {inputs.currencyCode}/USD
              </span>
            </div>
            <div className={styles.spotSub}>
              Illustrative bounds {result.currency.rangeLow.toLocaleString("en-US")} – {result.currency.rangeHigh.toLocaleString("en-US")}
            </div>

            <div className={styles.rangeBar} role="img" aria-label={`Example rate is ${Math.round(result.rangePosition * 100)} percent of the distance from the lower to upper illustrative bound`}>
              <div className={styles.rangeTrack} />
              <div
                className={styles.rangeMarker}
                style={{ left: `${Math.max(0, Math.min(1, result.rangePosition)) * 100}%` }}
              />
            </div>
            <div className={styles.rangeLabels}>
              <span>Lower bound</span>
              <span>Midpoint</span>
              <span>Upper bound</span>
            </div>

            <div className={`${styles.band} ${bandClass}`}>
              {result.rangeBand} third of example range{" "}
              <span style={{ opacity: 0.7 }}>
                · {Math.round(result.rangePosition * 100)}% of range distance
              </span>
            </div>
          </div>

          <div>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>
                USD at example rate for{" "}
                {formatCurrency(inputs.amount, inputs.currencyCode)}
              </span>
              <span className={styles.costValue}>
                {formatUSD(result.usdCostAtExampleRate)}
              </span>
            </div>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>
                USD at range midpoint ({result.rangeMidpoint.toLocaleString("en-US")})
              </span>
              <span className={styles.costValue}>
                {formatUSD(result.usdCostAtMidpoint)}
              </span>
            </div>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>Difference between examples</span>
              <span
                className={styles.costValue}
                style={{
                  color:
                    difference < 0
                      ? "var(--cw-green)"
                      : difference > 0
                        ? "var(--cw-red)"
                        : "var(--ink-3)",
                }}
              >
                {differenceLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.schedule}>
        <div className={styles.scheduleHead}>
          <span>Example monthly allocations ({inputs.currencyCode})</span>
          <span>Total {formatCurrency(inputs.amount, inputs.currencyCode)}</span>
        </div>
        <div className={styles.scheduleGrid}>
          {result.schedule.map((s) => (
            <div key={s.month} className={styles.scheduleCell}>
              <div className={styles.scheduleMonth}>
                {s.month === 0 ? "Now" : `+${s.month} mo`}
              </div>
              <div className={styles.scheduleAmount}>
                {s.units.toLocaleString("en-US")}
              </div>
              <div className={styles.scheduleShare}>
                ≈{(s.share * 100).toFixed(1)}%
              </div>
              <div className={styles.scheduleBarWrap}>
                <div
                  className={styles.scheduleBar}
                  style={{ width: `${s.share * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.advice}>
        <div className={styles.adviceLabel}>Schedule rule ▸</div>
        <div className={styles.adviceBody}>{result.advice}</div>
      </div>

      <div className={styles.foot}>
        This example uses earlier purchases in the upper third of the range,
        later purchases in the lower third, and even purchases in the middle.
        Allocations use whole foreign-currency units; displayed shares are rounded.
        The range midpoint is not a historical median or a forecast.
        Costs exclude fees and conversion spreads. Check provider quotes before converting.
      </div>
    </div>
  );
}
