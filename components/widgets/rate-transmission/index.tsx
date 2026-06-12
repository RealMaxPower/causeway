"use client";

import { useId, useState } from "react";
import { useRegime } from "@/components/providers/RegimeProvider";
import styles from "./rate-transmission.module.css";
import { CHANNELS, HORIZON, pathFor, readingAt, type Channel } from "./model";

/** Neutral fed-funds reference for deriving a regime-implied policy Δ (bp). */
const NEUTRAL_FED_FUNDS = 3.5;

const CUT_COLOR = "var(--cw-green)";
const HIKE_COLOR = "var(--cw-red)";
const FLAT_COLOR = "var(--ink-3)";

function colorFor(dv: number): string {
  if (dv > 0.001) return HIKE_COLOR;
  if (dv < -0.001) return CUT_COLOR;
  return FLAT_COLOR;
}

function clampDelta(bp: number): number {
  return Math.min(300, Math.max(-300, bp));
}

/**
 * Rate-transmission widget — the C5 hero. Move the policy-change slider
 * and watch eight downstream channels respond on their characteristic
 * lags. Treasuries move first; inflation moves last. The "long and
 * variable lags" of monetary policy made visible.
 */
export function RateTransmission() {
  const regime = useRegime();
  const regimeDelta = regime
    ? clampDelta(Math.round((regime.inputs.fedFunds - NEUTRAL_FED_FUNDS) * 100))
    : null;

  const [localDelta, setLocalDelta] = useState(-100); // bp · negative = cut
  const [t, setT] = useState(6);
  const [followRegime, setFollowRegime] = useState(false);
  const delta = regimeDelta ?? localDelta;
  const deltaPct = delta / 100;
  const isFollowing = regimeDelta !== null && followRegime;

  const deltaId = useId();
  const tId = useId();
  const followId = useId();

  const deltaBigClass =
    delta < 0
      ? `${styles.bigNum} ${styles.bigNumDeltaCut}`
      : delta > 0
        ? `${styles.bigNum} ${styles.bigNumDeltaHike}`
        : `${styles.bigNum} ${styles.bigNumDelta}`;

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        Rate transmission · move a policy change through the economy
      </div>

      <div className={styles.controls}>
        <div>
          <div className={styles.eyebrow}>Policy change Δ</div>
          <div className={deltaBigClass}>
            {delta > 0 ? "+" : ""}
            {delta} bp
          </div>
          <input
            id={deltaId}
            type="range"
            min={-300}
            max={300}
            step={25}
            value={delta}
            disabled={isFollowing}
            onChange={(e) => {
              const next = parseInt(e.target.value);
              if (regime) {
                // Reverse-derive a fed-funds value from the slider Δ so the
                // shared regime moves with the user's drag.
                regime.patch({ fedFunds: NEUTRAL_FED_FUNDS + next / 100 });
              } else {
                setLocalDelta(next);
              }
            }}
            className={styles.range}
          />
          <div className={styles.rangeLabels}>
            <span>−300 (deep cut)</span>
            <span>0</span>
            <span>+300 (deep hike)</span>
          </div>
          {regimeDelta !== null && (
            <label htmlFor={followId} className={styles.followToggle}>
              <input
                id={followId}
                type="checkbox"
                checked={followRegime}
                onChange={(e) => setFollowRegime(e.target.checked)}
              />
              <span>Follow regime (lock slider)</span>
            </label>
          )}
        </div>

        <div>
          <div className={styles.eyebrow}>Months since</div>
          <div className={`${styles.bigNum} ${styles.bigNumMonths}`}>
            {t}
            <span className={styles.bigNumMonthsSub}> / {HORIZON}</span>
          </div>
          <input
            id={tId}
            type="range"
            min={0}
            max={HORIZON}
            value={t}
            onChange={(e) => setT(parseInt(e.target.value))}
            className={styles.range}
          />
          <div className={styles.rangeLabels}>
            <span>day-of</span>
            <span>1y</span>
            <span>2y</span>
          </div>
        </div>

        <div className={styles.reading}>
          <div className={styles.eyebrow}>Reading right now</div>
          <div style={{ marginTop: 8 }}>{readingAt(delta, t)}</div>
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>Channel</span>
          <span>Peak lag</span>
          <span className={styles.colPath}>Path · 0 → 24mo</span>
          <span className={styles.colRight}>Now (t={t})</span>
          <span className={`${styles.colRight} ${styles.colDelta}`}>Δ vs base</span>
        </div>

        {CHANNELS.map((c) => (
          <ChannelRow key={c.id} c={c} deltaPct={deltaPct} t={t} />
        ))}
      </div>
    </div>
  );
}

interface ChannelRowProps {
  c: Channel;
  deltaPct: number;
  t: number;
}

function ChannelRow({ c, deltaPct, t }: ChannelRowProps) {
  const v = pathFor(c, deltaPct, t);
  const dv = v - c.base;
  const sign = dv > 0.001 ? "+" : "";
  const arrived = t >= c.lag * 0.5;
  const range = Math.max(Math.abs(c.elast * deltaPct), 0.5);
  const pathColor = colorFor(dv);
  const yFor = (yv: number) => 25 - ((yv - c.base) / range) * 18;
  const pathD = Array.from({ length: HORIZON + 1 }, (_, i) => {
    const yv = pathFor(c, deltaPct, i);
    return `${i === 0 ? "M" : "L"} ${i * 10} ${yFor(yv)}`;
  }).join(" ");

  return (
    <div className={styles.tableRow}>
      <div className={styles.channelName}>{c.label}</div>
      <div className={styles.lagCell}>{c.lag} mo</div>

      <svg
        viewBox={`0 0 ${HORIZON * 10} 50`}
        preserveAspectRatio="none"
        className={styles.colPath}
      >
        <line x1="0" y1="25" x2={HORIZON * 10} y2="25" stroke="var(--rule)" strokeWidth="0.5" />
        <line
          x1={c.lag * 10}
          y1="2"
          x2={c.lag * 10}
          y2="48"
          stroke="var(--ink-3)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
          opacity="0.5"
        />
        <path d={pathD} fill="none" stroke={pathColor} strokeWidth="1.5" />
        <circle cx={t * 10} cy={yFor(v)} r="3" fill={pathColor} />
      </svg>

      <div
        className={`${styles.valueCell} ${arrived ? styles.valueArrived : styles.valuePending}`}
      >
        {v.toFixed(c.fmt)}{c.unit}
      </div>
      <div
        className={`${styles.deltaCell} ${styles.colDelta} ${
          dv > 0.001
            ? styles.deltaUp
            : dv < -0.001
              ? styles.deltaDown
              : styles.deltaNone
        }`}
      >
        {Math.abs(dv) < 0.005 ? "—" : `${sign}${dv.toFixed(c.fmt)}${c.unit}`}
      </div>
    </div>
  );
}
