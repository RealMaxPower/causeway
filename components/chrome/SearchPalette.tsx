"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { track } from "@/lib/analytics";
import { searchNodes } from "@/lib/search";
import { TRACKS, TRACK_ORDER, TOTAL_NODES, type TrackLetter } from "@/lib/tracks";
import styles from "./SearchPalette.module.css";

const RECENTS_KEY = "causeway.search.recents.v1";
const RECENTS_MAX = 5;

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, RECENTS_MAX);
  } catch {
    return [];
  }
}

function pushRecent(query: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const current = loadRecents().filter((q) => q !== query);
    const next = [query, ...current].slice(0, RECENTS_MAX);
    window.sessionStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

/**
 * Global Cmd-K / Ctrl-K / "/" command palette. Mounted once in the
 * Topbar; opens over any page. Searches `lib/tracks.ts` metadata
 * synchronously via lib/search — trivial cost at this scale.
 *
 * Filters: chip a single Track letter to restrict results.
 * Recents: last 5 queries persisted to sessionStorage (per-tab).
 * Keyboard: j/k mirror ↓/↑, ? toggles a shortcuts help panel.
 */
export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [trackFilter, setTrackFilter] = useState<TrackLetter | null>(null);
  const [recents, setRecents] = useState<string[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    // Portal-mount flag set after first paint; intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const results = useMemo(
    () => searchNodes(query, 8, trackFilter ? { track: trackFilter } : {}),
    [query, trackFilter],
  );

  useEffect(() => {
    // Reset highlighted row when result list changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(0);
  }, [results]);

  useEffect(() => {
    // Close palette + help modal on route change.
    /* eslint-disable react-hooks/set-state-in-effect */
    setOpen(false);
    setHelpOpen(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
      setRecents(loadRecents());
    } else {
      setQuery("");
      setTrackFilter(null);
      setHelpOpen(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const openPalette = useCallback(() => {
    setOpen(true);
    track("search_open");
  }, []);

  const closePalette = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      const inField =
        target instanceof HTMLElement &&
        target.matches("input, textarea, [contenteditable]");

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          const next = !v;
          if (next) track("search_open");
          return next;
        });
        return;
      }
      if (e.key === "/" && !inField && !open) {
        e.preventDefault();
        openPalette();
        return;
      }
      if (e.key === "?" && !inField && !open) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key === "Escape") {
        if (helpOpen) {
          e.preventDefault();
          setHelpOpen(false);
          return;
        }
        if (open) {
          e.preventDefault();
          closePalette();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, helpOpen, openPalette, closePalette]);

  function navigateTo(href: string) {
    track("search_navigate", { href });
    if (query.trim()) {
      const next = pushRecent(query.trim());
      setRecents(next);
    }
    closePalette();
    router.push(href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || (e.key === "j" && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp" || (e.key === "k" && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[selected];
      if (hit) navigateTo(hit.href);
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={openPalette}
        aria-label="Open search"
      >
        <span className={styles.inputIcon} aria-hidden>
          ⌕
        </span>
        <span className={styles.triggerLabel}>Search the brief…</span>
        <span className={styles.triggerKbd}>⌘K</span>
      </button>

      {open && mounted && createPortal(
        <div
          className={styles.overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePalette();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Search Causeway"
        >
          <div className={styles.card}>
            <div className={styles.inputRow}>
              <span className={styles.inputIcon} aria-hidden>
                ⌕
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                className={styles.input}
                placeholder={
                  trackFilter
                    ? `Search Track ${trackFilter} · ${TRACKS[trackFilter].short}…`
                    : "Search nodes, tracks, pages…"
                }
                aria-controls={listboxId}
                aria-autocomplete="list"
                spellCheck={false}
              />
              <button
                type="button"
                className={styles.closeButton}
                onClick={closePalette}
                aria-label="Close search"
              >
                <span aria-hidden>esc</span>
                <span aria-hidden className={styles.closeX}>×</span>
              </button>
            </div>

            <div className={styles.filterRow}>
              <button
                type="button"
                className={`${styles.filterChip} ${trackFilter === null ? styles.filterChipActive : ""}`}
                onClick={() => setTrackFilter(null)}
                aria-pressed={trackFilter === null}
              >
                All
              </button>
              {TRACK_ORDER.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`${styles.filterChip} ${trackFilter === l ? styles.filterChipActive : ""}`}
                  onClick={() => setTrackFilter((c) => (c === l ? null : l))}
                  aria-pressed={trackFilter === l}
                  title={TRACKS[l].title}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className={styles.results} id={listboxId} role="listbox">
              {query.trim() === "" ? (
                <>
                  {recents.length > 0 ? (
                    <div className={styles.recents}>
                      <div className={styles.recentsLabel}>Recent</div>
                      {recents.map((q) => (
                        <button
                          key={q}
                          type="button"
                          className={styles.recentChip}
                          onClick={() => setQuery(q)}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className={styles.emptyState}>
                    Type to search {TOTAL_NODES} nodes across {TRACK_ORDER.length} tracks. <br />
                    <em>Press ? for keyboard shortcuts.</em>
                  </div>
                </>
              ) : results.length === 0 ? (
                <div className={styles.emptyState}>
                  No results for <em>{query}</em>
                  {trackFilter ? ` in Track ${trackFilter}` : ""}.<br />
                  Try a different concept name or clear the filter.
                </div>
              ) : (
                results.map((hit, i) => {
                  const isSel = i === selected;
                  return (
                    <button
                      key={`${hit.kind}-${hit.href}`}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      className={`${styles.resultRow} ${
                        isSel ? styles.resultRowSelected : ""
                      }`}
                      onMouseEnter={() => setSelected(i)}
                      onClick={() => navigateTo(hit.href)}
                    >
                      <div className={styles.resultEyebrow}>{hit.eyebrow}</div>
                      <div className={styles.resultTitle}>{hit.title}</div>
                      <div className={styles.resultPocket}>{hit.pocket}</div>
                    </button>
                  );
                })
              )}
            </div>

            <div className={styles.foot}>
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> navigate
              </span>
              <span>
                <kbd>↵</kbd> open
              </span>
              <span>
                <kbd>?</kbd> shortcuts
              </span>
              <span>
                <kbd>esc</kbd> close
              </span>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {helpOpen && mounted && createPortal(
        <div
          className={styles.overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setHelpOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <div className={styles.helpCard}>
            <h2 className={styles.helpTitle}>Keyboard shortcuts</h2>
            <dl className={styles.helpList}>
              <dt><kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd></dt>
              <dd>Open search palette</dd>
              <dt><kbd>/</kbd></dt>
              <dd>Open search palette (when not typing)</dd>
              <dt><kbd>↑</kbd> / <kbd>↓</kbd></dt>
              <dd>Move selection in results</dd>
              <dt><kbd>⌘J</kbd> / <kbd>⌘K</kbd></dt>
              <dd>Same as ↓ / ↑ (vim-style)</dd>
              <dt><kbd>↵</kbd></dt>
              <dd>Open the selected result</dd>
              <dt><kbd>?</kbd></dt>
              <dd>Toggle this help panel</dd>
              <dt><kbd>esc</kbd></dt>
              <dd>Close palette or help</dd>
            </dl>
            <button
              type="button"
              className={styles.helpClose}
              onClick={() => setHelpOpen(false)}
            >
              Close
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
