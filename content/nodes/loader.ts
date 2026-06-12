/**
 * Load a node's MDX content module. Returns null if the file doesn't exist
 * yet — the generic renderer can fall back to pocket-only content from
 * lib/tracks.ts in that case.
 *
 * Uses a dynamic import keyed by node id. Next.js bundles each MDX file
 * as a separate chunk; the await is cheap (resolved synchronously on the
 * server after the initial bundle).
 */

import "server-only";
import type { NodeContentModule } from "./_types";

export async function loadNodeContent(
  id: string,
): Promise<NodeContentModule | null> {
  try {
    const mod = (await import(`./${id}.mdx`)) as NodeContentModule;
    return mod;
  } catch {
    return null;
  }
}
