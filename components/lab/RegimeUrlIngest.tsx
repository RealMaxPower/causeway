"use client";

import { useEffect, useState } from "react";
import { useRegime } from "@/components/providers/RegimeProvider";
import { decodeRegimeFromUrl } from "@/lib/regime-scenarios";
import styles from "./regime-url-ingest.module.css";

/**
 * Mounted inside the RegimeProvider on /lab. If the URL has `?regime=<base64>`,
 * decode the regime and apply it once, then clear the query string. Shows a
 * dismissable banner with the optional `?name=...` for context. Renders
 * nothing when the URL is plain.
 */
export function RegimeUrlIngest() {
  const regime = useRegime();
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !regime) return;
    const params = new URLSearchParams(window.location.search);
    const b64 = params.get("regime");
    if (!b64) return;
    const decoded = decodeRegimeFromUrl(b64);
    if (decoded) {
      regime.setInputs(decoded);
      const name = params.get("name");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (name) setBanner(name);
    }
    // Clear the query string so a refresh doesn't re-apply, and the URL
    // stays clean for sharing the user's current state.
    window.history.replaceState(null, "", "/lab");
    // Empty deps: this should fire exactly once on mount. The regime callbacks
    // are stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!banner) return null;

  return (
    <div className={styles.banner} role="status">
      <span className={styles.bannerLabel}>Loaded scenario</span>
      <span className={styles.bannerName}>{banner}</span>
      <button
        type="button"
        onClick={() => setBanner(null)}
        className={styles.bannerClose}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
