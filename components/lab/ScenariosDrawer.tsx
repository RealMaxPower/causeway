"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRegime } from "@/components/providers/RegimeProvider";
import {
  buildShareUrl,
  exportScenariosToJson,
  importScenariosFromJson,
  MAX_SCENARIOS,
  suggestedExportFilename,
} from "@/lib/regime-scenarios";
import { CopyUrlFallback } from "./CopyUrlFallback";
import styles from "./scenarios-drawer.module.css";

interface ScenariosDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Side drawer for managing pinned regime scenarios. Pin / rename / reorder /
 * delete / apply / share. Lives only on /lab (wrapped in RegimeProvider);
 * useRegime() returns null outside that route and the drawer renders nothing.
 */
export function ScenariosDrawer({ open, onClose }: ScenariosDrawerProps) {
  const regime = useRegime();
  const [pinName, setPinName] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{
    count: number;
    apply: () => void;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape; focus close button when opening.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const scenarios = useMemo(() => regime?.scenarios ?? [], [regime?.scenarios]);
  const isFull = scenarios.length >= MAX_SCENARIOS;
  const currentMatches = useMemo(() => {
    if (!regime) return null;
    return scenarios.find(
      (s) =>
        approxEq(s.inputs.inflation, regime.inputs.inflation) &&
        approxEq(s.inputs.fedFunds, regime.inputs.fedFunds) &&
        approxEq(s.inputs.unemployment, regime.inputs.unemployment) &&
        approxEq(s.inputs.sloos, regime.inputs.sloos),
    );
  }, [regime, scenarios]);

  if (!regime) return null;
  if (!open) return null;

  function submitPin() {
    if (!regime) return;
    setPinError(null);
    try {
      regime.pinCurrent(pinName);
      setPinName("");
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Could not pin.");
    }
  }

  function startEdit(id: string, current: string) {
    setEditingId(id);
    setEditingValue(current);
  }

  function commitEdit() {
    if (!regime || !editingId) return;
    if (editingValue.trim()) regime.renameScenario(editingId, editingValue);
    setEditingId(null);
    setEditingValue("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingValue("");
  }

  function moveUp(idx: number) {
    if (!regime || idx <= 0) return;
    const next = scenarios.map((s) => s.id);
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    regime.reorderScenarios(next);
  }

  function moveDown(idx: number) {
    if (!regime || idx >= scenarios.length - 1) return;
    const next = scenarios.map((s) => s.id);
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    regime.reorderScenarios(next);
  }

  function handleDragStart(id: string, e: React.DragEvent<HTMLElement>) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox to fire drag events.
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {
      /* noop */
    }
  }

  function handleDragOver(targetId: string, e: React.DragEvent<HTMLElement>) {
    if (!draggingId || targetId === draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTargetId !== targetId) setDropTargetId(targetId);
  }

  function handleDragLeave(targetId: string) {
    if (dropTargetId === targetId) setDropTargetId(null);
  }

  function handleDrop(targetId: string) {
    if (!regime || !draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDropTargetId(null);
      return;
    }
    const ids = scenarios.map((s) => s.id);
    const fromIdx = ids.indexOf(draggingId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) {
      setDraggingId(null);
      setDropTargetId(null);
      return;
    }
    ids.splice(fromIdx, 1);
    // Drop above the target if dragging downward, below if dragging upward —
    // matches the most natural pointer expectation.
    const insertAt = fromIdx < toIdx ? toIdx : toIdx;
    ids.splice(insertAt, 0, draggingId);
    regime.reorderScenarios(ids);
    setDraggingId(null);
    setDropTargetId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTargetId(null);
  }

  function handleHandleKey(idx: number, e: React.KeyboardEvent) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveUp(idx);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveDown(idx);
    }
  }

  function exportAll() {
    if (typeof window === "undefined" || scenarios.length === 0) return;
    const json = exportScenariosToJson(scenarios);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedExportFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function openImportPicker() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file || !regime) return;
    try {
      const text = await file.text();
      const parsed = importScenariosFromJson(text);
      if (!parsed || parsed.length === 0) {
        setImportError("Couldn't read any scenarios from that file.");
        return;
      }
      setImportPreview({
        count: parsed.length,
        apply: () => {
          regime.replaceScenarios(parsed);
          setImportPreview(null);
        },
      });
    } catch {
      setImportError("Couldn't read that file.");
    }
  }

  function tryDelete(id: string) {
    if (confirmingDeleteId === id) {
      regime?.deleteScenario(id);
      setConfirmingDeleteId(null);
    } else {
      setConfirmingDeleteId(id);
    }
  }

  async function shareScenario(id: string) {
    const s = scenarios.find((x) => x.id === id);
    if (!s) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = buildShareUrl(s.inputs, s.name, origin);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
    } catch {
      // Fallback for browsers without the Clipboard API — render a
      // proper in-app modal with the URL pre-selected.
      setFallbackUrl(url);
    }
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden />
      <aside
        className={styles.drawer}
        role="dialog"
        aria-label="Pinned scenarios"
      >
        <header className={styles.head}>
          <span className={styles.headTitle}>Pinned scenarios</span>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className={styles.pinRow}>
          <label htmlFor="pin-name" className={styles.pinLabel}>
            Pin current regime as
          </label>
          <div className={styles.pinControls}>
            <input
              id="pin-name"
              type="text"
              value={pinName}
              onChange={(e) => {
                setPinName(e.target.value);
                if (pinError) setPinError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isPinDisabled()) submitPin();
              }}
              placeholder="e.g. Soft-landing 2026"
              className={styles.pinInput}
              disabled={isFull || !!currentMatches}
            />
            <button
              type="button"
              onClick={submitPin}
              disabled={isPinDisabled()}
              className={styles.pinBtn}
            >
              Pin
            </button>
          </div>
          {currentMatches && (
            <div className={styles.pinNote}>
              Current regime matches{" "}
              <em className={styles.pinNoteEm}>{currentMatches.name}</em>.
            </div>
          )}
          {isFull && (
            <div className={styles.pinError}>
              You&apos;ve reached the {MAX_SCENARIOS}-scenario cap. Delete one
              to add another.
            </div>
          )}
          {pinError && <div className={styles.pinError}>{pinError}</div>}
        </div>

        <div className={styles.list}>
          {scenarios.length === 0 ? (
            <p className={styles.empty}>
              No scenarios yet. Configure the regime, then pin it above.
            </p>
          ) : (
            scenarios.map((s, idx) => {
              const isEditing = editingId === s.id;
              const isConfirming = confirmingDeleteId === s.id;
              const isDragging = draggingId === s.id;
              const isDropTarget = dropTargetId === s.id;
              return (
                <div
                  key={s.id}
                  className={`${styles.row} ${
                    isDragging ? styles.rowDragging : ""
                  } ${isDropTarget ? styles.rowDropTarget : ""}`}
                  onDragOver={(e) => handleDragOver(s.id, e)}
                  onDragLeave={() => handleDragLeave(s.id)}
                  onDrop={() => handleDrop(s.id)}
                >
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(s.id, e)}
                    onDragEnd={handleDragEnd}
                    onKeyDown={(e) => handleHandleKey(idx, e)}
                    className={styles.dragHandle}
                    aria-label={`Reorder ${s.name} (drag, or use arrow keys)`}
                    title="Drag to reorder · arrow keys also work"
                  >
                    <span aria-hidden>⋮⋮</span>
                  </button>

                  <div className={styles.rowName}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        onBlur={commitEdit}
                        autoFocus
                        className={styles.editInput}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(s.id, s.name)}
                        className={styles.nameBtn}
                        title="Click to rename"
                      >
                        {s.name}
                      </button>
                    )}
                    <div className={styles.rowMeta}>
                      i {s.inputs.inflation.toFixed(1)}% · f{" "}
                      {s.inputs.fedFunds.toFixed(1)}% · u{" "}
                      {s.inputs.unemployment.toFixed(1)}% · sloos{" "}
                      {s.inputs.sloos.toFixed(0)}
                    </div>
                  </div>

                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      onClick={() => regime.applyScenario(s.id)}
                      className={styles.applyBtn}
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => shareScenario(s.id)}
                      className={styles.shareBtn}
                      title="Copy share URL"
                    >
                      {copiedId === s.id ? "Copied!" : "Share"}
                    </button>
                    <button
                      type="button"
                      onClick={() => tryDelete(s.id)}
                      onBlur={() => setConfirmingDeleteId(null)}
                      className={`${styles.deleteBtn} ${
                        isConfirming ? styles.deleteBtnConfirming : ""
                      }`}
                      aria-label={`Delete ${s.name}`}
                    >
                      {isConfirming ? "Delete?" : "✕"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className={styles.foot}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className={styles.fileInputHidden}
            tabIndex={-1}
            aria-hidden
          />
          <button
            type="button"
            onClick={exportAll}
            disabled={scenarios.length === 0}
            className={styles.footBtn}
          >
            Export ({scenarios.length})
          </button>
          <button
            type="button"
            onClick={openImportPicker}
            className={styles.footBtn}
          >
            Import…
          </button>
          {importError && (
            <span className={styles.footError}>{importError}</span>
          )}
        </footer>

        {importPreview && (
          <div
            className={styles.confirmOverlay}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm scenario import"
          >
            <div className={styles.confirmCard}>
              <p className={styles.confirmBody}>
                Import <strong>{importPreview.count}</strong>{" "}
                {importPreview.count === 1 ? "scenario" : "scenarios"}? This
                will <strong>replace</strong> your current{" "}
                {scenarios.length} pinned.
              </p>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  onClick={() => setImportPreview(null)}
                  className={styles.footBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={importPreview.apply}
                  className={`${styles.footBtn} ${styles.confirmPrimary}`}
                >
                  Replace &amp; import
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
      {fallbackUrl && (
        <CopyUrlFallback
          url={fallbackUrl}
          onClose={() => setFallbackUrl(null)}
        />
      )}
    </>
  );

  function isPinDisabled(): boolean {
    return !pinName.trim() || isFull || !!currentMatches;
  }
}

function approxEq(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.05;
}
