interface LogoProps {
  /** Edge length in pixels. Mark is square. */
  size?: number;
  /** Render the faint waterline beneath the pillars. */
  showWaterline?: boolean;
  /** Accessible label. Omit to render as decorative (aria-hidden). */
  title?: string;
  className?: string;
}

/**
 * Causeway brand mark — a gold roadway over three pillars.
 * Single-color via `currentColor`; control fill by setting `color` on a parent.
 */
export function Logo({
  size = 16,
  showWaterline = false,
  title,
  className,
}: LogoProps) {
  const decorative = !title;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={decorative ? "presentation" : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      className={className}
      fill="currentColor"
    >
      <rect x="1.5" y="8" width="21" height="2.25" rx="0.5" />
      <rect x="4" y="10.25" width="2.5" height="10" rx="0.4" />
      <rect x="10.75" y="10.25" width="2.5" height="10" rx="0.4" />
      <rect x="17.5" y="10.25" width="2.5" height="10" rx="0.4" />
      {showWaterline && (
        <rect
          x="1.5"
          y="21"
          width="21"
          height="0.5"
          rx="0.25"
          opacity="0.3"
        />
      )}
    </svg>
  );
}
