#!/usr/bin/env node
/**
 * Build a plain-text corpus of MDX node bodies for the Cmd-K search.
 *
 * Reads every content/nodes/*.mdx, strips JSX/imports/exports/attributes,
 * collapses whitespace, and emits lib/search-corpus.generated.ts as a typed
 * Record<nodeId, string>.
 *
 * Run via `pnpm build:corpus` or as a prebuild step. The output is committed
 * so production builds don't need to run this script — it's only a tooling
 * shortcut.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const NODES_DIR = join(ROOT, "content/nodes");
const OUT = join(ROOT, "lib/search-corpus.generated.ts");

/**
 * Extract plain text from an MDX source. Naive but effective for the
 * structured MDX files in this codebase (no exotic JSX).
 */
function extractText(src) {
  let s = src;

  // Remove import / export statements (including multi-line).
  s = s.replace(/^(import|export)\s+[^;]*;?\s*$/gm, "");
  // Remove export const X = (...);
  s = s.replace(/export\s+const\s+\w+\s*=[\s\S]*?\n\);/g, " ");

  // Remove JSX/HTML comments {/* ... */} and <!-- ... -->
  s = s.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");

  // Remove JSX expressions {...} — including multi-line. Keep this BEFORE
  // tag stripping because tag attrs use {...}.
  s = removeBalancedBraces(s);

  // Remove HTML/JSX tags. Keep their text content.
  s = s.replace(/<\/?[A-Za-z][^>]*>/g, " ");

  // Collapse HTML entities to their text. `&amp;` is decoded LAST so we
  // never re-introduce another decodable entity from an already-encoded
  // source (e.g. `&amp;lt;` must stay as `&lt;`, not become `<`).
  s = s
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

  // Collapse whitespace.
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Strip all balanced { ... } expressions (one pass per nesting depth).
 * Handles attribute values, JSX children, and frontmatter constructs.
 */
function removeBalancedBraces(s) {
  let out = "";
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") {
      depth++;
      continue;
    }
    if (ch === "}") {
      if (depth > 0) depth--;
      continue;
    }
    if (depth === 0) out += ch;
  }
  return out;
}

function main() {
  const files = readdirSync(NODES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .sort();

  const corpus = {};
  let totalChars = 0;
  for (const file of files) {
    const id = file.replace(/\.mdx$/, "");
    const src = readFileSync(join(NODES_DIR, file), "utf8");
    const text = extractText(src);
    corpus[id] = text;
    totalChars += text.length;
  }

  const banner = `/**
 * AUTO-GENERATED — do not edit.
 *
 * Plain-text bodies of every MDX node, used by lib/search.ts to extend
 * search past title + pocket + track name. Regenerate via:
 *
 *   pnpm build:corpus
 *
 * Committed to git so production builds (and CI) don't need to re-run
 * the extractor.
 */`;

  const entries = Object.entries(corpus)
    .map(([id, text]) => `  "${id}": ${JSON.stringify(text)},`)
    .join("\n");

  const body = `${banner}

export const SEARCH_CORPUS: Record<string, string> = {
${entries}
};
`;

  writeFileSync(OUT, body);
  console.log(
    `✓ wrote ${OUT.replace(ROOT + "/", "")} — ${files.length} nodes, ${totalChars.toLocaleString()} chars`,
  );
}

main();
