"use client";

import { useEffect, useRef } from "react";
import styles from "./copy-url-fallback.module.css";

interface CopyUrlFallbackProps {
  url: string;
  onClose: () => void;
}

/**
 * Modal shown when navigator.clipboard.writeText fails (older browsers,
 * insecure contexts, permission denial). The URL is rendered into an
 * auto-focused + auto-selected textarea so the user can press Ctrl/Cmd+C
 * and paste anywhere. Replaces the older window.prompt() fallback, which
 * was an OS-native dialog and broke the visual rhythm of the lab page.
 */
export function CopyUrlFallback({ url, onClose }: CopyUrlFallbackProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Auto-select the URL so Ctrl/Cmd+C copies immediately. Falling back
    // to focusing the close button keeps keyboard users productive if the
    // browser blocks programmatic selection.
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    } else {
      closeRef.current?.focus();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-url-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div id="copy-url-title" className={styles.title}>
          Copy share URL
        </div>
        <p className={styles.body}>
          Your browser blocked automatic clipboard write. Select the URL
          below and press <kbd className={styles.kbd}>⌘</kbd>/
          <kbd className={styles.kbd}>Ctrl</kbd>+<kbd className={styles.kbd}>C</kbd>.
        </p>
        <textarea
          ref={textareaRef}
          className={styles.input}
          value={url}
          readOnly
          rows={3}
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className={styles.actions}>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
