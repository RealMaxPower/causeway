import { getSource } from "@/lib/sources";

interface CiteProps {
  /** Source id from `lib/sources.ts`. */
  id: string;
  /** Optional display override; defaults to "Who · Title (Year)". */
  label?: string;
}

/**
 * Inline citation. Looks up the source by id and renders it as a small
 * superscript link. If the id is unknown, renders a visible warning span
 * so missing citations are caught during review rather than going silent.
 */
export function Cite({ id, label }: CiteProps) {
  const src = getSource(id);
  if (!src) {
    return (
      <span
        title={`Unknown source: ${id}`}
        style={{ color: "var(--cw-red)", fontFamily: "var(--cw-mono)", fontSize: "0.85em" }}
      >
        [?{id}]
      </span>
    );
  }
  const display = label ?? `${src.who} (${src.year})`;
  return (
    <sup style={{ fontSize: "0.72em", lineHeight: 1 }}>
      <a
        href={src.url}
        target="_blank"
        rel="noopener noreferrer"
        title={`${src.who} — ${src.title} (${src.year})`}
        style={{ color: "var(--gold-deep)", textDecoration: "none" }}
      >
        [{display}]
      </a>
    </sup>
  );
}
