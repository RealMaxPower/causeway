/**
 * Site-wide search over node metadata, MDX body text, and a handful of
 * static pages.
 *
 * Index sources:
 *   - lib/tracks.ts — node id, title, pocket, track name (statically imported)
 *   - lib/search-corpus.generated.ts — extracted prose from every MDX body
 *     (regenerate via `pnpm build:corpus`)
 *
 * Scoring is a small fixed scale tuned to the 43-node catalogue. Body
 * hits are the lowest-weight signal so they only surface a result when
 * the metadata fields didn't match — and never outrank a title/track hit.
 */

import {
  TRACKS,
  TRACK_ORDER,
  type ConceptNode,
  type Track,
  type TrackLetter,
} from "./tracks";
import { SEARCH_CORPUS } from "./search-corpus.generated";

export interface StaticPage {
  /** Route path, e.g. "/regime". */
  href: string;
  /** Display title. */
  title: string;
  /** One-line description, shown like a node pocket. */
  pocket: string;
}

// Hand-maintained; add new top-level routes here when shipped.
export const STATIC_PAGES: StaticPage[] = [
  { href: "/regime", title: "Read the regime now", pocket: "A live snapshot of where the cycle is today — growth, inflation, rates, dollar — with the indicators that matter for the next 12 months." },
  { href: "/compare", title: "Compare countries", pocket: "Put two to four countries side-by-side on GDP, inflation, current account, government debt and other indicators. Live from the World Bank." },
  { href: "/playbook", title: "Build your playbook", pocket: "Turn what you learned into a few decisions you actually act on. Position, hedges, what to watch, what to ignore." },
  { href: "/about", title: "About Causeway", pocket: "Colophon, lineage, three-layer pedagogy, license. Why this exists and how it was built." },
];

export type SearchResultKind = "node" | "static";

export interface SearchResult {
  kind: SearchResultKind;
  href: string;
  /** Eyebrow text shown above the title (e.g. "A3 · Money"). */
  eyebrow: string;
  title: string;
  pocket: string;
  score: number;
  matchedField: "id" | "title" | "track" | "pocket" | "route" | "body";
  /** Only set for node results. */
  node?: ConceptNode;
  track?: Track;
  trackLetter?: TrackLetter;
}

const WEIGHT = {
  idExact: 1000,
  idContains: 60,
  titlePrefix: 80,
  titleContains: 50,
  trackContains: 25,
  pocketContains: 10,
  routeContains: 40,
  bodyContains: 4,
} as const;

function tokenise(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Score a node against a single token. Returns 0 if the token doesn't
 * appear in any indexed field. Multiple matches stack additively, so
 * a token in the title AND pocket scores higher than a title-only hit.
 */
function scoreNodeToken(
  node: ConceptNode,
  track: Track,
  token: string,
): { score: number; field: SearchResult["matchedField"] } {
  const idL = node.id.toLowerCase();
  const titleL = node.title.toLowerCase();
  const pocketL = node.pocket.toLowerCase();
  const trackL = `${track.title} ${track.name} ${track.short}`.toLowerCase();
  const bodyL = (SEARCH_CORPUS[node.id] ?? "").toLowerCase();

  let score = 0;
  // The matched-field tracker starts as null and is set to the strongest
  // field that hits. Body is the weakest field, set only if nothing else did.
  let bestField: SearchResult["matchedField"] | null = null;

  if (idL === token) {
    score += WEIGHT.idExact;
    bestField = "id";
  } else if (idL.includes(token)) {
    score += WEIGHT.idContains;
    bestField = "id";
  }
  if (titleL.startsWith(token)) {
    score += WEIGHT.titlePrefix;
    if (bestField === null) bestField = "title";
  } else if (titleL.includes(token)) {
    score += WEIGHT.titleContains;
    if (bestField === null) bestField = "title";
  }
  if (trackL.includes(token)) {
    score += WEIGHT.trackContains;
    if (bestField === null) bestField = "track";
  }
  if (pocketL.includes(token)) {
    score += WEIGHT.pocketContains;
    if (bestField === null) bestField = "pocket";
  }
  if (bodyL.includes(token)) {
    score += WEIGHT.bodyContains;
    if (bestField === null) bestField = "body";
  }

  // If nothing matched, return the conventional "no hit" — score 0 makes
  // the caller short-circuit and drop the candidate.
  return { score, field: bestField ?? "pocket" };
}

function scoreStaticToken(
  page: StaticPage,
  token: string,
): { score: number; field: SearchResult["matchedField"] } {
  const titleL = page.title.toLowerCase();
  const pocketL = page.pocket.toLowerCase();
  const routeL = page.href.toLowerCase();

  let score = 0;
  let bestField: SearchResult["matchedField"] = "pocket";

  if (routeL.replace("/", "") === token) {
    score += WEIGHT.idExact;
    bestField = "route";
  } else if (routeL.includes(token)) {
    score += WEIGHT.routeContains;
    bestField = "route";
  }
  if (titleL.startsWith(token)) {
    score += WEIGHT.titlePrefix;
    if (bestField === "pocket") bestField = "title";
  } else if (titleL.includes(token)) {
    score += WEIGHT.titleContains;
    if (bestField === "pocket") bestField = "title";
  }
  if (pocketL.includes(token)) {
    score += WEIGHT.pocketContains;
  }

  return { score, field: bestField };
}

export interface SearchOptions {
  /** Restrict results to a single track letter. */
  track?: TrackLetter;
}

/**
 * Returns up to `limit` results, ranked best-first. Multi-token queries
 * use AND semantics — a candidate must match every token in some field.
 */
export function searchNodes(
  query: string,
  limit = 8,
  opts: SearchOptions = {},
): SearchResult[] {
  const tokens = tokenise(query);
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];
  const trackFilter = opts.track;

  for (const letter of TRACK_ORDER) {
    if (trackFilter && letter !== trackFilter) continue;
    const track = TRACKS[letter];
    for (const node of track.nodes) {
      let total = 0;
      let bestField: SearchResult["matchedField"] | null = null;
      let allMatched = true;
      for (const tok of tokens) {
        const r = scoreNodeToken(node, track, tok);
        if (r.score === 0) {
          allMatched = false;
          break;
        }
        total += r.score;
        // Keep the strongest field reported in the result for the UI hint
        if (bestField === null || fieldRank(r.field) > fieldRank(bestField)) {
          bestField = r.field;
        }
      }
      if (allMatched && bestField !== null) {
        results.push({
          kind: "node",
          href: `/nodes/${node.id}`,
          eyebrow: `${node.id} · ${track.short}`,
          title: node.title,
          pocket: node.pocket,
          score: total,
          matchedField: bestField,
          node,
          track,
          trackLetter: letter,
        });
      }
    }
  }

  // Static pages bypass the track filter — they're cross-cutting routes
  // that are useful regardless of which track the user has narrowed to.
  if (trackFilter) {
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  for (const page of STATIC_PAGES) {
    let total = 0;
    let bestField: SearchResult["matchedField"] | null = null;
    let allMatched = true;
    for (const tok of tokens) {
      const r = scoreStaticToken(page, tok);
      if (r.score === 0) {
        allMatched = false;
        break;
      }
      total += r.score;
      if (bestField === null || fieldRank(r.field) > fieldRank(bestField)) {
        bestField = r.field;
      }
    }
    if (allMatched && bestField !== null) {
      results.push({
        kind: "static",
        href: page.href,
        eyebrow: page.href,
        title: page.title,
        pocket: page.pocket,
        score: total,
        matchedField: bestField,
      });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable tiebreak: prefer node over static, then track letter, then id/href.
    if (a.kind !== b.kind) return a.kind === "node" ? -1 : 1;
    if (a.trackLetter && b.trackLetter && a.trackLetter !== b.trackLetter) {
      return a.trackLetter < b.trackLetter ? -1 : 1;
    }
    return a.href < b.href ? -1 : a.href > b.href ? 1 : 0;
  });

  return results.slice(0, limit);
}

function fieldRank(f: SearchResult["matchedField"]): number {
  switch (f) {
    case "id": return 6;
    case "route": return 5;
    case "title": return 4;
    case "track": return 3;
    case "pocket": return 2;
    case "body": return 1;
  }
}
