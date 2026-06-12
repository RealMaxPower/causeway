"use client";

import { useEffect } from "react";
import { loadState, recordVisit, saveState, type Layer } from "@/lib/progress";

interface ProgressTrackerProps {
  nodeId: string;
  layer: Layer;
}

/**
 * Fire-and-forget client component: when a node page renders, record the
 * visit. Runs once per mount via empty-deps useEffect. Server-rendered;
 * no UI of its own.
 */
export function ProgressTracker({ nodeId, layer }: ProgressTrackerProps) {
  useEffect(() => {
    const current = loadState();
    const next = recordVisit(current, nodeId, layer);
    saveState(next);
  }, [nodeId, layer]);

  return null;
}
