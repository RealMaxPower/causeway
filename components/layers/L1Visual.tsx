import type { ReactNode } from "react";
import Image from "next/image";
import styles from "./layers.module.css";

/* ---------- L1Pocket ---------- */

interface L1PocketProps {
  children: ReactNode;
}

/**
 * Left-column wrapper for L1 prose. Caps width so the eye can sweep the
 * pocket answer as one short unit instead of a column-filling block.
 * Pair with one of the right-column visuals below (Scene, Comparator,
 * MicroAnimate). Either slot may be omitted; the layout falls back to
 * a single column when only one child is present.
 */
export function L1Pocket({ children }: L1PocketProps) {
  return <div className={styles.pocket}>{children}</div>;
}

/* ---------- Scene ---------- */

interface SceneProps {
  /** SVG/PNG/JPG under /public, e.g. "/visuals/a1-tablet-coin.svg". */
  src: string;
  /** Alt text — should describe what the image depicts, not its caption. */
  alt: string;
  /** Caption rendered beneath. Keep under ~12 words. */
  caption?: string;
  /** Intrinsic width/height of the asset, in CSS pixels. */
  width?: number;
  height?: number;
}

/**
 * One figured micro-moment for L1 — replaces the inline `<dl>` tables
 * that earlier nodes used as a fake "visual". Use for concrete imagery
 * that locks the page's central concept into a picture.
 */
export function Scene({
  src,
  alt,
  caption,
  width = 360,
  height = 220,
}: SceneProps) {
  return (
    <figure className={styles.scene}>
      <Image src={src} alt={alt} width={width} height={height} className={styles.sceneImg} />
      {caption && <figcaption className={styles.sceneCap}>{caption}</figcaption>}
    </figure>
  );
}

/* ---------- Comparator ---------- */

export type ComparatorTone = "neutral" | "good" | "bad" | "muted";

export interface ComparatorRow {
  /** Row label, left column. */
  lbl: string;
  /** Row value, right column. */
  v: string;
  /** Optional tone for the value — colors it via design tokens. */
  tone?: ComparatorTone;
}

interface ComparatorProps {
  /** Eyebrow label above the rows. */
  title: string;
  rows: ComparatorRow[];
}

/**
 * Two-column "folk theory vs record" data block. Promotes the
 * inline-styled `<dl>` pattern from the early MDX files into a real
 * component so the styling stays consistent across nodes.
 */
export function Comparator({ title, rows }: ComparatorProps) {
  return (
    <div className={styles.comparator}>
      <div className={styles.comparatorTitle}>{title}</div>
      <dl className={styles.comparatorDl}>
        {rows.map((r) => (
          <div key={r.lbl} className={styles.comparatorRow}>
            <dt>{r.lbl}</dt>
            <dd data-tone={r.tone ?? "neutral"}>{r.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------- MicroAnimate ---------- */

interface MicroAnimateProps {
  /** Which animation to render. Add new kinds here as nodes need them. */
  kind: "money-creation";
  /** Optional caption beneath the animation. */
  caption?: string;
}

/**
 * CSS-driven micro-animation for L1. Only use when motion earns its place —
 * a static Scene or Comparator is usually clearer. Today only the
 * `money-creation` variant is wired; future kinds get their own branch.
 */
export function MicroAnimate({ kind, caption }: MicroAnimateProps) {
  return (
    <figure className={styles.scene} aria-label={`Animation: ${kind}`}>
      <div className={styles.microAnimate} data-kind={kind}>
        {kind === "money-creation" && (
          <>
            <div className={styles.maRow}>
              <span className={styles.maLbl}>Loan</span>
              <span className={styles.maBar} style={{ width: "70%" }} />
            </div>
            <div className={styles.maRow}>
              <span className={styles.maLbl}>Deposit</span>
              <span className={styles.maBar} style={{ width: "70%" }} />
            </div>
          </>
        )}
      </div>
      {caption && <figcaption className={styles.sceneCap}>{caption}</figcaption>}
    </figure>
  );
}
