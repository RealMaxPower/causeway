"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import styles from "./bank-sandbox.module.css";
import { bankReducer, initState, getAccountMeta } from "./reducer";
import type { EventSegment } from "./types";

const BORROWERS = ["Alice", "Bao", "Carla", "Dev", "Esra"] as const;

function formatMoney(n: number): string {
  const abs = Math.abs(n);
  return (n < 0 ? "−" : "") + "$" + abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/**
 * Bank-sandbox widget. The hero widget for A3 — a live double-entry balance
 * sheet the user can drive. Issue a loan and watch the asset (loan) and
 * liability (deposit) appear simultaneously. Repay, default, or trigger a
 * cash withdrawal to see the constraints money creation runs into.
 */
export function BankSandbox() {
  const [state, dispatch] = useReducer(bankReducer, undefined, initState);
  const [loanAmt, setLoanAmt] = useState(500);
  const [borrowerIdx, setBorrowerIdx] = useState(0);
  const borrower = BORROWERS[borrowerIdx];

  // Derived rows for assets / liabilities
  const { assets, liabilities, totalAssets, totalLiab } = useMemo(() => {
    const rows = Object.entries(state.balances)
      .map(([key, amt]) => {
        const meta = getAccountMeta(key);
        return meta ? { key, ...meta, amt } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.amt !== 0)
      .sort((a, b) => b.amt - a.amt);
    const assets = rows.filter((r) => r.side === "asset" && r.amt > 0);
    const liabilities = rows.filter((r) => r.side === "liability");
    return {
      assets,
      liabilities,
      totalAssets: assets.reduce((s, r) => s + r.amt, 0),
      totalLiab: liabilities.reduce((s, r) => s + r.amt, 0),
    };
  }, [state.balances]);

  // Top-line metrics for the propagation strip
  const totalDeposits = liabilities
    .filter((r) => r.kind === "deposit")
    .reduce((s, r) => s + r.amt, 0);
  const reserves = state.balances.reserve || 0;
  const equity = state.balances.equity || 0;
  const reserveRatio = totalDeposits ? (reserves / totalDeposits) * 100 : 0;

  // Track deltas across reducer updates
  const prev = useRef({ totalDeposits, reserves, reserveRatio, equity });
  const [delta, setDelta] = useState({
    totalDeposits: 0,
    reserves: 0,
    reserveRatio: 0,
    equity: 0,
  });
  useEffect(() => {
    setDelta({
      totalDeposits: totalDeposits - prev.current.totalDeposits,
      reserves: reserves - prev.current.reserves,
      reserveRatio: reserveRatio - prev.current.reserveRatio,
      equity: equity - prev.current.equity,
    });
    prev.current = { totalDeposits, reserves, reserveRatio, equity };
  }, [totalDeposits, reserves, reserveRatio, equity]);

  const renderRow = (r: {
    key: string;
    kind: string;
    label: string;
    amt: number;
  }) => {
    const pulse = state.pulse[r.key];
    return (
      <div
        key={r.key}
        className={`${styles.row} ${pulse === "new" ? styles.rowNew : ""} ${
          pulse === "shrink" ? styles.rowShrink : ""
        }`}
      >
        <div className={styles.rowName}>
          <span className={styles.pip} data-kind={r.kind} aria-hidden />
          <span>{r.label}</span>
        </div>
        <div className={styles.amt}>{formatMoney(r.amt)}</div>
      </div>
    );
  };

  return (
    <div className={styles.sandbox}>
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <span className={styles.led} aria-hidden />
          <span>Bank Balance Sheet · Sandbox</span>
        </div>
        <div className={styles.headRight}>
          live · double-entry · session #{state.loanCounter + 1}
        </div>
      </div>

      <div className={styles.body}>
        {/* Assets */}
        <div className={styles.ledger}>
          <div className={styles.ledgerHead}>
            <h4>
              Assets <span className={styles.eyebrow}>what the bank owns / is owed</span>
            </h4>
            <div className={styles.total}>{formatMoney(totalAssets)}</div>
          </div>
          {assets.map(renderRow)}
        </div>

        {/* Liabilities + equity */}
        <div className={styles.ledger}>
          <div className={styles.ledgerHead}>
            <h4>
              Liabilities + Equity{" "}
              <span className={styles.eyebrow}>what the bank owes</span>
            </h4>
            <div className={styles.total}>{formatMoney(totalLiab)}</div>
          </div>
          {liabilities.map(renderRow)}
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.controlsTitle}>Drive the bank</div>

          <div className={styles.group}>
            <label className={styles.groupLabel}>
              <span>Borrower</span>
              <span className={styles.groupLabelValue}>{borrower}</span>
            </label>
            <div className={styles.borrowerRow}>
              {BORROWERS.map((b, i) => (
                <button
                  key={b}
                  type="button"
                  className={`${styles.btn} ${styles.borrowerBtn} ${
                    i === borrowerIdx ? styles.borrowerBtnActive : ""
                  }`}
                  onClick={() => setBorrowerIdx(i)}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.group}>
            <label className={styles.groupLabel} htmlFor="bank-sandbox-amt">
              <span>Amount</span>
              <span className={styles.groupLabelValue}>${loanAmt}</span>
            </label>
            <input
              id="bank-sandbox-amt"
              type="range"
              className={styles.range}
              min={50}
              max={1500}
              step={50}
              value={loanAmt}
              onChange={(e) => setLoanAmt(parseInt(e.target.value, 10))}
            />
          </div>

          <button
            type="button"
            className={`${styles.btn} ${styles.btnGold}`}
            onClick={() => dispatch({ type: "ISSUE_LOAN", borrower, amount: loanAmt })}
          >
            Issue loan → {borrower}
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={() => dispatch({ type: "REPAY", borrower, amount: loanAmt })}
          >
            {borrower} repays ${loanAmt}
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={() => dispatch({ type: "WITHDRAW", borrower, amount: loanAmt })}
          >
            {borrower} withdraws cash
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={() => dispatch({ type: "DEFAULT", borrower })}
          >
            {borrower} defaults
          </button>

          <div className={styles.resetWrap}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => dispatch({ type: "RESET" })}
            >
              ↺ Reset to initial state
            </button>
          </div>
        </div>
      </div>

      {/* Propagation strip */}
      <div className={styles.prop}>
        <PropCell
          label="Bank money (deposits)"
          value={formatMoney(totalDeposits)}
          delta={delta.totalDeposits}
          unit="$"
        />
        <PropCell
          label="Reserves"
          value={formatMoney(reserves)}
          delta={delta.reserves}
          unit="$"
        />
        <PropCell
          label="Reserve ratio"
          value={reserveRatio.toFixed(1) + "%"}
          delta={delta.reserveRatio}
          unit="pp"
          precision={1}
          invert
        />
        <PropCell
          label="Bank equity"
          value={formatMoney(equity)}
          delta={delta.equity}
          unit="$"
        />
      </div>

      {/* Event log */}
      <div
        className={styles.log}
        role="log"
        aria-live="polite"
        aria-label="Bank balance sheet event log"
      >
        {state.events.map((e, i) => (
          <div key={i} className={styles.logEntry}>
            <div className={styles.logTime}>{e.t}</div>
            <div className={styles.logMsg}>
              {e.segments.map((seg, j) => (
                <EventSpan key={j} segment={seg} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PropCellProps {
  label: string;
  value: string;
  delta: number;
  unit: "$" | "pp";
  precision?: number;
  /** If true, a positive delta is rendered as "down" (e.g. reserve ratio going up means more buffer). */
  invert?: boolean;
}

function PropCell({ label, value, delta, unit, precision = 0, invert }: PropCellProps) {
  const positive = invert ? delta < 0 : delta > 0;
  const negative = invert ? delta > 0 : delta < 0;
  const showDelta = Math.abs(delta) > 0.001;
  const arrow = delta > 0 ? "▲" : "▼";
  const cls = positive ? styles.cellDeltaUp : negative ? styles.cellDeltaDown : "";
  return (
    <div className={styles.cell}>
      <div className={styles.cellLabel}>{label}</div>
      <div className={styles.cellValue}>{value}</div>
      <div className={`${styles.cellDelta} ${cls}`}>
        {showDelta
          ? `${arrow} ${Math.abs(delta).toFixed(precision)}${unit === "$" ? "" : unit}`
          : "—"}
      </div>
    </div>
  );
}

function EventSpan({ segment }: { segment: EventSegment }) {
  switch (segment.kind) {
    case "borrower":
      return <span className={styles.segBorrower}>{segment.text}</span>;
    case "money-up":
      return <span className={styles.segMoneyUp}>{segment.text}</span>;
    case "money-down":
      return <span className={styles.segMoneyDown}>{segment.text}</span>;
    default:
      return <>{segment.text}</>;
  }
}
