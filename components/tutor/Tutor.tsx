"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./tutor.module.css";
import { findNode } from "@/lib/tracks";
import { track } from "@/lib/analytics";

/** Replace inline citation tags emitted by the system-prompted tutor with
    React elements: [H3] → in-app link, [Source: who year] → footnote-style
    bracket badge. Preserves surrounding markdown for the rest of the parse. */
function annotate(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\[(H[1-8]|Source:\s+[^\]]+)\]/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tag = m[1];
    if (/^H[1-8]$/i.test(tag)) {
      const id = tag.toUpperCase();
      parts.push(
        <Link key={`${id}-${i++}`} href={`/nodes/${id}`} className={styles.citeLink}>
          {id}
        </Link>,
      );
    } else {
      parts.push(
        <span key={`src-${i++}`} className={styles.citeBadge} title="Source citation">
          {m[0]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Render the bot's message body. User text passes through plain so a typed
    asterisk/underscore never gets re-interpreted as formatting; bot text is
    parsed as GFM markdown. Citation tags are rewritten to in-app links and
    source badges. Raw HTML in the model's output is ignored by react-markdown's
    default (skipHtml) policy, so this is XSS-safe. */
function BotMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        p: ({ children }) => {
          const arr = Array.isArray(children) ? children : [children];
          const rendered = arr.flatMap((c, i) =>
            typeof c === "string"
              ? annotate(c).map((part, j) => (
                  <span key={`${i}-${j}`}>{part}</span>
                ))
              : [<span key={i}>{c as React.ReactNode}</span>],
          );
          return <p>{rendered}</p>;
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

const SUGGESTIONS = [
  "What's the simplest version of this?",
  "Where do honest people disagree?",
  "What's the most common misconception?",
  "How does this affect me?",
] as const;

interface Message {
  role: "user" | "bot";
  text: string;
  /** Optional source-citation suffix, rendered separately. */
  src?: string;
}

interface TutorProps {
  /** Node id like "A3" the tutor is scoped to. */
  nodeId: string;
}

/**
 * Tutor FAB + panel. Scoped to a single node; the API route builds the
 * system prompt server-side so we don't ship pocket text to the client
 * twice. Errors fall back to a static offline message rather than throwing.
 */
export function Tutor({ nodeId }: TutorProps) {
  const found = findNode(nodeId);
  const scopeLabel = found ? `${found.node.id} · ${found.node.title}` : nodeId;

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Message[]>(() => [
    {
      role: "bot",
      text: `Hi — I'm Causeway's tutor. I can answer questions about ${
        found ? found.node.title : "this concept node"
      }. Try a suggested question below, or type your own.`,
      src: `scoped to ${nodeId}`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs, busy]);

  // Lift / hide the FAB when the page footer scrolls into view so it
  // never covers the footer links. The panel (open=true) is full-height
  // and isn't affected.
  useEffect(() => {
    const footer = document.getElementById("page-footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: "0px 0px -8px 0px" },
    );
    obs.observe(footer);
    return () => obs.disconnect();
  }, []);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    track("tutor_ask", { node: nodeId, q_chars: q.length });

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, question: q }),
      });
      if (!res.ok) {
        const offline =
          res.status === 429
            ? "(Tutor at daily budget cap — try again tomorrow.)"
            : "(Tutor offline — I can't reach the model right now. Try again in a moment.)";
        setMsgs((m) => [...m, { role: "bot", text: offline }]);
        return;
      }
      const data = (await res.json()) as { text?: string; error?: string };
      setMsgs((m) => [...m, { role: "bot", text: data.text ?? "" }]);
    } catch {
      setMsgs((m) => [
        ...m,
        {
          role: "bot",
          text: "(Tutor offline — I can't reach the model right now. Try again in a moment.)",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className={`${styles.fab} ${footerVisible ? styles.fabMini : ""}`}
        onClick={() => {
          setOpen(true);
          track("tutor_open", { node: nodeId });
        }}
        aria-label="Open tutor"
        title={footerVisible ? "Ask the tutor" : undefined}
      >
        <span className={styles.glyph}>?</span>
        <span className={styles.fabLabel}>Ask the tutor</span>
      </button>
    );
  }

  return (
    <div className={styles.panel} role="dialog" aria-label="Causeway tutor">
      <div className={styles.head}>
        <div className={styles.headTitle}>
          Causeway <em>tutor</em>
        </div>
        <button
          type="button"
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Close tutor"
        >
          ×
        </button>
      </div>
      <div className={styles.context}>
        <span className={styles.contextPip} aria-hidden />
        Scope · {scopeLabel}
      </div>
      <div className={styles.msgs} ref={scrollRef}>
        {msgs.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? styles.msgUser : styles.msgBot}
          >
            {m.role === "user" ? m.text : <BotMarkdown text={m.text} />}
            {m.src && <span className={styles.src}>{m.src}</span>}
          </div>
        ))}
        {busy && (
          <div className={styles.msgBot}>
            <span className={styles.typing}>
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
      </div>
      <div className={styles.suggest}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            disabled={busy}
          >
            {s}
          </button>
        ))}
      </div>
      <div className={styles.input}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ask(input);
          }}
          placeholder="Ask anything about this node…"
          disabled={busy}
        />
        <button
          type="button"
          onClick={() => ask(input)}
          disabled={busy || !input.trim()}
        >
          Ask
        </button>
      </div>
    </div>
  );
}
