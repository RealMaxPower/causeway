"use client";

import { useId, useMemo, useState } from "react";
import styles from "./price-discovery.module.css";
import {
  DEFAULT_INPUTS,
  PRESETS,
  discover,
  formatPrice,
  type Inputs,
} from "./model";

const W = 520;
const H = 280;
const PAD = 48;

/**
 * Price as information (B2 hero).
 *
 * Set the market conditions — a demand shock, how well-informed the orders
 * are, and how many traders — and watch individual bids and asks aggregate
 * into one clearing price. The lesson: that number is a poll of distributed
 * private knowledge, sharp when the inputs are good and confidently wrong
 * when they aren't.
 */
export function PriceDiscovery() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [presetId, setPresetId] = useState<string>("deep");

  const result = useMemo(() => discover(inputs), [inputs]);
  const activePreset = PRESETS.find((p) => p.id === presetId);

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setInputs(p.inputs);
  }

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((p) => ({ ...p, [key]: value }));
    setPresetId(""); // dirty
  }

  const { book, cleanPrice, read } = result;
  const n = result.traders;

  // Chart scaling.
  const prices = [...book.demand, ...book.supply, cleanPrice];
  const yMin = Math.min(...prices) - 3;
  const yMax = Math.max(...prices) + 3;
  const xFor = (q: number) => PAD + (q / n) * (W - 2 * PAD);
  const yFor = (p: number) => H - PAD - ((p - yMin) / (yMax - yMin)) * (H - 2 * PAD);

  // Step-curve path: order i occupies x ∈ [i, i+1] at its price.
  const stairs = (arr: number[]) => {
    let d = `M ${xFor(0)} ${yFor(arr[0])}`;
    for (let i = 0; i < arr.length; i++) {
      d += ` L ${xFor(i + 1)} ${yFor(arr[i])}`;
      if (i + 1 < arr.length) d += ` L ${xFor(i + 1)} ${yFor(arr[i + 1])}`;
    }
    return d;
  };

  const toneClass = read.tone === "red" ? styles.red : read.tone === "gold" ? styles.gold : styles.green;
  const priceGap = Math.abs(book.clearingPrice - cleanPrice);

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          Price discovery · watch one number emerge from many private orders
          <span className={styles.tryPill}>Try the controls</span>
        </span>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`${styles.preset} ${presetId === p.id ? styles.presetActive : ""}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {activePreset && <div className={styles.blurb}>{activePreset.blurb}</div>}

      <div className={styles.body}>
        <div className={styles.chartCol}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Supply and demand order book with clearing price">
            {/* axes */}
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--ink-2)" />
            <line x1={PAD} y1={H - PAD} x2={PAD} y2={PAD} stroke="var(--ink-2)" />

            {/* price gridlines */}
            {[0, 0.5, 1].map((t) => {
              const v = yMin + t * (yMax - yMin);
              return (
                <g key={t}>
                  <line
                    x1={PAD}
                    x2={W - PAD}
                    y1={yFor(v)}
                    y2={yFor(v)}
                    stroke="var(--rule)"
                    strokeDasharray={t === 0 || t === 1 ? "0" : "2 3"}
                  />
                  <text x={PAD - 6} y={yFor(v) + 3} textAnchor="end" fontSize="9.5" fontFamily="var(--cw-mono)" fill="var(--ink-3)">
                    {formatPrice(v)}
                  </text>
                </g>
              );
            })}

            {/* clean (informed) price reference */}
            <line
              x1={PAD}
              x2={W - PAD}
              y1={yFor(cleanPrice)}
              y2={yFor(cleanPrice)}
              stroke="var(--ink-3)"
              strokeDasharray="4 3"
            />
            <text x={W - PAD} y={yFor(cleanPrice) - 4} textAnchor="end" fontSize="9.5" fontFamily="var(--cw-mono)" fill="var(--ink-3)">
              informed price {formatPrice(cleanPrice)}
            </text>

            {/* supply + demand staircases */}
            <path d={stairs(book.demand)} stroke="var(--cw-green)" strokeWidth="2.25" fill="none" />
            <path d={stairs(book.supply)} stroke="var(--cw-red)" strokeWidth="2.25" fill="none" />

            {/* clearing point */}
            {book.quantity > 0 && (
              <>
                <line
                  x1={xFor(book.quantity)}
                  x2={xFor(book.quantity)}
                  y1={H - PAD}
                  y2={yFor(book.clearingPrice)}
                  stroke="var(--gold-deep)"
                  strokeDasharray="3 3"
                />
                <circle cx={xFor(book.quantity)} cy={yFor(book.clearingPrice)} r="4.5" fill="var(--gold-deep)" />
                <text
                  x={xFor(book.quantity) + 7}
                  y={yFor(book.clearingPrice) + 3}
                  fontSize="11"
                  fontFamily="var(--cw-mono)"
                  fontWeight="500"
                  fill="var(--gold-deep)"
                >
                  {formatPrice(book.clearingPrice)}
                </text>
              </>
            )}

            {/* axis labels + curve labels */}
            <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fontFamily="var(--cw-mono)" fill="var(--ink-2)">
              Quantity (orders filled)
            </text>
            <text x="14" y={H / 2} textAnchor="middle" fontSize="10.5" fontFamily="var(--cw-mono)" fill="var(--ink-2)" transform={`rotate(-90 14 ${H / 2})`}>
              Price
            </text>
            <text x={PAD + 6} y={PAD + 2} fontSize="10" fontFamily="var(--cw-mono)" fill="var(--cw-green)">
              demand (bids)
            </text>
            <text x={W - PAD} y={H - PAD - 6} textAnchor="end" fontSize="10" fontFamily="var(--cw-mono)" fill="var(--cw-red)">
              supply (asks)
            </text>
          </svg>

          <div className={styles.readPanel}>
            <div className={styles.readHead}>
              <span className={styles.clearing}>
                {book.quantity > 0 ? formatPrice(book.clearingPrice) : "no trade"}
                {book.quantity > 0 && <span className={styles.qty}> · {book.quantity} of {n} orders fill</span>}
              </span>
              <span className={`${styles.readChip} ${toneClass}`}>{read.label}</span>
            </div>
            <div className={styles.readVerdict}>{read.verdict}</div>
            {priceGap >= 2 && (
              <div className={styles.gapNote}>
                That&apos;s {formatPrice(priceGap)} off where a fully-informed market would clear ({formatPrice(cleanPrice)}).
              </div>
            )}
            <div className={styles.emergence}>{result.emergence}</div>
          </div>
        </div>

        <div className={styles.controls}>
          <SliderField
            label="Demand shock"
            value={inputs.demandShift}
            min={-20}
            max={20}
            step={1}
            fmt={(v) => (v > 0 ? `+$${v}` : v < 0 ? `−$${-v}` : "none")}
            boundLeft="slump"
            boundRight="hype"
            onChange={(v) => update("demandShift", v)}
          />
          <SliderField
            label="Information quality"
            value={inputs.infoNoise}
            min={0}
            max={30}
            step={1}
            fmt={(v) => (v <= 5 ? "clean" : v <= 15 ? "noisy" : "guesswork")}
            boundLeft="informed"
            boundRight="rumour"
            onChange={(v) => update("infoNoise", v)}
          />
          <SliderField
            label="Market depth"
            value={inputs.traders}
            min={4}
            max={40}
            step={1}
            fmt={(v) => `${v} traders`}
            boundLeft="thin"
            boundRight="deep"
            onChange={(v) => update("traders", v)}
          />
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What this is ▸</span>
        <span>
          The clearing price is where the highest bids meet the lowest asks — a
          single number that aggregates every trader&apos;s private valuation.
          It&apos;s a poll, not an oracle: drag <em>information quality</em> down
          and watch a precise-looking price drift away from value, or thin the
          market and watch it lose all reliability.
        </span>
      </div>
    </div>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  boundLeft: string;
  boundRight: string;
  onChange: (v: number) => void;
}

function SliderField({ label, value, min, max, step, fmt, boundLeft, boundRight, onChange }: SliderFieldProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <div className={styles.sliderHead}>
        <label htmlFor={id} className={styles.fieldLabel}>
          {label}
        </label>
        <span className={styles.sliderValue}>{fmt(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={styles.range}
      />
      <div className={styles.sliderBounds}>
        <span>{boundLeft}</span>
        <span>{boundRight}</span>
      </div>
    </div>
  );
}
