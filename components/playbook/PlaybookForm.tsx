"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CAREER_OPTIONS,
  CURRENCY_OPTIONS,
  DEBT_OPTIONS,
  HOUSING_OPTIONS,
  PORTFOLIO_OPTIONS,
  PURCHASE_OPTIONS,
  REGIME_OPTIONS,
  SAVING_OPTIONS,
  buildCsv,
  buildMailto,
  decodeShareable,
  emptyState,
  encodeShareable,
  loadState,
  saveState,
  type Option,
  type PlaybookState,
} from "@/lib/playbook";
import { track } from "@/lib/analytics";
import { PlaybookSummary } from "./PlaybookSummary";
import styles from "./playbook.module.css";

interface PlaybookFormProps {
  /** Optional ?state= query param passed in by the page. */
  initialShareable?: string;
}

export function PlaybookForm({ initialShareable }: PlaybookFormProps) {
  const [state, setState] = useState<PlaybookState>(emptyState());
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from URL state or localStorage on mount. setState in effect is
  // the SSR-rehydration pattern — server can't read the URL or localStorage.
  useEffect(() => {
    if (initialShareable) {
      const decoded = decodeShareable(initialShareable);
      if (decoded) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(decoded);
        saveState(decoded);
        setHydrated(true);
        return;
      }
    }
    setState(loadState());
    setHydrated(true);
  }, [initialShareable]);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!hydrated) return;
    saveState(state);
  }, [state, hydrated]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function update<K extends keyof PlaybookState>(
    key: K,
    value: PlaybookState[K],
  ) {
    setState((p) => ({ ...p, [key]: value }));
  }

  function handleShare() {
    const shareable = encodeShareable(state);
    const url = `${window.location.origin}/playbook?state=${shareable}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => showToast("Share link copied to clipboard."),
        () => showToast("Share link ready — copy from the URL bar."),
      );
    } else {
      window.history.replaceState(null, "", `/playbook?state=${shareable}`);
      showToast("Share link is now in the URL bar — copy and share.");
    }
    track("playbook_shared");
  }

  function handlePrint() {
    track("playbook_printed");
    window.print();
  }

  function handleEmail() {
    track("playbook_emailed");
    const shareable = encodeShareable(state);
    const shareUrl = `${window.location.origin}/playbook?state=${shareable}`;
    window.location.href = buildMailto(state, shareUrl);
  }

  function handleCsv() {
    track("playbook_csv");
    const csv = buildCsv(state);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "causeway-playbook.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Playbook downloaded as CSV.");
  }

  function handleReset() {
    setResetOpen(true);
  }

  function confirmReset() {
    setResetOpen(false);
    setState(emptyState());
    showToast("Playbook cleared.");
  }

  if (!hydrated) {
    return (
      <div className={styles.skeleton}>Loading your playbook…</div>
    );
  }

  return (
    <>
      <div className={styles.actions}>
        <button type="button" className={`${styles.action} ${styles.actionPrimary}`} onClick={handlePrint}>
          Print playbook
        </button>
        <button type="button" className={styles.action} onClick={handleShare}>
          Share link
        </button>
        <button type="button" className={styles.action} onClick={handleEmail}>
          Email to self
        </button>
        <button type="button" className={styles.action} onClick={handleCsv}>
          Download CSV
        </button>
        <button type="button" className={styles.action} onClick={handleReset}>
          Reset
        </button>
        <Link href="/tracks/H" className={styles.action}>
          Re-read Track H →
        </Link>
      </div>
      {toast && <div className={styles.toast}>{toast}</div>}

      <form className={styles.form}>
        <AxisBlock
          title="Read the regime now"
          nodeRef={{ href: "/nodes/H1", label: "H1 · Regime read" }}
          options={REGIME_OPTIONS}
          value={state.regime}
          onChange={(v) => update("regime", v)}
        />
        <AxisBlock
          title="Saving stance"
          nodeRef={{ href: "/nodes/H2", label: "H2 · Saving" }}
          options={SAVING_OPTIONS}
          value={state.saving}
          onChange={(v) => update("saving", v)}
        />
        <AxisBlock
          title="Housing decision"
          nodeRef={{ href: "/nodes/H3", label: "H3 · Housing" }}
          options={HOUSING_OPTIONS}
          value={state.housing}
          onChange={(v) => update("housing", v)}
        />
        <AxisBlock
          title="Career phase"
          nodeRef={{ href: "/nodes/H4", label: "H4 · Career" }}
          options={CAREER_OPTIONS}
          value={state.career}
          onChange={(v) => update("career", v)}
        />
        <AxisBlock
          title="Big-purchase window"
          nodeRef={{ href: "/nodes/H5", label: "H5 · Big purchases" }}
          options={PURCHASE_OPTIONS}
          value={state.purchases}
          onChange={(v) => update("purchases", v)}
        />
        <AxisBlock
          title="Currency stance"
          nodeRef={{ href: "/nodes/H6", label: "H6 · Currency" }}
          options={CURRENCY_OPTIONS}
          value={state.currency}
          onChange={(v) => update("currency", v)}
        />
        <AxisBlock
          title="Debt structure"
          nodeRef={{ href: "/nodes/H7", label: "H7 · Debt" }}
          options={DEBT_OPTIONS}
          value={state.debt}
          onChange={(v) => update("debt", v)}
        />
        <AxisBlock
          title="Portfolio duration"
          nodeRef={{ href: "/nodes/H8", label: "H8 · Portfolio" }}
          options={PORTFOLIO_OPTIONS}
          value={state.portfolio}
          onChange={(v) => update("portfolio", v)}
        />

        <NotesBlock value={state.notes} onChange={(v) => update("notes", v)} />
      </form>

      <PlaybookSummary state={state} />

      <ConfirmDialog
        open={resetOpen}
        title="Clear all answers?"
        body="This can't be undone — your eight axes and notes will be reset."
        confirmLabel="Clear playbook"
        onConfirm={confirmReset}
        onCancel={() => setResetOpen(false)}
      />
    </>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  // Defer portal render until after mount so SSR markup matches.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => confirmRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={styles.dialogOverlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      <div className={styles.dialogCard}>
        <h2 id={titleId} className={styles.dialogTitle}>
          {title}
        </h2>
        <p id={bodyId} className={styles.dialogBody}>
          {body}
        </p>
        <div className={styles.dialogActions}>
          <button
            type="button"
            className={styles.action}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`${styles.action} ${styles.actionPrimary}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface AxisBlockProps<T extends string> {
  title: string;
  nodeRef: { href: string; label: string };
  options: ReadonlyArray<Option<T>>;
  value: T | null;
  onChange: (v: T) => void;
}

function AxisBlock<T extends string>({
  title,
  nodeRef,
  options,
  value,
  onChange,
}: AxisBlockProps<T>) {
  const groupName = useId();
  const legendId = useId();
  const answered = value !== null;
  const cls = `${styles.axis} ${answered ? styles.axisAnswered : ""}`;

  return (
    <fieldset className={cls} aria-labelledby={legendId}>
      <div className={styles.axisHead}>
        <legend id={legendId} className={styles.axisTitle}>
          {title}
        </legend>
        <div className={styles.axisNodeRef}>
          <Link href={nodeRef.href}>{nodeRef.label} →</Link>
        </div>
      </div>
      <div className={styles.options}>
        {options.map((opt) => {
          const isSel = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`${styles.option} ${isSel ? styles.optionSelected : ""}`}
            >
              <input
                type="radio"
                name={groupName}
                value={opt.value}
                checked={isSel}
                onChange={() => onChange(opt.value)}
              />
              <span className={styles.optionLabel}>{opt.label}</span>
              <span className={styles.optionBlurb}>{opt.blurb}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface NotesBlockProps {
  value: string;
  onChange: (v: string) => void;
}

function NotesBlock({ value, onChange }: NotesBlockProps) {
  const id = useId();
  return (
    <div className={styles.notes}>
      <label htmlFor={id} className={styles.notesLabel}>
        Your notes
      </label>
      <textarea
        id={id}
        className={styles.notesField}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What you're watching, what would change your mind, what you've already locked in."
      />
    </div>
  );
}
