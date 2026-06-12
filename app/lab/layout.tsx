import type { ReactNode } from "react";
import { RegimeProvider } from "@/components/providers/RegimeProvider";

/**
 * Lab-mode layout. Wraps `/lab` in a RegimeProvider so the composer and
 * reader widgets share a single regime. Other routes are unaffected:
 * `useRegime()` returns null there, and each widget falls back to its
 * own local state.
 */
export default function LabLayout({ children }: { children: ReactNode }) {
  return <RegimeProvider>{children}</RegimeProvider>;
}
