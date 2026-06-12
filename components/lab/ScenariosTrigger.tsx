"use client";

import { useState } from "react";
import { useRegime } from "@/components/providers/RegimeProvider";
import { buildShareUrl } from "@/lib/regime-scenarios";
import { CopyUrlFallback } from "./CopyUrlFallback";
import { ScenariosDrawer } from "./ScenariosDrawer";
import styles from "./scenarios-trigger.module.css";

/**
 * Header controls for the /lab page: a "Pin scenarios" button that opens the
 * scenarios drawer, plus a "Share current" button that copies a self-contained
 * /lab?regime=… URL of the current regime to the clipboard.
 */
export function ScenariosTrigger() {
  const regime = useRegime();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  if (!regime) return null;

  async function shareCurrent() {
    if (!regime) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = buildShareUrl(regime.inputs, undefined, origin);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFallbackUrl(url);
    }
  }

  return (
    <div className={styles.row}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={styles.btn}
      >
        Pin scenarios ({regime.scenarios.length})
      </button>
      <button type="button" onClick={shareCurrent} className={styles.btn}>
        {copied ? "Copied!" : "Share current"}
      </button>
      <ScenariosDrawer open={open} onClose={() => setOpen(false)} />
      {fallbackUrl && (
        <CopyUrlFallback
          url={fallbackUrl}
          onClose={() => setFallbackUrl(null)}
        />
      )}
    </div>
  );
}
