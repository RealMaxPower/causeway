import type { ReactNode } from "react";
import Link from "next/link";
import { getSource } from "@/lib/sources";
import styles from "./layers.module.css";

export { Check } from "./Check";
export type { CheckOption, CheckProps } from "./Check";
export { Cite } from "./Cite";
export { L1Pocket, Scene, Comparator, MicroAnimate } from "./L1Visual";
export type { ComparatorRow, ComparatorTone } from "./L1Visual";
export { Term } from "./Term";

interface LayerHeadProps {
  layer: 1 | 2 | 3;
  title: string;
  time: string;
}

function LayerHead({ layer, title, time }: LayerHeadProps) {
  const labels = { 1: "Pocket", 2: "Working Model", 3: "Full Picture" } as const;
  return (
    <div className={styles.head}>
      <div className={styles.ltitle}>
        <span className={styles.lno}>Layer {layer} · {labels[layer]}</span>
        <h2>{title}</h2>
      </div>
      <span className={styles.ltime}>{time}</span>
    </div>
  );
}

/* ---------- Layer 1 — Pocket ---------- */

interface L1Props {
  title: string;
  time?: string;
  /** Left column: short prose. Right column: visual. */
  children: ReactNode;
}

export function L1({ title, time = "~ 30s read", children }: L1Props) {
  return (
    <section className={styles.frame}>
      <LayerHead layer={1} title={title} time={time} />
      <div className={styles.pocketGrid}>{children}</div>
    </section>
  );
}

interface L1QAProps {
  question: string;
  children: ReactNode;
}

export function L1QA({ question, children }: L1QAProps) {
  return (
    <>
      <div className={styles.pocketQ}>{question}</div>
      <p className={styles.pocketA}>{children}</p>
    </>
  );
}

/* ---------- Layer 2 — Working Model ---------- */

interface L2Props {
  title: string;
  time?: string;
  children: ReactNode;
}

export function L2({ title, time = "~ 5 min", children }: L2Props) {
  return (
    <section className={styles.frame}>
      <LayerHead layer={2} title={title} time={time} />
      <div>{children}</div>
    </section>
  );
}

interface L2GridProps {
  /** Main column (prose + steps) and optional rail children. */
  children: ReactNode;
  rail?: ReactNode;
}

/** Two-column layout: main prose left, sticky key-terms rail right. */
export function L2Grid({ children, rail }: L2GridProps) {
  return (
    <div className={styles.l2Grid}>
      <div className={styles.l2Prose}>{children}</div>
      {rail && <aside>{rail}</aside>}
    </div>
  );
}

interface L2StepProps {
  num: string;
  title: string;
  children: ReactNode;
}

export function L2Step({ num, title, children }: L2StepProps) {
  return (
    <div className={styles.step}>
      <div className={styles.stepNum}>
        Step {num} · {title}
      </div>
      {children}
    </div>
  );
}

/* ---------- Side-rail items (key terms, sources) ---------- */

interface SideRailProps {
  title: string;
  children: ReactNode;
}

export function SideRail({ title, children }: SideRailProps) {
  return (
    <div className={styles.rail}>
      <h4 className={styles.railTitle}>{title}</h4>
      <dl>{children}</dl>
    </div>
  );
}

interface KeyTermProps {
  term: string;
  children: ReactNode;
}

export function KeyTerm({ term, children }: KeyTermProps) {
  return (
    <div className={styles.railItem}>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/* ---------- Callout ---------- */

interface CalloutProps {
  title: string;
  /** Optional eyebrow label. Defaults to "In your life". */
  label?: string;
  /**
   * Cross-link to a Track H module per brief §7. Renders as a final
   * line inside the callout: "Open H1 · Reading the regime →".
   */
  link?: {
    /** Route href, e.g. "/nodes/H1". */
    to: string;
    /** Display text, e.g. "H1 · Reading the regime". */
    text: string;
  };
  children: ReactNode;
}

export function Callout({ title, label = "In your life", link, children }: CalloutProps) {
  return (
    <div className={styles.callout}>
      <div className={styles.lbl}>
        <span className={styles.compass} aria-hidden />
        {label}
      </div>
      <h4>{title}</h4>
      {children}
      {link && (
        <p className={styles.calloutLink}>
          <Link href={link.to}>Open {link.text} →</Link>
        </p>
      )}
    </div>
  );
}

/* ---------- Layer 3 — Full Picture ---------- */

interface L3Props {
  title: string;
  time?: string;
  children: ReactNode;
}

export function L3({ title, time = "~ 25 min", children }: L3Props) {
  return (
    <section className={styles.frame}>
      <LayerHead layer={3} title={title} time={time} />
      <div>{children}</div>
    </section>
  );
}

interface L3GridProps {
  children: ReactNode;
  sources?: ReactNode;
}

/** Two-column L3: long-form prose left, sources rail right. */
export function L3Grid({ children, sources }: L3GridProps) {
  return (
    <div className={styles.l3Grid}>
      <div className={styles.l3Prose}>{children}</div>
      {sources && <aside>{sources}</aside>}
    </div>
  );
}

/* ---------- Timeline ---------- */

export interface TimelineEntry {
  year: string;
  event: ReactNode;
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <div className={styles.timeline}>
      {entries.map((e, i) => (
        <FragmentRow key={i} year={e.year}>
          {e.event}
        </FragmentRow>
      ))}
    </div>
  );
}

function FragmentRow({ year, children }: { year: string; children: ReactNode }) {
  return (
    <>
      <div className={styles.timelineYear}>{year}</div>
      <div className={styles.timelineEvent}>{children}</div>
    </>
  );
}

/* ---------- Debate ---------- */

interface DebateProps {
  question: string;
  /** Optional eyebrow label. Defaults to "Live debate". */
  label?: string;
  children: ReactNode;
}

export function Debate({ question, label = "Live debate", children }: DebateProps) {
  return (
    <div className={styles.debate}>
      <div className={styles.debateHead}>
        <div className="h" style={{ fontFamily: "var(--cw-mono)", fontSize: "10.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold-soft)", marginBottom: 4 }}>
          {label}
        </div>
        <div className="q" style={{ fontFamily: "var(--cw-serif)", fontStyle: "italic", fontSize: "17px" }}>
          {question}
        </div>
      </div>
      <div className={styles.debateSides}>{children}</div>
    </div>
  );
}

interface DebateSideProps {
  side: "mainstream" | "heterodox" | string;
  who: string;
  children: ReactNode;
}

export function DebateSide({ side, who, children }: DebateSideProps) {
  return (
    <div className={styles.debateSide} data-side={side}>
      <div className={styles.debateSideWho}>{who}</div>
      {children}
    </div>
  );
}

/* ---------- Sources ---------- */

export interface SourceEntry {
  who: string;
  title: string;
  year: string;
}

interface SourcesProps {
  /** Inline literal entries (legacy / one-off references). */
  entries?: SourceEntry[];
  /** Ids that look up the registry in lib/sources.ts. */
  ids?: string[];
}

/**
 * L3 sources rail. Renders the union of inline `entries` and registry-resolved
 * `ids`. Unknown ids render a visible "[?id]" warning so the author notices
 * the missing entry — mirrors the Cite component's missing-id UX.
 */
export function Sources({ entries = [], ids = [] }: SourcesProps) {
  const rows: Array<{ key: string; who: string; title: string; year: string; missing?: boolean }> = [];

  for (const e of entries) {
    rows.push({ key: `e:${e.title}`, who: e.who, title: e.title, year: e.year });
  }
  for (const id of ids) {
    const s = getSource(id);
    if (s) {
      rows.push({ key: `r:${id}`, who: s.who, title: s.title, year: s.year });
    } else {
      rows.push({ key: `m:${id}`, who: "?", title: `[missing source: ${id}]`, year: "—", missing: true });
    }
  }

  return (
    <div className={styles.sources}>
      <h4>Primary sources</h4>
      {rows.map((s) => (
        <div
          key={s.key}
          className={styles.src}
          style={s.missing ? { color: "var(--cw-red)" } : undefined}
        >
          <div className={styles.srcWho}>{s.who}</div>
          <div className={styles.srcTitle}>{s.title}</div>
          <div className={styles.srcYear}>{s.year}</div>
        </div>
      ))}
    </div>
  );
}
