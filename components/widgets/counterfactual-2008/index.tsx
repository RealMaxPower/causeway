"use client";

import { useMemo, useState } from "react";
import styles from "./counterfactual-2008.module.css";
import { BASELINE, N_QUARTERS } from "./baseline";
import { PRESETS, applyDeviation, formatPp } from "./model";

/**
 * Counterfactual machine (F2 hero).
 *
 * Pick a preset rate-path deviation, see how unemployment, inflation,
 * and growth would have moved given the C5 transmission lags. Three
 * small line charts; baseline solid, counterfactual dashed. Summary
 * panel shows the integrated gaps as headline numbers.
 */
export function Counterfactual2008() {
  const [presetId, setPresetId] = useState<string>("actual");

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId],
  );
  const result = useMemo(() => applyDeviation(preset.deviation), [preset]);

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          Counterfactual · what if the Fed had chosen differently?
        </div>
        <div className={styles.headBlurb}>{preset.blurb}</div>
      </div>

      <div className={styles.presets}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPresetId(p.id)}
            className={`${styles.preset} ${
              presetId === p.id ? styles.presetActive : ""
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className={styles.devStrip}>
        <div className={styles.devHead}>
          Policy-rate deviation from history (percentage points)
        </div>
        <DeviationStrip deviation={preset.deviation} />
        <div className={styles.devAxis}>
          {["2007", "2008", "2009", "2010", "2011", "2012"].map((y) => (
            <span key={y}>{y}</span>
          ))}
        </div>
      </div>

      <div className={styles.summary}>
        <SummaryCell
          label="Unemployment-quarters"
          value={formatPp(result.unemploymentGap)}
          unit="pp · qtrs (sum)"
          better={result.unemploymentGap < 0}
          worse={result.unemploymentGap > 0.5}
        />
        <SummaryCell
          label="CPI deviation"
          value={formatPp(result.cpiGap)}
          unit="pp (avg across horizon)"
          better={false}
          worse={Math.abs(result.cpiGap) > 0.5}
        />
        <SummaryCell
          label="Growth gap"
          value={formatPp(result.growthGap)}
          unit="pp · qtrs (sum)"
          better={result.growthGap > 0.5}
          worse={result.growthGap < -0.5}
        />
      </div>

      <div className={styles.charts}>
        <CounterfactualChart
          label="Unemployment (U-3)"
          unit="%"
          baseline={BASELINE.map((b) => b.unemp)}
          counterfactual={result.counterfactual.map((p) => p.unemp)}
        />
        <CounterfactualChart
          label="Core CPI · YoY"
          unit="%"
          baseline={BASELINE.map((b) => b.cpi)}
          counterfactual={result.counterfactual.map((p) => p.cpi)}
        />
        <CounterfactualChart
          label="Real GDP growth · QoQ annualised"
          unit="%"
          baseline={BASELINE.map((b) => b.growth)}
          counterfactual={result.counterfactual.map((p) => p.growth)}
        />
      </div>

      <details className={styles.methodology}>
        <summary className={styles.methodologySummary}>
          How this is computed ▸
        </summary>
        <div className={styles.methodologyBody}>
          <p>
            The widget convolves your specified policy-rate deviation against
            the C5 rate-transmission model — eight channels, each with a
            documented lag and elasticity. Unemployment has a 14-month lag
            and a +0.10 elasticity per 100bp hike; core CPI lags 18 months
            with a −0.20 elasticity; the growth channel is approximated at
            an 8-month lag, −1.0 per 100bp.
          </p>
          <p>
            <strong>Caveats.</strong> The C5 elasticities were calibrated for
            normal regime transmission — not the zero-lower-bound, balance-sheet
            crisis transmission of 2008-2010. The model will systematically
            <em>undersell</em> the effect of interventions during periods when
            the financial plumbing was actually broken (the QE channels, the
            swap lines, the BTFP-equivalent). Treat the counterfactual lines
            as <em>directional</em>, not as forecasts.
          </p>
          <p>
            Baseline series come from FRED (FEDFUNDS, UNRATE, CPILFESL, GDPC1)
            for 2007Q1–2012Q4. Counterfactual policy rates are clamped at
            0% to respect the actual zero lower bound.
          </p>
        </div>
      </details>

      <div className={styles.foot}>
        Small assumptions, large counterfactual differences.{" "}
        <em>The whole point of the widget.</em>
      </div>
    </div>
  );
}

interface SummaryCellProps {
  label: string;
  value: string;
  unit: string;
  better?: boolean;
  worse?: boolean;
}

function SummaryCell({ label, value, unit, better, worse }: SummaryCellProps) {
  const cls = better
    ? `${styles.summaryValue} ${styles.summaryValueGreen}`
    : worse
      ? `${styles.summaryValue} ${styles.summaryValueRed}`
      : styles.summaryValue;
  return (
    <div className={styles.summaryCell}>
      <div className={styles.summaryLabel}>{label}</div>
      <div className={cls}>{value}</div>
      <div className={styles.summaryUnit}>{unit}</div>
    </div>
  );
}

interface DeviationStripProps {
  deviation: number[];
}

function DeviationStrip({ deviation }: DeviationStripProps) {
  const maxAbs = Math.max(0.5, ...deviation.map(Math.abs));
  return (
    <div className={styles.devGrid} role="img" aria-label="Policy rate deviation by quarter">
      {deviation.map((d, q) => {
        const pct = Math.abs(d) / maxAbs;
        const heightPct = pct * 50;
        const isCut = d < 0;
        return (
          <div key={q} className={styles.devBar} title={`${BASELINE[q].label}: ${formatPp(d)} pp`}>
            <div
              className={`${styles.devBarFill} ${isCut ? styles.devBarCut : styles.devBarHike}`}
              style={{
                height: `${heightPct}%`,
                top: isCut ? "50%" : `${50 - heightPct}%`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

const CHART_W = 660;
const CHART_H = 140;
const CHART_PAD_L = 50;
const CHART_PAD_R = 12;
const CHART_PAD_T = 10;
const CHART_PAD_B = 24;

interface ChartProps {
  label: string;
  unit: string;
  baseline: number[];
  counterfactual: number[];
}

function CounterfactualChart({ label, unit, baseline, counterfactual }: ChartProps) {
  const all = [...baseline, ...counterfactual];
  const yMin = Math.min(...all);
  const yMax = Math.max(...all);
  const yRange = Math.max(yMax - yMin, 0.5);

  const xFor = (q: number) =>
    CHART_PAD_L + (q / (N_QUARTERS - 1)) * (CHART_W - CHART_PAD_L - CHART_PAD_R);
  const yFor = (v: number) =>
    CHART_H - CHART_PAD_B - ((v - yMin) / yRange) * (CHART_H - CHART_PAD_T - CHART_PAD_B);

  const baselineD = baseline
    .map((v, q) => `${q === 0 ? "M" : "L"} ${xFor(q)} ${yFor(v)}`)
    .join(" ");
  const counterfactualD = counterfactual
    .map((v, q) => `${q === 0 ? "M" : "L"} ${xFor(q)} ${yFor(v)}`)
    .join(" ");

  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <div>
      <div className={styles.chartHead}>
        <span>{label}</span>
        <span className={styles.chartUnits}>{unit}</span>
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        role="img"
        aria-label={`${label} baseline vs counterfactual`}
        className={styles.chartSvg}
      >
        <line
          x1={CHART_PAD_L}
          y1={CHART_H - CHART_PAD_B}
          x2={CHART_W - CHART_PAD_R}
          y2={CHART_H - CHART_PAD_B}
          stroke="var(--ink-2)"
        />
        <line
          x1={CHART_PAD_L}
          y1={CHART_H - CHART_PAD_B}
          x2={CHART_PAD_L}
          y2={CHART_PAD_T}
          stroke="var(--ink-2)"
        />

        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={CHART_PAD_L}
              x2={CHART_W - CHART_PAD_R}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="var(--rule)"
              strokeDasharray="2 3"
            />
            <text
              x={CHART_PAD_L - 6}
              y={yFor(t) + 3}
              textAnchor="end"
              fontSize="9"
              fontFamily="var(--cw-mono)"
              fill="var(--ink-3)"
            >
              {t.toFixed(1)}
            </text>
          </g>
        ))}

        {/* x ticks at start, mid, end */}
        {[0, Math.floor(N_QUARTERS / 2), N_QUARTERS - 1].map((q) => (
          <g key={q}>
            <line
              x1={xFor(q)}
              y1={CHART_H - CHART_PAD_B}
              x2={xFor(q)}
              y2={CHART_H - CHART_PAD_B + 4}
              stroke="var(--ink-3)"
            />
            <text
              x={xFor(q)}
              y={CHART_H - 6}
              textAnchor="middle"
              fontSize="9"
              fontFamily="var(--cw-mono)"
              fill="var(--ink-3)"
            >
              {BASELINE[q].label}
            </text>
          </g>
        ))}

        <path d={baselineD} stroke="var(--ink-2)" strokeWidth="2" fill="none" />
        <path
          d={counterfactualD}
          stroke="var(--gold-deep)"
          strokeWidth="2"
          strokeDasharray="4 3"
          fill="none"
        />
      </svg>
      <div className={styles.legend}>
        <span>
          <span className={styles.legendDot} aria-hidden />
          What happened
        </span>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: "var(--gold-deep)" }}
            aria-hidden
          />
          Counterfactual
        </span>
      </div>
    </div>
  );
}
