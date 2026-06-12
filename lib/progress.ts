/**
 * Causeway · per-user reading progress, persisted to localStorage.
 *
 * Mirrors the lib/playbook.ts shape: SSR-safe, defensive parse, no external
 * deps. Records the deepest layer reached per node, plus a timestamp, so the
 * home page can surface "continue where you left off" and the sidenav can dim
 * visited nodes.
 *
 * Anonymous; no auth. Lose your localStorage and you lose your progress.
 */

export type Layer = 1 | 2 | 3;

export interface NodeProgress {
  /** Deepest layer reached so far for this node. */
  layer: Layer;
  /** ISO timestamp of the most recent visit. */
  lastReadAt: string;
}

export interface ProgressState {
  /** Map of node id → progress. */
  nodes: Record<string, NodeProgress>;
  /** Most recently visited node id (for the home "Continue" card). */
  lastNodeId: string | null;
}

const STORAGE_KEY = "causeway.progress.v1";

export function emptyState(): ProgressState {
  return { nodes: {}, lastNodeId: null };
}

export function loadState(): ProgressState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return normalise(JSON.parse(raw) as unknown);
  } catch {
    return emptyState();
  }
}

export function saveState(s: ProgressState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // localStorage disabled — nothing we can do.
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Record a node visit. Only advances the recorded layer; revisiting L1 after
 * reading L3 doesn't downgrade the record.
 */
export function recordVisit(
  current: ProgressState,
  nodeId: string,
  layer: Layer,
): ProgressState {
  const id = nodeId.toUpperCase();
  const existing = current.nodes[id];
  const nextLayer: Layer =
    existing && existing.layer > layer ? existing.layer : layer;
  return {
    nodes: {
      ...current.nodes,
      [id]: { layer: nextLayer, lastReadAt: new Date().toISOString() },
    },
    lastNodeId: id,
  };
}

export function hasVisited(s: ProgressState, nodeId: string): boolean {
  return Boolean(s.nodes[nodeId.toUpperCase()]);
}

export function visitedCount(s: ProgressState): number {
  return Object.keys(s.nodes).length;
}

function normalise(raw: unknown): ProgressState {
  const empty = emptyState();
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, unknown>;
  const nodes: Record<string, NodeProgress> = {};
  if (r.nodes && typeof r.nodes === "object") {
    for (const [id, val] of Object.entries(r.nodes as Record<string, unknown>)) {
      if (!val || typeof val !== "object") continue;
      const v = val as Record<string, unknown>;
      const layer = v.layer;
      const lastReadAt = v.lastReadAt;
      if (
        (layer === 1 || layer === 2 || layer === 3) &&
        typeof lastReadAt === "string"
      ) {
        nodes[id] = { layer, lastReadAt };
      }
    }
  }
  return {
    nodes,
    lastNodeId: typeof r.lastNodeId === "string" ? r.lastNodeId : null,
  };
}
