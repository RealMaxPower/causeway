"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadState, visitedCount } from "@/lib/progress";
import { findNode, TOTAL_NODES } from "@/lib/tracks";

/**
 * Home-page "Continue" card. Hydrates progress on mount; renders nothing
 * for first-time visitors. Suggests the most recently visited node and
 * shows N-of-43 progress.
 */
export function ContinueCard() {
  const [last, setLast] = useState<{ id: string; title: string; layer: 1 | 2 | 3 } | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const s = loadState();
    // Hydrate from localStorage after first paint to avoid SSR/client mismatch.
    /* eslint-disable react-hooks/set-state-in-effect */
    setCount(visitedCount(s));
    if (s.lastNodeId) {
      const found = findNode(s.lastNodeId);
      const layer = s.nodes[s.lastNodeId]?.layer ?? 1;
      if (found) {
        setLast({ id: found.node.id, title: found.node.title, layer });
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (!last) return null;

  const nextLayer = last.layer < 3 ? last.layer + 1 : 3;
  const href = `/nodes/${last.id}${nextLayer === last.layer ? "" : `?l=${nextLayer}`}`;
  const cta = nextLayer === last.layer ? "Re-open" : `Continue to Layer ${nextLayer}`;

  return (
    <section className="mb-14">
      <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-rule">
        <h2 className="text-xl" style={{ fontFamily: "var(--cw-serif)" }}>
          Continue where you left off
        </h2>
        <span
          className="text-[11px] text-ink-3"
          style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
        >
          {count} of {TOTAL_NODES} nodes opened
        </span>
      </div>
      <Link
        href={href}
        className="block border border-rule rounded-md p-5 hover:border-rule-strong hover:bg-paper-2/40 transition-colors no-underline max-w-2xl"
      >
        <div
          className="text-[11px] uppercase text-ink-3 flex items-center gap-2 mb-2"
          style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold-deep)" }} aria-hidden />
          Last seen · {last.id} · Layer {last.layer}
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <h3
            className="text-lg leading-snug"
            style={{ fontFamily: "var(--cw-serif)" }}
          >
            {last.title}
          </h3>
          <span
            className="text-[11px] text-gold-deep shrink-0"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
          >
            {cta} →
          </span>
        </div>
      </Link>
    </section>
  );
}
