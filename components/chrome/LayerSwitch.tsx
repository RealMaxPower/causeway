"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useCallback, useState } from "react";
import type { LayerNumber } from "@/lib/layer";
import { track } from "@/lib/analytics";

const LAYERS = [
  { n: 1, label: "Pocket", duration: "30s" },
  { n: 2, label: "Working model", duration: "5m" },
  { n: 3, label: "Full picture", duration: "25m" },
] as const;

const EXPLAINER_KEY = "cw:layer-explainer-dismissed";
const PLAIN_KEY = "cw:plain-mode";
const PLAIN_BODY_CLASS = "cw-plain";

interface LayerSwitchProps {
  /** Current layer number, sourced from the parent (URL `?l=N` in practice). */
  layer: LayerNumber;
}

/**
 * Layer switcher. Pushes `?l=<n>` into the URL so layer state is shareable
 * and survives refresh. Keyboard shortcuts 1/2/3 also switch layers (ignored
 * while the user is typing into an input or textarea).
 */
export function LayerSwitch({ layer }: LayerSwitchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showExplainer, setShowExplainer] = useState(false);
  const [plainMode, setPlainMode] = useState(false);

  const switchTo = useCallback(
    (n: LayerNumber) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("l", String(n));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      // Track depth choice so we can see which layers actually get used.
      // pathname is /nodes/<id>; carry the id as a prop.
      const match = pathname.match(/^\/nodes\/([A-Za-z0-9]+)/);
      const nodeId = match ? match[1].toUpperCase() : "unknown";
      track("layer_change", { layer: n, node: nodeId });
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.matches("input, textarea")) return;
      if (e.key === "1" || e.key === "2" || e.key === "3") {
        switchTo(parseInt(e.key, 10) as LayerNumber);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [switchTo]);

  // First-visit popover: show once, persist dismissal in localStorage.
  // Effect-deferred so SSR markup matches first client render — the rule
  // about setState-in-effect doesn't help us here, this is a one-shot
  // mount sync with an external store (localStorage), not a render loop.
  useEffect(() => {
    try {
      if (!localStorage.getItem(EXPLAINER_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowExplainer(true);
      }
    } catch {
      // Private mode / storage disabled — quietly skip the explainer.
    }
  }, []);

  const dismissExplainer = useCallback(() => {
    setShowExplainer(false);
    try {
      localStorage.setItem(EXPLAINER_KEY, "1");
    } catch {
      // No-op if storage unavailable.
    }
  }, []);

  // Plain-mode (reader settings): sync body class from localStorage on mount,
  // and keep it in sync as the user toggles the preference. Body class drives
  // a CSS rule in layers.module.css that hides the <Term> dotted underlines.
  useEffect(() => {
    try {
      const on = localStorage.getItem(PLAIN_KEY) === "1";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlainMode(on);
      document.body.classList.toggle(PLAIN_BODY_CLASS, on);
    } catch {
      // Storage disabled — leave plain mode off.
    }
  }, []);

  const togglePlainMode = useCallback(() => {
    setPlainMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PLAIN_KEY, next ? "1" : "0");
      } catch {
        // No-op if storage unavailable.
      }
      document.body.classList.toggle(PLAIN_BODY_CLASS, next);
      return next;
    });
  }, []);

  return (
    <div className="relative flex items-center gap-2">
    <div
      className="inline-flex flex-wrap gap-y-1 border border-rule rounded max-w-full"
      role="tablist"
      aria-label="Choose depth"
    >
      {LAYERS.map(({ n, label, duration }, i) => {
        const active = layer === n;
        const isLast = i === LAYERS.length - 1;
        return (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => switchTo(n as LayerNumber)}
            className={`px-2.5 sm:px-3 py-1.5 text-xs inline-flex items-center gap-1.5 transition-colors ${
              isLast ? "" : "border-r border-rule"
            } ${
              active
                ? "bg-ink-surface text-ink-surface-fg"
                : "bg-transparent text-ink-2 hover:bg-paper-2"
            }`}
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.04em" }}
          >
            <span className="font-medium">L{n}</span>
            <span className="hidden md:inline" style={{ fontFamily: "var(--cw-sans)" }}>
              {label}
            </span>
            <span className={`text-[10px] ${active ? "text-ink-surface-fg/70" : "text-ink-4"}`}>
              · {duration}
            </span>
          </button>
        );
      })}
    </div>
      <button
        type="button"
        onClick={() => setShowExplainer((v) => !v)}
        aria-label="Reader settings and layer guide"
        aria-expanded={showExplainer}
        title="What do the layers mean?"
        className="h-7 w-7 text-xs text-ink-3 hover:text-ink border border-rule rounded inline-flex items-center justify-center"
        style={{ fontFamily: "var(--cw-mono)" }}
      >
        ?
      </button>
      {showExplainer && (
        <div
          role="dialog"
          aria-label="Reader settings and layer guide"
          className="absolute right-0 top-full mt-2 z-30 w-80 max-w-[calc(100vw-2rem)] border border-rule bg-paper-2 rounded shadow-lg p-3 text-[12px] leading-snug text-ink-2"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          <div
            className="text-[10px] uppercase text-ink-3 mb-2"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.14em" }}
          >
            Pick your depth
          </div>
          <p className="mb-1"><strong className="text-ink">L1 · Pocket</strong> — 30 seconds, the gist.</p>
          <p className="mb-1"><strong className="text-ink">L2 · Working model</strong> — 5 minutes, the mechanism.</p>
          <p className="mb-3"><strong className="text-ink">L3 · Full picture</strong> — 25 minutes, the history and debate.</p>
          <div className="border-t border-rule pt-3 mb-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={plainMode}
                onChange={togglePlainMode}
                className="mt-0.5"
                aria-describedby="cw-plain-help"
              />
              <span>
                <span className="text-ink">Plain mode</span>
                <span id="cw-plain-help" className="block text-ink-3 text-[11px] mt-0.5">
                  Hide glossary underlines. Hover still shows definitions.
                </span>
              </span>
            </label>
          </div>
          <button
            type="button"
            onClick={dismissExplainer}
            className="text-[11px] underline text-gold-deep"
            style={{ fontFamily: "var(--cw-mono)", textUnderlineOffset: "3px" }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

