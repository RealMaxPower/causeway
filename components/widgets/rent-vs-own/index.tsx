"use client";

import { useState, useMemo, useId } from "react";
import styles from "./rent-vs-own.module.css";
import {
  PRESETS,
  formatMoney,
  simulateH3,
  type ScenarioInputs,
} from "./model";

const W = 520;
const H = 280;
const PAD = 50;

interface SliderProps {
  label: string;
  v: number;
  setV: (n: number) => void;
  min: number;
  max: number;
  step: number;
  fmt: (n: number) => string;
  tone?: "gold" | "own" | "mkt" | "rent";
}

function Slider({ label, v, setV, min, max, step, fmt, tone = "gold" }: SliderProps) {
  const valueClass =
    tone === "own"
      ? styles.sliderValueOwn
      : tone === "mkt"
        ? styles.sliderValueMkt
        : tone === "rent"
          ? styles.sliderValueRent
          : styles.sliderValue;
  const rangeClass =
    tone === "own"
      ? styles.rangeOwn
      : tone === "mkt"
        ? styles.rangeMkt
        : tone === "rent"
          ? styles.rangeRent
          : styles.range;
  const id = useId();
  return (
    <div className={styles.sliderGroup}>
      <div className={styles.sliderHead}>
        <label htmlFor={id} className={styles.sliderLabel}>
          {label}
        </label>
        <span className={valueClass}>{fmt(v)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => setV(parseFloat(e.target.value))}
        className={rangeClass}
      />
    </div>
  );
}

/**
 * Rent-vs-own — the H3 hero widget. 9 inputs, 5 historical presets, line
 * chart of cumulative net wealth for owner vs renter over the holding
 * period. Plus the headline mortgage-embedded-value readout that makes the
 * "your fixed-rate loan is itself an asset" insight visible.
 *
 * Pure state. The simulation is a pure function in model.ts.
 */
export function RentVsOwn() {
  const p0 = PRESETS[0];
  const [presetName, setPresetName] = useState<string>(p0.name);
  const [inputs, setInputs] = useState<ScenarioInputs>({
    price: p0.price,
    dp: p0.dp,
    mortRate: p0.mortRate,
    mktRate: p0.mktRate,
    rent: p0.rent,
    hpiGrow: p0.hpiGrow,
    rentGrow: p0.rentGrow,
    mktRet: p0.mktRet,
    years: p0.years,
  });

  function applyPreset(name: string) {
    const p = PRESETS.find((x) => x.name === name);
    if (!p) return;
    setPresetName(name);
    setInputs({
      price: p.price,
      dp: p.dp,
      mortRate: p.mortRate,
      mktRate: p.mktRate,
      rent: p.rent,
      hpiGrow: p.hpiGrow,
      rentGrow: p.rentGrow,
      mktRet: p.mktRet,
      years: p.years,
    });
  }

  function update<K extends keyof ScenarioInputs>(key: K, value: number) {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setPresetName(""); // dirty: no preset active any more
  }

  const sim = useMemo(() => simulateH3(inputs), [inputs]);
  const final = sim.path[sim.path.length - 1];
  const ownWins = final.ownNet - final.rentNet;

  const maxVal = Math.max(...sim.path.flatMap((p) => [p.ownNet, p.rentNet]), 100000);
  const minVal = Math.min(...sim.path.flatMap((p) => [p.ownNet, p.rentNet]), 0);
  const xFor = (yr: number) =>
    PAD + ((yr - 1) / Math.max(1, inputs.years - 1)) * (W - 2 * PAD);
  const yFor = (v: number) =>
    H - PAD - ((v - minVal) / (maxVal - minVal)) * (H - 2 * PAD);
  const ownPath = sim.path
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${xFor(pt.y)} ${yFor(pt.ownNet)}`)
    .join(" ");
  const rentPath = sim.path
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${xFor(pt.y)} ${yFor(pt.rentNet)}`)
    .join(" ");

  const activeNote = presetName
    ? PRESETS.find((p) => p.name === presetName)?.note ?? ""
    : "Custom scenario — adjust inputs to see how each lever changes the outcome.";

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          Rent vs Own · cumulative net wealth, year by year
        </div>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className={`${styles.preset} ${
                presetName === p.name ? styles.presetActive : ""
              }`}
              onClick={() => applyPreset(p.name)}
              title={p.note}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.chartCol}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rent vs own net wealth chart">
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--ink-2)" />
            <line x1={PAD} y1={H - PAD} x2={PAD} y2={PAD} stroke="var(--ink-2)" />

            {[0, 0.5, 1].map((t) => {
              const v = minVal + t * (maxVal - minVal);
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
                  <text
                    x={PAD - 6}
                    y={yFor(v) + 3}
                    textAnchor="end"
                    fontSize="9.5"
                    fontFamily="var(--cw-mono)"
                    fill="var(--ink-3)"
                  >
                    {formatMoney(v)}
                  </text>
                </g>
              );
            })}

            {[1, Math.ceil(inputs.years / 2), inputs.years].map((yr) => (
              <g key={yr}>
                <line
                  x1={xFor(yr)}
                  x2={xFor(yr)}
                  y1={H - PAD}
                  y2={H - PAD + 4}
                  stroke="var(--ink-3)"
                />
                <text
                  x={xFor(yr)}
                  y={H - PAD + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="var(--cw-mono)"
                  fill="var(--ink-3)"
                >
                  y{yr}
                </text>
              </g>
            ))}

            <path d={ownPath} stroke="var(--cw-green)" strokeWidth="2.5" fill="none" />
            <path d={rentPath} stroke="var(--cw-red)" strokeWidth="2.5" fill="none" />

            <circle cx={xFor(inputs.years)} cy={yFor(final.ownNet)} r="3.5" fill="var(--cw-green)" />
            <circle cx={xFor(inputs.years)} cy={yFor(final.rentNet)} r="3.5" fill="var(--cw-red)" />

            <text
              x={xFor(inputs.years) - 6}
              y={yFor(final.ownNet) - 6}
              textAnchor="end"
              fontSize="11"
              fontFamily="var(--cw-mono)"
              fontWeight="500"
              fill="var(--cw-green)"
            >
              Own · {formatMoney(final.ownNet)}
            </text>
            <text
              x={xFor(inputs.years) - 6}
              y={yFor(final.rentNet) + 14}
              textAnchor="end"
              fontSize="11"
              fontFamily="var(--cw-mono)"
              fontWeight="500"
              fill="var(--cw-red)"
            >
              Rent · {formatMoney(final.rentNet)}
            </text>

            <text
              x={W / 2}
              y={H - 4}
              textAnchor="middle"
              fontSize="10.5"
              fontFamily="var(--cw-mono)"
              fill="var(--ink-2)"
            >
              Years held
            </text>
            <text
              x="16"
              y={H / 2}
              textAnchor="middle"
              fontSize="10.5"
              fontFamily="var(--cw-mono)"
              fill="var(--ink-2)"
              transform={`rotate(-90 16 ${H / 2})`}
            >
              Net wealth from this housing decision
            </text>
          </svg>

          <div className={styles.legend}>
            <div className={styles.legendCell}>
              <div className={styles.legendLabelOwn}>Own</div>
              <div className={styles.legendText}>
                Home equity {formatMoney(final.homeVal - final.loanBal)} + invested
                surplus {formatMoney(final.ownInvest)} − 6% sell cost.
              </div>
            </div>
            <div className={styles.legendCell}>
              <div className={styles.legendLabelRent}>Rent</div>
              <div className={styles.legendText}>
                Down-payment invested + monthly cash-flow surplus invested at{" "}
                {inputs.mktRet.toFixed(1)}%.
              </div>
            </div>
          </div>

          <div
            className={`${styles.verdict} ${
              ownWins > 0 ? styles.verdictOwnWins : styles.verdictRentWins
            }`}
          >
            <strong>
              After {inputs.years} years,{" "}
              {ownWins > 0 ? "owning wins" : "renting wins"} by{" "}
              <span className={styles.verdictAmt}>{formatMoney(Math.abs(ownWins))}</span>.
            </strong>{" "}
            {sim.mortgageEmbeddedValue > 5000 && (
              <span>
                Embedded mortgage value:{" "}
                <span className={styles.verdictAmt}>
                  +{formatMoney(sim.mortgageEmbeddedValue)}
                </span>{" "}
                (your mortgage is itself a cheap loan worth that much).
              </span>
            )}
            {sim.mortgageEmbeddedValue < -5000 && (
              <span>
                Embedded mortgage value:{" "}
                <span className={styles.verdictAmt}>
                  {formatMoney(sim.mortgageEmbeddedValue)}
                </span>{" "}
                (your mortgage is more expensive than the current market —
                refinance window when rates fall).
              </span>
            )}
            {Math.abs(sim.mortgageEmbeddedValue) <= 5000 && (
              <span>Mortgage is roughly at-market — no embedded value either way.</span>
            )}
          </div>
        </div>

        <div className={styles.controls}>
          <Slider
            label="Home price ($000s)"
            v={inputs.price}
            setV={(n) => update("price", n)}
            min={150}
            max={1500}
            step={25}
            fmt={(v) => `$${v}k`}
          />
          <Slider
            label="Down payment %"
            v={inputs.dp}
            setV={(n) => update("dp", n)}
            min={0}
            max={50}
            step={5}
            fmt={(v) => `${v}%`}
          />
          <Slider
            label="Mortgage rate locked"
            v={inputs.mortRate}
            setV={(n) => update("mortRate", n)}
            min={2}
            max={10}
            step={0.25}
            fmt={(v) => `${v.toFixed(2)}%`}
            tone="own"
          />
          <Slider
            label="Current market rate"
            v={inputs.mktRate}
            setV={(n) => update("mktRate", n)}
            min={2}
            max={10}
            step={0.25}
            fmt={(v) => `${v.toFixed(2)}%`}
            tone="mkt"
          />
          <Slider
            label="Equivalent rent / month"
            v={inputs.rent}
            setV={(n) => update("rent", n)}
            min={1000}
            max={6000}
            step={100}
            fmt={(v) => `$${v}`}
            tone="rent"
          />
          <Slider
            label="Home appreciation / yr"
            v={inputs.hpiGrow}
            setV={(n) => update("hpiGrow", n)}
            min={-2}
            max={8}
            step={0.25}
            fmt={(v) => `${v.toFixed(1)}%`}
          />
          <Slider
            label="Rent growth / yr"
            v={inputs.rentGrow}
            setV={(n) => update("rentGrow", n)}
            min={0}
            max={8}
            step={0.25}
            fmt={(v) => `${v.toFixed(1)}%`}
          />
          <Slider
            label="Market return / yr"
            v={inputs.mktRet}
            setV={(n) => update("mktRet", n)}
            min={3}
            max={12}
            step={0.25}
            fmt={(v) => `${v.toFixed(1)}%`}
          />
          <Slider
            label="Years held"
            v={inputs.years}
            setV={(n) => update("years", n)}
            min={2}
            max={30}
            step={1}
            fmt={(v) => `${v}y`}
          />
        </div>
      </div>

      <div className={styles.foot}>{activeNote}</div>
    </div>
  );
}
