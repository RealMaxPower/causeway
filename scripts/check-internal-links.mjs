#!/usr/bin/env node
/**
 * scripts/check-internal-links.mjs
 *
 * Walks every content/nodes/*.mdx and verifies that every internal
 * reference resolves:
 *
 *   - href="/nodes/<id>"          (inline anchors)
 *   - <Callout link={{ to: "/nodes/<id>", ... }}/>
 *   - <Check seeAlso={{ href: "/nodes/<id>?l=N", ... }}/>
 *   - meta.relatedNodes: ["<id>", ...]
 *   - <Cite id="<source-id>"/>
 *   - <Sources ids={["<source-id>", ...]} .../>
 *
 * Node ids are validated against the catalogue in lib/tracks.ts. Source
 * ids are validated against the SOURCES map in lib/sources.ts.
 *
 * Exits non-zero on any unresolved reference so CI can gate on it.
 *
 * Usage: pnpm check:links
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const nodesDir = join(repoRoot, "content", "nodes");

/* -------- Catalogues -------- */

// Node ids: every <id>.mdx file under content/nodes/. We use filenames
// (not lib/tracks.ts) so an MDX file that exists but isn't registered in
// tracks.ts still counts as resolvable — registering the node is a
// separate concern from internal-link integrity.
const validNodeIds = new Set(
  readdirSync(nodesDir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, "").toUpperCase()),
);

// Source ids: parse lib/sources.ts via the same regex check-sources.mjs uses.
const sourcesPath = join(repoRoot, "lib", "sources.ts");
const sourcesFile = readFileSync(sourcesPath, "utf8");
const validSourceIds = new Set(
  [...sourcesFile.matchAll(/id:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]),
);

/* -------- Patterns -------- */

// /nodes/<id> in any context (href, Callout link.to, Check seeAlso, etc.)
const NODE_REF = /\/nodes\/([A-Za-z][0-9]+)/g;

// <Cite id="..."/>
const CITE_ID = /<Cite\b[^>]*\sid=["']([a-z0-9-]+)["']/g;

// <Sources ids={[...]}/>. We extract the array body then split on commas
// and strip quotes — handles multi-line ids arrays produced by Prettier.
const SOURCES_IDS = /<Sources\b[^/>]*\bids=\{\s*\[([\s\S]*?)\]\s*\}/g;

// meta.relatedNodes: ["X", "Y"]
const RELATED_NODES = /relatedNodes\s*:\s*\[([\s\S]*?)\]/g;

/* -------- Checker -------- */

const failures = [];

function add(file, kind, ref, message) {
  failures.push({ file, kind, ref, message });
}

function parseIds(arrayBody) {
  return [...arrayBody.matchAll(/["']([^"',\s]+)["']/g)].map((m) => m[1]);
}

const files = readdirSync(nodesDir).filter((f) => f.endsWith(".mdx"));

for (const file of files) {
  const path = join(nodesDir, file);
  const text = readFileSync(path, "utf8");

  // /nodes/<id> references
  for (const m of text.matchAll(NODE_REF)) {
    const id = m[1].toUpperCase();
    if (!validNodeIds.has(id)) {
      add(file, "node-ref", m[0], `Unknown node id "${id}"`);
    }
  }

  // meta.relatedNodes
  for (const m of text.matchAll(RELATED_NODES)) {
    for (const id of parseIds(m[1])) {
      if (!validNodeIds.has(id.toUpperCase())) {
        add(file, "relatedNodes", id, `Unknown node id "${id}"`);
      }
    }
  }

  // <Cite id="..."/>
  for (const m of text.matchAll(CITE_ID)) {
    const id = m[1];
    if (!validSourceIds.has(id)) {
      add(file, "Cite", id, `Unknown source id "${id}" in lib/sources.ts`);
    }
  }

  // <Sources ids={[...]}/>
  for (const m of text.matchAll(SOURCES_IDS)) {
    for (const id of parseIds(m[1])) {
      if (!validSourceIds.has(id)) {
        add(file, "Sources.ids", id, `Unknown source id "${id}" in lib/sources.ts`);
      }
    }
  }
}

/* -------- Report -------- */

console.log(
  `Checked ${files.length} MDX files against ${validNodeIds.size} node ids + ${validSourceIds.size} source ids.\n`,
);

if (failures.length === 0) {
  console.log("All internal references resolve.");
  process.exit(0);
}

for (const f of failures) {
  console.log(`[FAIL] ${f.file}  ${f.kind}=${f.ref}  ${f.message}`);
}
console.log(`\n${failures.length} broken reference${failures.length === 1 ? "" : "s"}.`);
process.exit(1);
