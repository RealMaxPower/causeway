"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import styles from "./cb-ledger.module.css";
import { cbReducer, initState } from "./reducer";
import type { CBState, EventSegment } from "./types";

function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 }) + "B";
}

interface RowDef {
  id: string;
  label: string;
  amt: number;
}

interface LRowProps {
  row: RowDef;
  pulse: Record<string, "new" | "shrink">;
  tone: "gold" | "blue";
  align: "left" | "right";
}

function LRow({ row, pulse, tone, align }: LRowProps) {
  const p = pulse[row.id];
  const baseClass =
    align === "left"
      ? `${styles.row} ${styles.rowLeft} ${tone === "gold" ? styles.rowLeftGold : styles.rowLeftBlue}`
      : `${styles.row} ${styles.rowRight} ${tone === "gold" ? styles.rowRightGold : styles.rowRightBlue}`;
  const pulseClass =
    p === "new" ? styles.rowNew : p === "shrink" ? styles.rowShrink : "";
  const rowKey = `${row.id}-${p ?? "idle"}`;
  return (
    <div key={rowKey} className={`${baseClass} ${pulseClass}`}>
      {align === "left" ? (
        <>
          <span className={styles.rowAmt}>{fmt(row.amt)}</span>
          <span>{row.label}</span>
        </>
      ) : (
        <>
          <span>{row.label}</span>
          <span className={`${styles.rowAmt} ${styles.rowAmtRight}`}>{fmt(row.amt)}</span>
        </>
      )}
    </div>
  );
}

interface LedgerBlockProps {
  title: string;
  tone: "gold" | "blue";
  assets: RowDef[];
  liab: RowDef[];
  pulse: CBState["pulse"];
}

function LedgerBlock({ title, tone, assets, liab, pulse }: LedgerBlockProps) {
  const totalA = assets.reduce((s, r) => s + r.amt, 0);
  const totalL = liab.reduce((s, r) => s + r.amt, 0);
  return (
    <div className={styles.block}>
      <div className={styles.blockHead}>
        <div
          className={`${styles.blockTitle} ${
            tone === "gold" ? styles.blockTitleGold : styles.blockTitleBlue
          }`}
        >
          {title}
        </div>
        <div className={styles.totals}>
          Σ assets
          <span className={styles.totalsValue}>{fmt(totalA)}</span>
          <span className={styles.totalsSep}>|</span>
          Σ liab+eq
          <span className={styles.totalsValue}>{fmt(totalL)}</span>
        </div>
      </div>
      <div className={styles.cols}>
        <div>
          <div className={styles.colHead}>Assets</div>
          <div className={styles.colRows}>
            {assets.map((r) => (
              <LRow key={r.id} row={r} pulse={pulse} tone={tone} align="left" />
            ))}
          </div>
        </div>
        <div>
          <div className={`${styles.colHead} ${styles.colHeadRight}`}>
            Liabilities & equity
          </div>
          <div className={styles.colRows}>
            {liab.map((r) => (
              <LRow key={r.id} row={r} pulse={pulse} tone={tone} align="right" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The A4 hero widget — two stacked balance sheets sharing one row.
 *
 * Bank reserves at the central bank are simultaneously:
 *   - a liability on the CB's books
 *   - an asset on the commercial bank's books
 *
 * Four actions: QE, QT, cash withdrawal, bank issues loan. The two counters
 * (base money, broad money) make the surprising asymmetry visible: QE moves
 * base money but not broad money; a bank loan moves broad money but not base.
 */
export function CBLedger() {
  const [state, dispatch] = useReducer(cbReducer, undefined, initState);

  const cbAssets: RowDef[] = [
    { id: "cb_treasuries", label: "US Treasuries", amt: state.cb.treasuries },
    { id: "cb_mbs", label: "Agency MBS", amt: state.cb.mbs },
    { id: "cb_gold", label: "Gold certificates", amt: state.cb.gold },
    { id: "cb_fx", label: "FX swaps", amt: state.cb.fxSwaps },
  ];
  const cbLiab: RowDef[] = [
    { id: "cb_currency", label: "Currency in circulation", amt: state.cb.currency },
    { id: "cb_bankReserves", label: "Bank reserves", amt: state.cb.bankReserves },
    { id: "cb_reverseRepo", label: "Reverse repo (ON RRP)", amt: state.cb.reverseRepo },
    { id: "cb_tga", label: "Treasury General Account", amt: state.cb.tga },
  ];
  const bankAssets: RowDef[] = [
    { id: "bank_reserves", label: "Reserves at CB", amt: state.bank.reserves },
    { id: "bank_securities", label: "Securities", amt: state.bank.securities },
    { id: "bank_loans", label: "Loans", amt: state.bank.loans },
  ];
  const bankLiab: RowDef[] = [
    { id: "bank_deposits", label: "Deposits", amt: state.bank.deposits },
    { id: "bank_wholesale", label: "Wholesale funding", amt: state.bank.wholesale },
    { id: "bank_equity", label: "Equity", amt: state.bank.equity },
  ];

  // Counters
  const baseMoney = state.cb.currency + state.cb.bankReserves;
  const broadMoney = state.cb.currency + state.bank.deposits;

  // Delta tracking
  const prev = useRef({ baseMoney, broadMoney });
  const [delta, setDelta] = useState({ base: 0, broad: 0 });
  useEffect(() => {
    setDelta({
      base: baseMoney - prev.current.baseMoney,
      broad: broadMoney - prev.current.broadMoney,
    });
    prev.current = { baseMoney, broadMoney };
  }, [baseMoney, broadMoney]);

  return (
    <div className={styles.ledger}>
      <div className={styles.strip}>
        <div className={styles.stripTitle}>
          Two-issuer ledger · live · session #{state.step + 1}
        </div>
        <div className={styles.stripHint}>$B · click any button below</div>
      </div>

      <LedgerBlock title="Central bank" tone="gold" assets={cbAssets} liab={cbLiab} pulse={state.pulse} />

      <div className={styles.linkage}>
        ↑ CB liability
        <span className={styles.linkageAccent}>
          = bank reserves ({fmt(state.cb.bankReserves)}) =
        </span>
        commercial-bank asset ↓
      </div>

      <LedgerBlock
        title="Commercial bank (aggregated)"
        tone="blue"
        assets={bankAssets}
        liab={bankLiab}
        pulse={state.pulse}
      />

      <div className={styles.actions}>
        <ActionBtn
          title="QE"
          hint="CB buys $100B Treasuries"
          onClick={() => dispatch({ type: "QE" })}
        />
        <ActionBtn
          title="QT"
          hint="CB sells $100B Treasuries"
          onClick={() => dispatch({ type: "QT" })}
        />
        <ActionBtn
          title="Cash withdrawal"
          hint="Customer takes $100B notes"
          onClick={() => dispatch({ type: "CASH" })}
        />
        <ActionBtn
          title="Bank issues loan"
          hint="$100B loan + matching deposit"
          onClick={() => dispatch({ type: "LOAN" })}
        />
      </div>

      <div className={styles.counters}>
        <Counter
          label="Base money"
          sub="Currency + bank reserves (CB-issued)"
          value={fmt(baseMoney)}
          delta={delta.base}
          tone="gold"
        />
        <Counter
          label="Broad money"
          sub="Currency in circulation + deposits"
          value={fmt(broadMoney)}
          delta={delta.broad}
          tone="blue"
        />
        <div className={styles.resetCell}>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => dispatch({ type: "RESET" })}
          >
            ↺ Reset
          </button>
        </div>
      </div>

      <div
        className={styles.log}
        role="log"
        aria-live="polite"
        aria-label="Central-bank ledger event log"
      >
        {state.events.map((e, i) => (
          <div key={i} className={styles.logEntry}>
            <div className={styles.logTime}>{e.t}</div>
            <div>
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

function EventSpan({ segment }: { segment: EventSegment }) {
  switch (segment.kind) {
    case "action":
      return <span className={styles.segAction}>{segment.text}</span>;
    case "money-up":
      return <span className={styles.segMoneyUp}>{segment.text}</span>;
    case "money-down":
      return <span className={styles.segMoneyDown}>{segment.text}</span>;
    case "neutral":
      return <em className={styles.segNeutral}>{segment.text}</em>;
    default:
      return <>{segment.text}</>;
  }
}

interface ActionBtnProps {
  title: string;
  hint: string;
  onClick: () => void;
}

function ActionBtn({ title, hint, onClick }: ActionBtnProps) {
  return (
    <button type="button" className={styles.action} onClick={onClick}>
      <div className={styles.actionTitle}>{title}</div>
      <div className={styles.actionHint}>{hint}</div>
    </button>
  );
}

interface CounterProps {
  label: string;
  sub: string;
  value: string;
  delta: number;
  tone: "gold" | "blue";
}

function Counter({ label, sub, value, delta, tone }: CounterProps) {
  const showDelta = Math.abs(delta) > 0.001;
  const up = delta > 0;
  return (
    <div className={styles.counter}>
      <div className={styles.counterLabel}>{label}</div>
      <div className={styles.counterValueRow}>
        <div
          className={`${styles.counterValue} ${
            tone === "gold" ? styles.counterValueGold : styles.counterValueBlue
          }`}
        >
          {value}
        </div>
        {showDelta ? (
          <div
            className={`${styles.counterDelta} ${
              up ? styles.counterDeltaUp : styles.counterDeltaDown
            }`}
          >
            {up ? "▲" : "▼"} {fmt(Math.abs(delta))}
          </div>
        ) : (
          <div className={`${styles.counterDelta} ${styles.counterDeltaNone}`}>
            —
          </div>
        )}
      </div>
      <div className={styles.counterSub}>{sub}</div>
    </div>
  );
}
