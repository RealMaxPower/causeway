/**
 * Vercel Analytics — typed helper.
 *
 * <Analytics /> in app/layout.tsx records page views automatically.
 * This helper fires custom events ("tutor_ask", "search_open", etc.)
 * Safe to call from anywhere — no-op on the server.
 *
 * On Vercel Hobby, custom events count against the 2.5k events/mo cap.
 * On Pro they're billed per event. Keep event names stable; props
 * should be low-cardinality.
 */

import { track as vercelTrack } from "@vercel/analytics";

type Props = Record<string, string | number | boolean>;

/** Fire a custom analytics event. No-op on the server. */
export function track(event: string, props?: Props): void {
  if (typeof window === "undefined") return;
  vercelTrack(event, props);
}
