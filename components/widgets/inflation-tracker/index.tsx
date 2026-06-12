"use client";

import { useId, useMemo, useState } from "react";
import styles from "./inflation-tracker.module.css";
import {
  BASKETS,
  REGIMES,
  formatMoney,
  futureCost,
  halfLifeYears,
  pathFor,
  type BasketComponent,
} from "./model";

const W = 540;
const H = 220;
const PAD_L = 50;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 28;

const TONE_COLOR: Record<BasketComponent["tone"], string> = {
  red: "var(--cw-red)",
  blue: "var(--cw-blue)",
  green: "var(--cw-green)",
  gold: "var(--gold-deep)",
};

/**
 * Inflation impact tracker (A5 hero).
 *
 * Enter an amount, pick a regime preset (or scrub the slider), pick a
 * horizon. The chart shows nominal-needed and real-power paths
 * year-by-year. A basket table shows how the headline number hides
 * 4-6× spread across CPI categories.
 */
export function InflationTracker() {
  const [amount, setAmount] = useState(10_000);
  const [rate, setRate] = useState(2.5);
  const [years, setYears] = useState(20);
  const [regimeName, setRegimeName] = useState<string>("Fed target");

  const amountId = useId();
  const rateId = useId();
  const yearsId = useId();

  function applyRegime(name: string) {
    const r = REGIMES.find((x) => x.name === name);
    if (!r) return;
    setRegimeName(name);
    setRate(r.rate);
  }

  function setRateManual(v: number) {
    setRate(v);
    setRegimeName(""); // dirty
  }

  const path = useMemo(() => pathFor(amount, rate, years), [amount, rate, years]);
  const finalPoint = path[path.length - 1];
  const half = halfLifeYears(rate);
  const activeRegime = REGIMES.find((r) => r.name === regimeName);

  // Chart geometry: log-scale on extreme regimes so the path doesn't go vertical.
  const useLog = rate > 30;
  const maxVal = useLog
    ? Math.log10(Math.max(finalPoint.nominalNeeded, amount * 2))
    : Math.max(finalPoint.nominalNeeded, amount * 2);
  const minVal = useLog ? Math.log10(amount / 2) : 0;
  const transform = (v: number) => (useLog ? Math.log10(Math.max(v, 1)) : v);

  const xFor = (yr: number) =>
    PAD_L + (yr / Math.max(years, 1)) * (W - PAD_L - PAD_R);
  const yFor = (v: number) => {
    const t = transform(v);
    return (
      H - PAD_B - ((t - minVal) / Math.max(maxVal - minVal, 0.0001)) * (H - PAD_T - PAD_B)
    );
  };

  const nominalD = path
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.year)} ${yFor(p.nominalNeeded)}`)
    .join(" ");
  const realD = path
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.year)} ${yFor(p.realValue)}`)
    .join(" ");

  // Y axis tick values
  const ticks = [0.25, 0.5, 0.75, 1].map(
    (t) => minVal + t * (maxVal - minVal),
  );

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          Inflation impact tracker · your money over time
        </div>
        <div className={styles.regimes}>
          {REGIMES.map((r) => (
            <button
              key={r.name}
              type="button"
              className={`${styles.regime} ${
                regimeName === r.name ? styles.regimeActive : ""
              }`}
              onClick={() => applyRegime(r.name)}
              title={r.label}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.controls}>
          <div className={styles.field}>
            <label htmlFor={amountId} className={styles.fieldLabel}>
              Amount today
            </label>
            <input
              id={amountId}
              type="number"
              inputMode="numeric"
              min={1}
              max={100_000_000}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseFloat(e.target.value) || 0))}
              className={styles.amountInput}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={rateId} className={styles.fieldLabel}>
                Annual inflation
              </label>
              <span className={styles.sliderValue}>{rate.toFixed(1)}%</span>
            </div>
            <input
              id={rateId}
              type="range"
              min={0}
              max={50}
              step={0.1}
              value={Math.min(rate, 50)}
              onChange={(e) => setRateManual(parseFloat(e.target.value))}
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={yearsId} className={styles.fieldLabel}>
                Horizon
              </label>
              <span className={styles.sliderValue}>{years} yr</span>
            </div>
            <input
              id={yearsId}
              type="range"
              min={1}
              max={50}
              step={1}
              value={years}
              onChange={(e) => setYears(parseInt(e.target.value))}
              className={styles.range}
            />
          </div>

          {activeRegime && (
            <div className={styles.regimeNote}>{activeRegime.note}</div>
          )}
        </div>

        <div className={styles.chart}>
          <div className={styles.chartLabel}>
            Nominal need (red) vs real value of today&apos;s {formatMoney(amount)} (blue)
            {useLog && " · log scale (extreme regime)"}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Inflation path">
            <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--ink-2)" />
            <line x1={PAD_L} y1={H - PAD_B} x2={PAD_L} y2={PAD_T} stroke="var(--ink-2)" />

            {ticks.map((tv, i) => {
              const display = useLog ? Math.pow(10, tv) : tv;
              return (
                <g key={i}>
                  <line
                    x1={PAD_L}
                    x2={W - PAD_R}
                    y1={yFor(display)}
                    y2={yFor(display)}
                    stroke="var(--rule)"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={PAD_L - 6}
                    y={yFor(display) + 3}
                    textAnchor="end"
                    fontSize="9"
                    fontFamily="var(--cw-mono)"
                    fill="var(--ink-3)"
                  >
                    {formatMoney(display)}
                  </text>
                </g>
              );
            })}

            {[0, Math.ceil(years / 2), years].map((yr) => (
              <g key={yr}>
                <line
                  x1={xFor(yr)}
                  x2={xFor(yr)}
                  y1={H - PAD_B}
                  y2={H - PAD_B + 4}
                  stroke="var(--ink-3)"
                />
                <text
                  x={xFor(yr)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="var(--cw-mono)"
                  fill="var(--ink-3)"
                >
                  y{yr}
                </text>
              </g>
            ))}

            <path d={realD} stroke="var(--cw-blue)" strokeWidth="2" fill="none" />
            <path d={nominalD} stroke="var(--cw-red)" strokeWidth="2" fill="none" />

            <circle cx={xFor(years)} cy={yFor(finalPoint.nominalNeeded)} r="3.5" fill="var(--cw-red)" />
            <circle cx={xFor(years)} cy={yFor(finalPoint.realValue)} r="3.5" fill="var(--cw-blue)" />
          </svg>
        </div>

        <div className={styles.summary}>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>In {years} yr you&apos;ll need</div>
            <div className={`${styles.metricValue} ${styles.metricValueNominal}`}>
              {formatMoney(finalPoint.nominalNeeded)}
            </div>
            <div className={styles.metricSub}>
              to buy what {formatMoney(amount)} buys today.
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>Real value then</div>
            <div className={`${styles.metricValue} ${styles.metricValueReal}`}>
              {formatMoney(finalPoint.realValue)}
            </div>
            <div className={styles.metricSub}>
              if you hold {formatMoney(amount)} as cash.
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>Half-life of purchasing power</div>
            <div className={`${styles.metricValue} ${styles.metricValueHalf}`}>
              {Number.isFinite(half) ? `${half.toFixed(1)} yr` : "∞"}
            </div>
            <div className={styles.metricSub}>
              At this rate, your dollar buys half as much after this many years.
            </div>
          </div>
        </div>
      </div>

      <div className={styles.baskets}>
        <div className={styles.basketsHead}>
          Same horizon at category-specific historical rates · what {formatMoney(amount)} grows into
        </div>
        {BASKETS.map((b) => {
          const cost = futureCost(amount, b.realRate, years);
          // Bar width: ±100% relative to headline CPI (2.5%)
          const headlineCost = futureCost(amount, 2.5, years);
          const ratio = cost / headlineCost;
          const offset = ratio > 1 ? 0 : (1 - ratio) * 50;
          const width = ratio > 1 ? Math.min((ratio - 1) * 50, 50) : (ratio < 1 ? (1 - ratio) * 50 : 0);
          const dir = ratio > 1 ? "right" : "left";
          return (
            <div key={b.name} className={styles.basketRow}>
              <span>{b.name}</span>
              <div className={styles.basketBar}>
                <div
                  className={styles.basketFill}
                  style={{
                    background: TONE_COLOR[b.tone],
                    width: `${width}%`,
                    left: dir === "right" ? "50%" : `${50 - offset}%`,
                  }}
                />
              </div>
              <span
                className={styles.basketRate}
                style={{ color: TONE_COLOR[b.tone] }}
              >
                {b.realRate > 0 ? "+" : ""}
                {b.realRate.toFixed(1)}%
              </span>
              <span className={styles.basketCost}>{formatMoney(cost)}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.foot}>
        Headline CPI is the average. <em>Your basket isn&apos;t the average.</em>
      </div>
    </div>
  );
}
