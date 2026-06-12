"use client";

import { useId, useMemo, useState } from "react";
import styles from "./purchase-calc.module.css";
import {
  DEFAULT_INPUTS,
  PRESETS,
  compute,
  formatMoney,
  leverLabel,
  type Inputs,
} from "./model";

/**
 * Big-purchase calculator (H5 hero).
 *
 * Decompose a sticker price into the all-in cost (negotiated price +
 * interest over the loan term). Surfaces which lever moves the cost most:
 * list-price discount, manufacturer/dealer incentive, or APR. Mirrors the
 * pedagogy of H5 — list price is the slow signal; the others are the
 * live one.
 */
export function PurchaseCalc() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [presetId, setPresetId] = useState<string>("balanced");

  const listId = useId();
  const discId = useId();
  const incId = useId();
  const aprId = useId();
  const termId = useId();
  const downId = useId();

  const result = useMemo(() => compute(inputs), [inputs]);
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

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          Big-purchase calculator · the invisible price layer
        </span>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`${styles.preset} ${
                presetId === p.id ? styles.presetActive : ""
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {activePreset && <div className={styles.blurb}>{activePreset.blurb}</div>}

      <div className={styles.body}>
        <div className={styles.inputs}>
          <div className={styles.field}>
            <label htmlFor={listId} className={styles.fieldLabel}>
              List price (MSRP)
            </label>
            <div className={styles.fieldRow}>
              <input
                id={listId}
                type="number"
                min={100}
                max={1_000_000}
                step={500}
                value={inputs.listPrice}
                onChange={(e) =>
                  update("listPrice", Math.max(0, parseFloat(e.target.value) || 0))
                }
                className={styles.input}
              />
              <span className={styles.unit}>USD</span>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={discId} className={styles.fieldLabel}>
                Discount off list
              </label>
              <span className={styles.sliderValue}>
                {inputs.discountPct.toFixed(0)}%
              </span>
            </div>
            <input
              id={discId}
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={inputs.discountPct}
              onChange={(e) => update("discountPct", parseFloat(e.target.value))}
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={incId} className={styles.fieldLabel}>
              Dealer / manufacturer incentive
            </label>
            <div className={styles.fieldRow}>
              <input
                id={incId}
                type="number"
                min={0}
                max={20_000}
                step={100}
                value={inputs.incentive}
                onChange={(e) =>
                  update("incentive", Math.max(0, parseFloat(e.target.value) || 0))
                }
                className={styles.input}
              />
              <span className={styles.unit}>USD</span>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={aprId} className={styles.fieldLabel}>
                APR (loan rate)
              </label>
              <span className={styles.sliderValue}>
                {inputs.apr.toFixed(1)}%
              </span>
            </div>
            <input
              id={aprId}
              type="range"
              min={0}
              max={15}
              step={0.1}
              value={inputs.apr}
              onChange={(e) => update("apr", parseFloat(e.target.value))}
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={termId} className={styles.fieldLabel}>
                Loan term
              </label>
              <span className={styles.sliderValue}>
                {inputs.termMonths} mo
              </span>
            </div>
            <input
              id={termId}
              type="range"
              min={0}
              max={84}
              step={6}
              value={inputs.termMonths}
              onChange={(e) =>
                update("termMonths", parseInt(e.target.value))
              }
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={downId} className={styles.fieldLabel}>
              Down payment
            </label>
            <div className={styles.fieldRow}>
              <input
                id={downId}
                type="number"
                min={0}
                max={1_000_000}
                step={500}
                value={inputs.downPayment}
                onChange={(e) =>
                  update("downPayment", Math.max(0, parseFloat(e.target.value) || 0))
                }
                className={styles.input}
              />
              <span className={styles.unit}>USD</span>
            </div>
          </div>
        </div>

        <div className={styles.results}>
          <div>
            <div className={styles.eyebrow}>All-in cost (negotiated + interest)</div>
            <div className={styles.bigValue}>
              {formatMoney(result.allInCost)}
            </div>
            <div className={styles.subValue}>
              {result.vsListPct >= 0 ? "−" : "+"}
              {Math.abs(result.vsListPct).toFixed(1)}% vs list
            </div>
          </div>

          <div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Negotiated price</span>
              <span className={styles.rowValue}>
                {formatMoney(result.negotiatedPrice)}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Total discount applied</span>
              <span className={styles.rowValue}>
                −{formatMoney(result.totalDiscount)}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Amount financed</span>
              <span className={styles.rowValue}>
                {formatMoney(result.amountFinanced)}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Monthly payment</span>
              <span className={styles.rowValue}>
                {result.monthlyPayment > 0
                  ? formatMoney(result.monthlyPayment)
                  : "—"}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Total interest over term</span>
              <span className={`${styles.rowValue} ${styles.rowValueRed}`}>
                {result.totalInterest > 0
                  ? formatMoney(result.totalInterest)
                  : "$0"}
              </span>
            </div>
          </div>

          <div className={styles.sensitivity}>
            <div className={styles.sensitivityHead}>
              Each lever saves you (per unit of effort):
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>−1pp APR</span>
              <span className={styles.rowValue}>
                {formatMoney(Math.abs(result.sensitivity.perPctAprDrop))}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>+$1,000 incentive</span>
              <span className={styles.rowValue}>
                {formatMoney(result.sensitivity.perThousandIncentive)}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>+1pp list-price discount</span>
              <span className={styles.rowValue}>
                {formatMoney(result.sensitivity.perPctListDrop)}
              </span>
            </div>
            <div className={styles.leverTag}>{leverLabel(result.biggestLever)}</div>
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What to do ▸</span>
        <span>
          The sticker price is the slow signal; the other three move fast and
          carry most of the cost. Negotiate the second pair, not the first.
        </span>
      </div>
    </div>
  );
}
