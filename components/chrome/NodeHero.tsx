import Link from "next/link";
import type { HeroStat, HeroClaim } from "@/content/nodes/_types";

export interface NodeHeroPrereq {
  id: string;
  title: string;
}

interface NodeHeroProps {
  trackLetter: string;
  trackShort: string;
  nodeId: string;
  /** Reserved for the legacy whole-node duration; no longer rendered in the hero
   * crumb (LayerSwitch now shows per-layer time, which is the more useful unit). */
  time: string;
  title: string;
  /** Optional bolder hero deck below the H1 (e.g. A3's wide hero). */
  deck?: string;
  heroStats?: HeroStat[];
  /** Section eyebrow above heroStats. Falls back to "Key facts". */
  heroStatsLabel?: string;
  /** Optional framing/thesis block rendered above heroStats. */
  heroClaim?: HeroClaim;
  /** Optional "Best read after <id>" hint, resolved by the page. */
  prereq?: NodeHeroPrereq;
}

const DEFAULT_HERO_STATS_LABEL = "Key facts";

/**
 * Generic node hero — used by all nodes without a bespoke hero component.
 * Renders the crumb meta, title, optional deck, optional prereq line, and
 * the right rail (optional heroClaim block + optional heroStats section).
 */
export function NodeHero({
  trackLetter,
  trackShort,
  nodeId,
  title,
  deck,
  heroStats,
  heroStatsLabel,
  heroClaim,
  prereq,
}: NodeHeroProps) {
  const hasStats = heroStats && heroStats.length > 0;
  const hasClaim = Boolean(heroClaim);
  const hasRail = hasStats || hasClaim;
  const statsLabel = heroStatsLabel ?? DEFAULT_HERO_STATS_LABEL;

  return (
    <section
      className={`pb-10 mb-10 border-b border-rule ${
        hasRail
          ? "grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12"
          : "space-y-5"
      }`}
    >
      <div className="space-y-4">
        <div
          className="text-[11px] uppercase text-ink-3 flex flex-wrap items-center gap-x-3 gap-y-1"
          style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
        >
          <span className="whitespace-nowrap">
            Track {trackLetter} · {trackShort}
          </span>
          <span className="whitespace-nowrap inline-flex items-center gap-2">
            <span className="text-gold-deep" aria-hidden>●</span>
            Node {nodeId}
          </span>
        </div>
        {prereq && (
          <p
            className="text-[12px] text-ink-3 leading-snug"
            style={{ fontFamily: "var(--cw-serif)", fontStyle: "italic" }}
          >
            Best read after{" "}
            <Link
              href={`/nodes/${prereq.id}`}
              className="text-gold-deep underline"
              style={{ textUnderlineOffset: "3px" }}
            >
              {prereq.id} · {prereq.title}
            </Link>
            .
          </p>
        )}
        <h1
          className="text-4xl leading-tight text-balance"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          {title}
        </h1>
        {deck && (
          <p
            className="text-base text-ink-2 leading-relaxed max-w-2xl"
            style={{ fontFamily: "var(--cw-serif)" }}
          >
            {deck}
          </p>
        )}
      </div>

      {hasRail && (
        <aside className="space-y-6">
          {hasClaim && (
            <div className="border border-rule rounded-md p-4 bg-paper-2">
              <div
                className="text-[10px] uppercase text-ink-3 mb-2"
                style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.14em" }}
              >
                {heroClaim!.lbl}
              </div>
              <p
                className="text-[15px] leading-snug text-ink"
                style={{ fontFamily: "var(--cw-serif)", fontStyle: "italic" }}
              >
                {heroClaim!.text}
              </p>
              {heroClaim!.sub && (
                <p
                  className="text-[12px] text-ink-3 mt-2 leading-snug"
                  style={{ fontFamily: "var(--cw-serif)" }}
                >
                  {heroClaim!.sub}
                </p>
              )}
            </div>
          )}
          {hasStats && (
            <div className="space-y-3">
              <div
                className="text-[10px] uppercase text-ink-3"
                style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.14em" }}
              >
                {statsLabel}
              </div>
              <div className="space-y-4">
                {heroStats!.map((s) => (
                  <div key={s.lbl} className="border-l-2 border-rule pl-4 py-1">
                    <div
                      className="text-[10px] uppercase text-ink-3 mb-1"
                      style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.14em" }}
                    >
                      {s.lbl}
                    </div>
                    <div
                      className="text-xl text-ink"
                      style={{ fontFamily: "var(--cw-mono)" }}
                    >
                      {s.val}
                    </div>
                    <div className="text-[11px] text-ink-3 mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}
    </section>
  );
}
