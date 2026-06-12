import type { ReactNode } from "react";
import styles from "./layers.module.css";

interface TermProps {
  /** One-line plain-language definition. Surfaces on hover and long-press. */
  def: string;
  children: ReactNode;
}

/**
 * Inline glossary tooltip. Wraps an academic word with its plain-language
 * meaning so the reader can decode it in place. Uses a real `<abbr>` for
 * native hover + iOS long-press behavior — no positioning JS to ship.
 *
 *   <Term def="The stuff money is made of — gold, paper, a database row.">
 *     substrate
 *   </Term>
 */
export function Term({ def, children }: TermProps) {
  return (
    <abbr title={def} className={styles.term}>
      {children}
    </abbr>
  );
}
