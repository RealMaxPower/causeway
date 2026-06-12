/** Per-node MDX metadata. Each content/nodes/<id>.mdx exports `meta` of this shape. */

import type { ReactNode } from "react";

export interface HeroStat {
  /** Eyebrow label above the value. */
  lbl: string;
  /** The headline value (e.g. "~ 92%", "$2.4T"). Should be a verifiable
   * quantitative fact; the `sub` line ideally carries a source attribution. */
  val: string;
  /** Sub-caption beneath the value. Use to attribute the source: date,
   * institution, paper. Free-form prose; for inline-citation hyperlinks use
   * the <Cite> component inside the value-prose at the call site instead. */
  sub: string;
}

export interface HeroClaim {
  /** Eyebrow label. Authors choose a precise framing word here — e.g.
   * "The trilemma", "The thesis", "The framing", "The paradox". */
  lbl: string;
  /** 1–2 sentence claim that frames the node's thesis or paradox.
   * Distinct from a heroStat: this is the *argument*, not a *number*. */
  text: string;
  /** Optional supporting line, smaller and muted. */
  sub?: string;
}

export interface L1VisRow {
  lbl: string;
  v: string;
}

export interface NodeMeta {
  /** Quantitative anchor facts shown in the right rail. 0–3 entries.
   * Each `sub` ideally carries an explicit source attribution. */
  heroStats?: HeroStat[];
  /** Section eyebrow above the heroStats block. Defaults to "Key facts".
   * Authored nodes that pass the quantitative-with-sources bar should
   * override to "By the numbers". */
  heroStatsLabel?: string;
  /** Optional framing/thesis/paradox block. Renders above heroStats in
   * the right rail. Use when the node's anchor isn't a number — it's an
   * argument the rest of the page builds on (e.g. A2's trilemma). */
  heroClaim?: HeroClaim;
  /** Optional bolder hero deck below the H1. */
  deck?: string;
  /** Two-line before/after data shown alongside the L1 pocket prose if no custom visual. */
  l1Vis?: L1VisRow[];
  /**
   * Hand-curated list of node ids that are thematically adjacent. Rendered
   * as a "See also" rail at the bottom of the node page. Authoring rule:
   * 2–3 entries, must add information the current node doesn't already cover.
   */
  relatedNodes?: string[];
  /**
   * Node id this one is best read after — surfaced as a small "Best read after
   * <id>" line above the title. Use sparingly: only when the dependency is sharp
   * enough that reading this node first would be actively confusing.
   */
  prereq?: string;
}

/** A loaded MDX node module's shape. */
export interface NodeContentModule {
  meta?: NodeMeta;
  /** Optional rendered L1 body. */
  L1Body?: ReactNode;
  /** Optional rendered L2 body. */
  L2Body?: ReactNode;
  /** Optional rendered L3 body. */
  L3Body?: ReactNode;
}
