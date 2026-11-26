import styles from "./duration-stagger.module.css";
import { HORIZON_MONTHS, type StrategyResult } from "./model";

const CHART_W = 660;
const CHART_H = 130;
const PAD_L = 38;
const PAD_R = 12;
const PAD_T = 10;
const PAD_B = 22;

export function RateChart({ rateChanges }: { rateChanges: number[] }) {
  const cum: number[] = [0];
  let s = 0;
  for (const dr of rateChanges) {
    s += dr;
    cum.push(s);
  }
  const yMin = Math.min(0, ...cum);
  const yMax = Math.max(0.1, ...cum);
  const yRange = Math.max(yMax - yMin, 0.5);

  const xFor = (m: number) =>
    PAD_L + (m / HORIZON_MONTHS) * (CHART_W - PAD_L - PAD_R);
  const yFor = (v: number) =>
    CHART_H - PAD_B - ((v - yMin) / yRange) * (CHART_H - PAD_T - PAD_B);

  const d = cum.map((v, m) => `${m === 0 ? "M" : "L"} ${xFor(m)} ${yFor(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={styles.chartSvg} role="img" aria-label="Bond-yield change over 24 months, in percentage points">
      <line
        x1={PAD_L}
        y1={CHART_H - PAD_B}
        x2={CHART_W - PAD_R}
        y2={CHART_H - PAD_B}
        stroke="var(--ink-2)"
      />
      <line x1={PAD_L} y1={CHART_H - PAD_B} x2={PAD_L} y2={PAD_T} stroke="var(--ink-2)" />
      {/* zero line if range crosses zero */}
      {yMin < 0 && yMax > 0 && (
        <line
          x1={PAD_L}
          x2={CHART_W - PAD_R}
          y1={yFor(0)}
          y2={yFor(0)}
          stroke="var(--rule-strong)"
          strokeDasharray="2 3"
        />
      )}
      {/* y labels: min, mid, max */}
      {[yMin, (yMin + yMax) / 2, yMax].map((v, i) => (
        <text
          key={i}
          x={PAD_L - 4}
          y={yFor(v) + 3}
          textAnchor="end"
          fontSize="9"
          fontFamily="var(--cw-mono)"
          fill="var(--ink-3)"
        >
          {v >= 0 ? "+" : ""}
          {v.toFixed(1)}
        </text>
      ))}
      {/* x ticks */}
      {[0, 6, 12, 18, 24].map((m) => (
        <text
          key={m}
          x={xFor(m)}
          y={CHART_H - 6}
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--cw-mono)"
          fill="var(--ink-3)"
        >
          m{m}
        </text>
      ))}
      <path d={d} stroke="var(--ink)" strokeWidth="2" fill="none" />
    </svg>
  );
}

interface ReturnChartProps {
  results: StrategyResult[];
}

const STRATEGY_COLORS: Record<string, string> = {
  "go-now": "var(--cw-red)",
  "stagger": "var(--gold-deep)",
  "wait-confirmation": "var(--cw-blue)",
};

export function ReturnChart({ results }: ReturnChartProps) {
  const all = results.flatMap((r) => r.points.map((p) => p.cumReturn));
  const yMin = Math.min(0, ...all);
  const yMax = Math.max(1, ...all);
  const yRange = Math.max(yMax - yMin, 1);

  const xFor = (m: number) =>
    PAD_L + (m / HORIZON_MONTHS) * (CHART_W - PAD_L - PAD_R);
  const yFor = (v: number) =>
    CHART_H - PAD_B - ((v - yMin) / yRange) * (CHART_H - PAD_T - PAD_B);

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={styles.chartSvg} role="img" aria-label="Additive strategy returns from zero through month 24">
      <line
        x1={PAD_L}
        y1={CHART_H - PAD_B}
        x2={CHART_W - PAD_R}
        y2={CHART_H - PAD_B}
        stroke="var(--ink-2)"
      />
      <line x1={PAD_L} y1={CHART_H - PAD_B} x2={PAD_L} y2={PAD_T} stroke="var(--ink-2)" />
      {yMin < 0 && yMax > 0 && (
        <line
          x1={PAD_L}
          x2={CHART_W - PAD_R}
          y1={yFor(0)}
          y2={yFor(0)}
          stroke="var(--rule-strong)"
          strokeDasharray="2 3"
        />
      )}
      {[yMin, (yMin + yMax) / 2, yMax].map((v, i) => (
        <text
          key={i}
          x={PAD_L - 4}
          y={yFor(v) + 3}
          textAnchor="end"
          fontSize="9"
          fontFamily="var(--cw-mono)"
          fill="var(--ink-3)"
        >
          {v >= 0 ? "+" : ""}
          {v.toFixed(1)}%
        </text>
      ))}
      {[0, 6, 12, 18, 24].map((m) => (
        <text
          key={m}
          x={xFor(m)}
          y={CHART_H - 6}
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--cw-mono)"
          fill="var(--ink-3)"
        >
          m{m}
        </text>
      ))}
      {results.map((r) => {
        const color = STRATEGY_COLORS[r.strategy.id] ?? "var(--ink)";
        const d = [{ month: 0, cumReturn: 0 }, ...r.points]
          .map((p, index) => `${index === 0 ? "M" : "L"} ${xFor(p.month)} ${yFor(p.cumReturn)}`)
          .join(" ");
        return <path key={r.strategy.id} d={d} stroke={color} strokeWidth="2" fill="none" />;
      })}
    </svg>
  );
}
