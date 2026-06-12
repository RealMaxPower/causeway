import Link from "next/link";
import { loadNodeContent } from "@/content/nodes/loader";
import { findNode } from "@/lib/tracks";

interface RelatedNodesProps {
  /** The current node id; we won't show it in its own related list. */
  currentId: string;
}

/**
 * Author-curated "See also" rail. Pulls the current node's MDX `meta.relatedNodes`
 * (an array of node ids) and renders them as small cards. Renders nothing when
 * no related nodes are declared — avoids noise on early-draft nodes.
 */
export async function RelatedNodes({ currentId }: RelatedNodesProps) {
  const mod = await loadNodeContent(currentId);
  const ids = mod?.meta?.relatedNodes ?? [];
  const related = ids
    .filter((id) => id.toUpperCase() !== currentId.toUpperCase())
    .map((id) => findNode(id.toUpperCase()))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (related.length === 0) return null;

  return (
    <aside className="mt-12 pt-8 border-t border-rule">
      <div
        className="text-[11px] uppercase text-ink-3 mb-4"
        style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
      >
        See also
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {related.map(({ node, track }) => (
          <li key={node.id}>
            <Link
              href={`/nodes/${node.id}`}
              className="block border border-rule rounded-md p-4 hover:border-rule-strong hover:bg-paper-2/40 transition-colors no-underline h-full"
            >
              <div
                className="text-[10px] uppercase text-ink-3 mb-2"
                style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
              >
                {node.id} · {track.short}
              </div>
              <div
                className="text-base leading-snug"
                style={{ fontFamily: "var(--cw-serif)" }}
              >
                {node.title}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
