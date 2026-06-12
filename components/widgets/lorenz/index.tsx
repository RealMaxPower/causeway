"use client";

import { useMemo, useState } from "react";
import styles from "./lorenz.module.css";
import { COUNTRIES, giniFromDeciles, lorenzPoints } from "./model";

const W = 320;
const H = 320;
const PAD = 40;

/**
 * Lorenz curve widget (G1 hero). Click a country preset and the curve,
 * Gini coefficient, decile bars, top/bottom shares, and median/mean
 * ratio all update. Pure state.
 */
export function Lorenz() {
  const [countryName, setCountryName] = useState<string>("US · 2023");
  const data = useMemo(
    () => COUNTRIES.find((c) => c.name === countryName) ?? COUNTRIES[0],
    [countryName],
  );

  const gini = useMemo(() => giniFromDeciles(data.deciles), [data]);
  const lor = useMemo(() => lorenzPoints(data.deciles), [data]);

  const xFor = (v: number) => PAD + v * (W - 2 * PAD);
  const yFor = (v: number) => H - PAD - v * (H - 2 * PAD);
  const lorPath = lor
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.x)} ${yFor(p.y)}`)
    .join(" ");
  const equalityPath = `M ${xFor(0)} ${yFor(0)} L ${xFor(1)} ${yFor(1)}`;
  const inequalityArea = `${equalityPath} ${lor
    .slice()
    .reverse()
    .map((p) => `L ${xFor(p.x)} ${yFor(p.y)}`)
    .join(" ")} Z`;

  const top10 = data.deciles[9];
  const bottom50 = data.deciles.slice(0, 5).reduce((s, v) => s + v, 0);

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          Lorenz curve · the shape of income distribution
        </div>
        <div className={styles.presets}>
          {COUNTRIES.map((c) => (
            <button
              key={c.name}
              type="button"
              className={`${styles.preset} ${
                countryName === c.name ? styles.presetActive : ""
              }`}
              onClick={() => setCountryName(c.name)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.col}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Lorenz curve">
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--ink-2)" />
            <line x1={PAD} y1={H - PAD} x2={PAD} y2={PAD} stroke="var(--ink-2)" />

            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <g key={v}>
                <line x1={xFor(v)} x2={xFor(v)} y1={H - PAD} y2={H - PAD + 4} stroke="var(--ink-3)" />
                <text
                  x={xFor(v)}
                  y={H - PAD + 16}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="var(--cw-mono)"
                  fill="var(--ink-3)"
                >
                  {Math.round(v * 100)}%
                </text>
                <line x1={PAD - 4} x2={PAD} y1={yFor(v)} y2={yFor(v)} stroke="var(--ink-3)" />
                <text
                  x={PAD - 7}
                  y={yFor(v) + 3}
                  textAnchor="end"
                  fontSize="9"
                  fontFamily="var(--cw-mono)"
                  fill="var(--ink-3)"
                >
                  {Math.round(v * 100)}%
                </text>
              </g>
            ))}

            {/* Inequality area between equality line and Lorenz curve */}
            <path d={inequalityArea} fill="var(--gold-soft)" opacity="0.5" />

            {/* Equality line */}
            <path d={equalityPath} stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="3 3" fill="none" />

            {/* Lorenz curve */}
            <path d={lorPath} stroke="var(--gold-deep)" strokeWidth="2.5" fill="none" />

            <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10.5" fontFamily="var(--cw-mono)" fill="var(--ink-2)">
              Cumulative % of population →
            </text>
            <text x="14" y={H / 2} textAnchor="middle" fontSize="10.5" fontFamily="var(--cw-mono)" fill="var(--ink-2)" transform={`rotate(-90 14 ${H / 2})`}>
              Cumulative % of income →
            </text>
            <text x={xFor(0.5) + 12} y={yFor(0.5) - 6} fontSize="10" fontFamily="var(--cw-serif)" fontStyle="italic" fill="var(--ink-3)">
              perfect equality
            </text>
            <text x={xFor(0.78)} y={yFor(0.35)} fontSize="10" fontFamily="var(--cw-mono)" fill="var(--gold-deep)">
              Lorenz
            </text>
          </svg>
          <div className={styles.caption}>
            The gold area between the lines, divided by the triangle, is
            the Gini coefficient.
          </div>
        </div>

        <div className={styles.col}>
          <div className={styles.barsLabel}>Decile shares (% of total income)</div>
          <svg viewBox="0 0 320 240" role="img" aria-label="Decile bar chart">
            {data.deciles.map((v, i) => {
              const maxV = Math.max(...data.deciles);
              const h = (v / maxV) * 200;
              const x = 10 + i * 30;
              const isTop = i === 9;
              const isBottom = i < 5;
              const fill = isTop
                ? "var(--cw-red)"
                : isBottom
                  ? "var(--cw-blue)"
                  : "oklch(0.55 0.13 235)";
              return (
                <g key={i}>
                  <rect x={x} y={220 - h} width={24} height={h} fill={fill} opacity="0.7" />
                  <text x={x + 12} y={220 - h - 4} textAnchor="middle" fontSize="9" fontFamily="var(--cw-mono)" fill="var(--ink-2)">
                    {v.toFixed(1)}
                  </text>
                  <text x={x + 12} y={234} textAnchor="middle" fontSize="9" fontFamily="var(--cw-mono)" fill="var(--ink-3)">
                    D{i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className={styles.barsNote}>
            <strong>D1</strong> = bottom 10%, <strong>D10</strong> = top 10%.
            Perfect equality would mean every bar at 10%. The top decile here
            gets <span className={styles.barsNoteAccent}>{top10.toFixed(1)}%</span>;
            the bottom half gets{" "}
            <span className={styles.barsNoteAccent}>{bottom50.toFixed(1)}%</span>.
          </div>
        </div>

        <div className={`${styles.col} ${styles.summary} col-summary`}>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>Gini coefficient</div>
            <div className={`${styles.metricValue} ${styles.metricValueGini}`}>
              {gini.toFixed(3)}
            </div>
            <div className={styles.metricSub}>
              0 = perfect equality. 1 = one person has it all.
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>Top 1% share</div>
            <div className={`${styles.metricValue} ${styles.metricValueTop1}`}>
              {data.top1}%
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>Top 10% share</div>
            <div className={`${styles.metricValue} ${styles.metricValueTop10}`}>
              {top10.toFixed(1)}%
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>Bottom 50% share</div>
            <div className={`${styles.metricValue} ${styles.metricValueBottom}`}>
              {bottom50.toFixed(1)}%
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricEyebrow}>Median / mean ratio</div>
            <div className={`${styles.metricValue} ${styles.metricValueRatio}`}>
              {data.median.toFixed(2)}
            </div>
            <div className={styles.metricSub}>
              1.0 = symmetric. Lower = right-skewed (rich tail pulls mean up).
            </div>
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        Inequality is a shape. <em>Read the curve, not just the coefficient.</em>
      </div>
    </div>
  );
}
