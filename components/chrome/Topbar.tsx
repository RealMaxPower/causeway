import Link from "next/link";
import { ReactNode } from "react";
import { Logo } from "./Logo";
import { SearchPalette } from "./SearchPalette";
import { ThemeToggle } from "./ThemeToggle";

interface TopbarProps {
  /** Optional leading slot rendered before the brand — used for the MobileNav hamburger. */
  leftAddon?: ReactNode;
  /** Optional breadcrumb segments rendered between the brand and the right-side slot. */
  crumb?: ReactNode;
  /** Right-side slot — usually a LayerSwitch, prev/next, or "Track map" button. */
  right?: ReactNode;
}

export function Topbar({ leftAddon, crumb, right }: TopbarProps) {
  return (
    <header
      className="border-b border-rule sticky top-0 z-50 backdrop-blur-sm"
      style={{ background: "color-mix(in oklch, var(--paper) 92%, transparent)" }}
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-9 min-h-14 flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2 sm:gap-6 py-2 sm:py-0">
        {leftAddon && <div className="shrink-0">{leftAddon}</div>}
        <Link
          href="/"
          className="flex items-center gap-2 no-underline text-ink hover:text-ink-2 transition-colors shrink-0"
        >
          <span
            className="inline-flex items-center"
            style={{ color: "var(--gold-deep)" }}
          >
            <Logo size={16} />
          </span>
          <span
            className="text-base tracking-tight"
            style={{ fontFamily: "var(--cw-serif)" }}
          >
            Causeway
          </span>
          <span
            className="text-[11px] text-ink-3 ml-1.5 hidden md:inline"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
          >
            an explorable economy
          </span>
        </Link>

        {crumb && (
          <div
            className="text-[11px] text-ink-3 flex items-center gap-1.5 truncate min-w-0 basis-full sm:basis-auto order-3 sm:order-0"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
          >
            {crumb}
          </div>
        )}

        <div className="flex-1 min-w-0" />
        <div className="shrink-0 flex items-center gap-2">
          <SearchPalette />
          <ThemeToggle />
        </div>
        {right && (
          <div className="shrink-0 basis-full sm:basis-auto flex items-center justify-end sm:ml-3 order-4 sm:order-0">
            {right}
          </div>
        )}
      </div>
    </header>
  );
}

interface CrumbProps {
  /** Series of breadcrumb segments. Separators are inserted automatically. */
  segments: ReactNode[];
}

/** Render a sequence of breadcrumb segments with consistent separators. */
export function Crumb({ segments }: CrumbProps) {
  return (
    <>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-ink-4">/</span>}
          <span className={i === segments.length - 1 ? "text-ink-2" : ""}>
            {seg}
          </span>
        </span>
      ))}
    </>
  );
}
