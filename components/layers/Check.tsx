"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import styles from "./check.module.css";

export interface CheckOption {
  label: string;
  /** Mark the option that's correct. Exactly one option should set this. */
  correct?: boolean;
  /** Shown when this option is selected — why it's right, or why it isn't. */
  explain: string;
}

export interface CheckProps {
  question: string;
  options: CheckOption[];
  /** Optional pointer back into the brief for re-reading. */
  seeAlso?: { href: string; label: string };
}

/**
 * Inline comprehension check rendered at the end of an L3 body. The reader
 * picks an option; the component reveals correctness per-option and shows
 * the per-option explanation. No persistence — each instance is its own
 * little self-test.
 */
export function Check({ question, options, seeAlso }: CheckProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [analyticsFired, setAnalyticsFired] = useState(false);
  const legendId = useId();
  const groupName = useId();
  const pathname = usePathname();

  const correctIndex = useMemo(
    () => options.findIndex((o) => o.correct === true),
    [options],
  );
  const correctLabel = correctIndex >= 0 ? options[correctIndex].label : "";

  function reveal() {
    if (picked === null || revealed) return;
    setRevealed(true);
    if (!analyticsFired) {
      const match = pathname?.match(/\/nodes\/([A-Za-z0-9]+)/);
      const nodeId = match ? match[1].toUpperCase() : "unknown";
      track("check_attempt", {
        node: nodeId,
        correct: picked === correctIndex,
      });
      setAnalyticsFired(true);
    }
  }

  function reset() {
    setPicked(null);
    setRevealed(false);
  }

  return (
    <section className={styles.widget} aria-labelledby={legendId}>
      <div className={styles.eyebrow}>Check yourself</div>
      <fieldset className={styles.fieldset}>
        <legend id={legendId} className={styles.question}>
          {question}
        </legend>
        <div className={styles.options}>
          {options.map((opt, i) => {
            const isPicked = picked === i;
            const isCorrect = opt.correct === true;
            const cls = [
              styles.option,
              isPicked ? styles.optionPicked : "",
              revealed && isPicked && isCorrect ? styles.optionCorrect : "",
              revealed && isPicked && !isCorrect ? styles.optionIncorrect : "",
              revealed && !isPicked && isCorrect ? styles.optionRevealedCorrect : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <label key={i} className={cls}>
                <input
                  type="radio"
                  name={groupName}
                  value={i}
                  checked={isPicked}
                  disabled={revealed}
                  onChange={() => setPicked(i)}
                  className={styles.radio}
                />
                <span className={styles.optionLabel}>{opt.label}</span>
                {revealed && isPicked && (
                  <span className={styles.optionExplain}>{opt.explain}</span>
                )}
              </label>
            );
          })}
        </div>

        <div className={styles.actions}>
          {!revealed ? (
            <button
              type="button"
              className={styles.button}
              onClick={reveal}
              disabled={picked === null}
            >
              Check answer
            </button>
          ) : (
            <button type="button" className={styles.button} onClick={reset}>
              Try again
            </button>
          )}
        </div>

        {revealed && (
          <div
            className={styles.reveal}
            aria-live="polite"
            role="status"
          >
            {picked === correctIndex ? (
              <>
                <strong className={styles.revealCorrect}>Correct.</strong>{" "}
                {options[correctIndex].explain}
              </>
            ) : (
              <>
                <strong className={styles.revealIncorrect}>
                  Not quite.
                </strong>{" "}
                The answer is <em>{correctLabel}</em>.{" "}
                {options[correctIndex]?.explain}
                {seeAlso && (
                  <>
                    {" "}
                    <Link href={seeAlso.href} className={styles.revealLink}>
                      Re-read {seeAlso.label} →
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </fieldset>
    </section>
  );
}
