"use client";

import { useEffect, useState } from "react";
import { loadState, type ProgressState } from "@/lib/progress";

interface VisitedNodeListProps {
  /** Render-prop receiving the hydrated progress state. */
  children: (state: ProgressState) => React.ReactNode;
}

/**
 * Hydrates progress from localStorage on mount and re-renders its child
 * once the data is available. Renders a non-state fallback during SSR
 * so the markup matches between server and first client paint.
 */
export function VisitedNodeList({ children }: VisitedNodeListProps) {
  const [state, setState] = useState<ProgressState | null>(null);

  useEffect(() => {
    // Hydrate from localStorage after first paint to avoid SSR/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadState());
  }, []);

  if (!state) return null;
  return <>{children(state)}</>;
}
