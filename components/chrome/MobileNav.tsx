"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SideNavList } from "./SideNavList";
import type { TrackLetter } from "@/lib/tracks";

interface MobileNavProps {
  currentNodeId?: string;
  currentTrackLetter?: TrackLetter;
}

/**
 * Hamburger trigger + off-canvas drawer for the track map. Visible below `lg`;
 * desktop uses the always-visible {@link SideNav} rail instead.
 */
export function MobileNav({ currentNodeId, currentTrackLetter }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Close on route change — handles back/forward as well as the in-drawer onNavigate path.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // Lock body scroll + listen for ESC while the drawer is open.
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open track map"
        aria-expanded={open}
        aria-controls="mobile-track-map"
        className="lg:hidden inline-flex items-center justify-center w-9 h-9 -ml-1 rounded border border-rule text-ink-2 hover:text-ink hover:bg-paper-2 transition-colors"
      >
        <HamburgerIcon />
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={`lg:hidden fixed inset-0 z-60 bg-ink-surface/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer panel */}
      <aside
        id="mobile-track-map"
        role="dialog"
        aria-modal="true"
        aria-label="Track map"
        aria-hidden={!open}
        className={`lg:hidden fixed top-0 bottom-0 left-0 z-70 w-72 max-w-[85vw] h-dvh bg-paper border-r border-rule shadow-xl transition-transform duration-200 ease-out flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-rule shrink-0">
          <span
            className="text-[11px] uppercase text-ink-3"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
          >
            Track map
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close track map"
            className="inline-flex items-center justify-center w-9 h-9 -mr-2 text-ink-2 hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <SideNavList
            currentNodeId={currentNodeId}
            currentTrackLetter={currentTrackLetter}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </aside>
    </>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="2.5" y1="4.5" x2="13.5" y2="4.5" />
      <line x1="2.5" y1="8" x2="13.5" y2="8" />
      <line x1="2.5" y1="11.5" x2="13.5" y2="11.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
      <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
    </svg>
  );
}
