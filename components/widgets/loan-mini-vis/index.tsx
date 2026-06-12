"use client";

import { useEffect, useState } from "react";

/**
 * Animated mini-visual for A3 Layer 1. Loops through 4 phases showing
 * a bank issuing then repaying a loan — the asset bar and matching deposit
 * bar grow simultaneously, then shrink simultaneously. Reserves never move.
 * Pure SVG, no external deps.
 */
export function LoanMiniVis() {
  const [t, setT] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setT((x) => (x + 1) % 100), 60);
    return () => clearInterval(id);
  }, []);

  const phase: "idle" | "issue" | "hold" | "repay" =
    t < 20 ? "idle" : t < 35 ? "issue" : t < 60 ? "hold" : t < 75 ? "repay" : "idle";

  const loanH =
    phase === "idle"
      ? 0
      : phase === "issue"
        ? ((t - 20) / 15) * 60
        : phase === "hold"
          ? 60
          : phase === "repay"
            ? 60 - ((t - 60) / 15) * 60
            : 0;

  const caption =
    phase === "idle"
      ? "Bank at rest"
      : phase === "issue"
        ? "Bank issues a $500 loan…"
        : phase === "hold"
          ? "Money supply has grown by $500"
          : "Loan repaid · money supply contracts";

  return (
    <div
      style={{
        border: "1px solid var(--rule)",
        borderRadius: "var(--r-md)",
        padding: "18px",
        background: "var(--paper-2)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--cw-mono)",
          fontSize: "10.5px",
          letterSpacing: "0.14em",
          color: "var(--ink-3)",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        A loan creates a deposit · live
      </div>

      <svg viewBox="0 0 400 240" style={{ width: "100%", height: 240 }}>
        <line x1="20" y1="200" x2="380" y2="200" stroke="var(--rule-strong)" strokeWidth="1" />
        <text
          x="20"
          y="218"
          fontSize="10"
          fontFamily="var(--cw-mono)"
          fill="var(--ink-3)"
          letterSpacing="1.5"
        >
          ASSETS
        </text>
        <text
          x="380"
          y="218"
          fontSize="10"
          fontFamily="var(--cw-mono)"
          fill="var(--ink-3)"
          letterSpacing="1.5"
          textAnchor="end"
        >
          LIABILITIES
        </text>

        {/* Assets stack — left bar */}
        <rect
          x="60"
          y={200 - 80}
          width="60"
          height="80"
          fill="var(--paper-edge)"
          stroke="var(--ink-3)"
        />
        <text
          x="90"
          y={200 - 80 / 2 + 4}
          textAnchor="middle"
          fontSize="10"
          fontFamily="var(--cw-mono)"
          fill="var(--ink-2)"
        >
          RESERVES
        </text>
        <rect
          x="60"
          y={200 - 80 - loanH}
          width="60"
          height={loanH}
          fill="var(--gold)"
          stroke="var(--gold-deep)"
          style={{ transition: "all 80ms linear" }}
        />
        {loanH > 14 && (
          <text
            x="90"
            y={200 - 80 - loanH / 2 + 4}
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--cw-mono)"
            fill="var(--paper)"
          >
            LOAN
          </text>
        )}

        {/* Liabilities stack — right bar */}
        <rect
          x="280"
          y={200 - 100}
          width="60"
          height="100"
          fill="var(--cw-blue-soft)"
          stroke="var(--ink-3)"
        />
        <text
          x="310"
          y={200 - 100 / 2 + 4}
          textAnchor="middle"
          fontSize="10"
          fontFamily="var(--cw-mono)"
          fill="var(--ink-2)"
        >
          DEPOSITS
        </text>
        <rect
          x="280"
          y={200 - 100 - loanH}
          width="60"
          height={loanH}
          fill="var(--cw-blue)"
          stroke="var(--ink)"
          style={{ transition: "all 80ms linear" }}
        />
        {loanH > 14 && (
          <text
            x="310"
            y={200 - 100 - loanH / 2 + 4}
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--cw-mono)"
            fill="var(--paper)"
          >
            + NEW DEPOSIT
          </text>
        )}

        {/* Causal arrow when issuing */}
        {(phase === "issue" || phase === "hold") && (
          <g opacity={phase === "hold" ? 0.6 : 1}>
            <line
              x1="125"
              y1={200 - 80 - loanH / 2}
              x2="275"
              y2={200 - 100 - loanH / 2}
              stroke="var(--gold-deep)"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <polygon
              points={`275,${200 - 100 - loanH / 2} 268,${200 - 100 - loanH / 2 - 4} 268,${200 - 100 - loanH / 2 + 4}`}
              fill="var(--gold-deep)"
            />
            <text
              x="200"
              y={200 - 100 - loanH / 2 - 8}
              textAnchor="middle"
              fontSize="11"
              fontFamily="var(--cw-serif)"
              fill="var(--gold-deep)"
              fontStyle="italic"
            >
              simultaneously
            </text>
          </g>
        )}

        <text
          x="200"
          y="30"
          textAnchor="middle"
          fontSize="13"
          fontFamily="var(--cw-serif)"
          fill="var(--ink)"
        >
          {caption}
        </text>
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--cw-mono)",
          fontSize: "10.5px",
          color: "var(--ink-3)",
          letterSpacing: "0.06em",
        }}
      >
        <span>Loop · {Math.round(t)}%</span>
        <span>No reserves leave the building.</span>
      </div>
    </div>
  );
}
