"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TRACKS, TRACK_ORDER, type TrackLetter } from "@/lib/tracks";
import { loadState, type ProgressState } from "@/lib/progress";

interface SideNavListProps {
  currentNodeId?: string;
  currentTrackLetter?: TrackLetter;
  /** Fired whenever a navigation link is activated — used by the mobile drawer to close itself. */
  onNavigate?: () => void;
}

/**
 * Presentational track-map list. Used by the desktop SideNav and the mobile
 * drawer; positioning/visibility is the wrapper's job. Reads progress from
 * localStorage on mount to mark visited nodes with a small dot.
 */
export function SideNavList({
  currentNodeId,
  currentTrackLetter,
  onNavigate,
}: SideNavListProps) {
  const expandedLetter: TrackLetter | undefined =
    currentTrackLetter ?? (currentNodeId?.[0] as TrackLetter | undefined);

  const [progress, setProgress] = useState<ProgressState | null>(null);
  useEffect(() => {
    // Hydrate from localStorage after first paint to avoid SSR/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadState());
  }, []);

  return (
    <>
      <ul className="space-y-5">
        {TRACK_ORDER.map((letter) => {
          const track = TRACKS[letter];
          const isExpanded = letter === expandedLetter;

          return (
            <li key={letter}>
              <Link
                href={`/tracks/${letter}`}
                onClick={onNavigate}
                className="flex items-center justify-between text-[11px] no-underline group"
                style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
              >
                <span
                  className={`uppercase ${
                    isExpanded ? "text-ink" : "text-ink-2 group-hover:text-ink"
                  }`}
                >
                  {letter} · {track.short}
                </span>
                <span className="text-ink-4">{track.nodes.length}</span>
              </Link>

              {isExpanded && (
                <ul className="mt-3 space-y-2 ml-3 border-l border-rule pl-3">
                  {track.nodes.map((node) => {
                    const isCurrent = node.id === currentNodeId;
                    const visited = progress?.nodes[node.id];
                    // Show the visited mark only when the node is NOT the
                    // currently active one — current already has its own
                    // weight + colour treatment, and stacking signals adds
                    // visual noise (the small dot read as a bullet point).
                    const showVisited = visited && !isCurrent;
                    return (
                      <li key={node.id}>
                        <Link
                          href={`/nodes/${node.id}`}
                          onClick={onNavigate}
                          aria-label={
                            visited
                              ? `${node.id} ${node.title} · read (deepest layer ${visited.layer})`
                              : `${node.id} ${node.title}`
                          }
                          className={`flex gap-2 text-xs no-underline leading-snug py-0.5 ${
                            isCurrent
                              ? "text-ink font-medium"
                              : visited
                                ? "text-ink-3 hover:text-ink"
                                : "text-ink-2 hover:text-ink"
                          }`}
                        >
                          <span
                            className="text-ink-3 shrink-0 w-8 inline-flex items-baseline justify-end gap-1"
                            style={{ fontFamily: "var(--cw-mono)" }}
                            title={
                              showVisited
                                ? `Read · deepest L${visited!.layer}`
                                : undefined
                            }
                          >
                            <span
                              aria-hidden
                              className={`text-[10px] leading-none ${
                                showVisited
                                  ? "text-gold-deep"
                                  : "opacity-0"
                              }`}
                            >
                              ✓
                            </span>
                            <span>{node.id}</span>
                          </span>
                          <span style={{ fontFamily: "var(--cw-serif)" }}>
                            {node.title}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-10 pt-6 border-t border-rule">
        <div
          className="text-[10px] uppercase text-ink-3 mb-3"
          style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
        >
          Cross-cutting
        </div>
        <ul className="space-y-2 text-xs">
          <li>
            <Link
              href="/regime"
              onClick={onNavigate}
              className="flex gap-2 text-ink-2 hover:text-ink no-underline"
            >
              <span className="text-ink-3 w-7" style={{ fontFamily: "var(--cw-mono)" }}>
                ▣
              </span>
              <span style={{ fontFamily: "var(--cw-serif)" }}>Regime dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              href="/playbook"
              onClick={onNavigate}
              className="flex gap-2 text-ink-2 hover:text-ink no-underline"
            >
              <span className="text-ink-3 w-7" style={{ fontFamily: "var(--cw-mono)" }}>
                ◇
              </span>
              <span style={{ fontFamily: "var(--cw-serif)" }}>Personal playbook</span>
            </Link>
          </li>
          <li>
            <Link
              href="/lab"
              onClick={onNavigate}
              className="flex gap-2 text-ink-2 hover:text-ink no-underline"
            >
              <span className="text-ink-3 w-7" style={{ fontFamily: "var(--cw-mono)" }}>
                ⚗
              </span>
              <span style={{ fontFamily: "var(--cw-serif)" }}>Lab · shared regime</span>
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}
