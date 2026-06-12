"use client";

import Link from "next/link";
import { deriveGuidance, type PlaybookState } from "@/lib/playbook";
import styles from "./playbook.module.css";

interface PlaybookSummaryProps {
  state: PlaybookState;
}

export function PlaybookSummary({ state }: PlaybookSummaryProps) {
  const guidance = deriveGuidance(state);
  const lastEdited = state.lastEditedAt
    ? new Date(state.lastEditedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <section className={styles.summary}>
      <div className={styles.summaryHead}>
        <h2 className={styles.summaryTitle}>Your playbook</h2>
        <div className={styles.summaryMeta}>
          {guidance.completed} of {guidance.total} axes answered
          {lastEdited ? ` · ${lastEdited}` : ""}
        </div>
      </div>

      {guidance.bullets.length === 0 ? (
        <p className={styles.summaryEmpty}>
          Answer at least one axis above to see your playbook here. The
          summary updates as you make choices.
        </p>
      ) : (
        <ul className={styles.summaryBullets}>
          {guidance.bullets.map((b) => (
            <li key={b.axis} className={styles.summaryBullet}>
              <div className={styles.summaryAxis}>
                <Link href={b.nodeRef} className="no-underline" style={{ color: "inherit" }}>
                  {b.axis}
                </Link>
              </div>
              <div className={styles.summaryChoice}>{b.choiceLabel}</div>
              <div className={styles.summaryBlurb}>{b.blurb}</div>
            </li>
          ))}
        </ul>
      )}

      {state.notes.trim().length > 0 && (
        <div className={styles.summaryNotes}>
          <h3>Your notes</h3>
          {state.notes}
        </div>
      )}

      <div className={styles.summaryFoot}>
        Generated from <em>Causeway</em>. Directional defaults, not advice.
      </div>
    </section>
  );
}
