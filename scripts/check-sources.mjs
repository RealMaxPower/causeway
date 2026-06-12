#!/usr/bin/env node
/**
 * scripts/check-sources.mjs
 *
 * HEAD-requests every URL in lib/sources.ts and reports broken links.
 * Exits non-zero when any source is unreachable so CI can gate on it.
 *
 * Usage: pnpm check:sources
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(__dirname, "..", "lib", "sources.ts");

// Extract URLs from sources.ts without compiling TS. The grammar is regular
// enough that a regex over the literal entries is reliable: every entry has
// a single `url: "https://…"` line.
const file = readFileSync(sourcePath, "utf8");
const urlRe = /url:\s*"(https?:\/\/[^"]+)"/g;
const urls = [...file.matchAll(urlRe)].map((m) => m[1]);

if (urls.length === 0) {
  console.error("No URLs found in lib/sources.ts — regex change?");
  process.exit(2);
}

const idRe = /id:\s*"([a-z0-9-]+)"/g;
const ids = [...file.matchAll(idRe)].map((m) => m[1]);

console.log(`Checking ${urls.length} source URLs…\n`);

// Send a real-looking User-Agent. Several official-data hosts (FRED notably)
// reject default-fetch requests with no UA; this avoids false negatives.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; Causeway/0.3; +https://github.com/RealMaxPower/Causeway)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

// Hosts that issue a 403 (or refuse the connection outright, returning
// status 0 with `fetch failed`) to any automated request as anti-scraping.
// Treat such responses from these hosts as "reachable but blocked" —
// surfacing a softer warning instead of failing the whole check. Status 0
// for these hosts is usually Cloudflare/Akamai dropping the TLS handshake
// when the User-Agent looks like Node's default fetch.
const ANTI_BOT_HOSTS = new Set([
  "www.jstor.org",
  "www.piie.com",
  "crsreports.congress.gov",
  "www.oecd.org",
  "www.mhpbooks.com",
  "www.bls.gov",
  "www.simonandschuster.com",
  "academic.oup.com",
  "mitpress.mit.edu",
  "www.iea.org",
  // Round 6 additions
  "www.nber.org",
  "www.aeaweb.org",
  "www.imf.org",
  "www.wto.org",
  "www.bis.org",
  "www.cambridge.org",
  "press.uchicago.edu",
  "www.sciencedirect.com",
  "www.conference-board.org",
  "corporate.vanguard.com",
  "www.pm-research.com",
  "thenewpress.com",
  "www.edmunds.com",
  "vaclavsmil.com",
  "www.hup.harvard.edu",
  "www.cbo.gov",
  "www.worldcat.org",
  "www.aqr.com",
  // Round 7: think-tank pages that 403 GitHub Actions' cloud IPs but
  // resolve 200 for browsers.
  "www.bruegel.org",
]);

let failed = 0;
let antiBot = 0;

async function checkOne(url, id) {
  try {
    // Try HEAD first; fall back to GET because some publishers reject HEAD.
    let res = await fetch(url, { method: "HEAD", redirect: "follow", headers: HEADERS });
    if (!res.ok && res.status !== 405) {
      res = await fetch(url, { method: "GET", redirect: "follow", headers: HEADERS });
    }
    const host = new URL(url).host;
    if (!res.ok && res.status === 403 && ANTI_BOT_HOSTS.has(host)) {
      return { id, url, ok: true, status: res.status, antiBot: true };
    }
    return { id, url, ok: res.ok, status: res.status };
  } catch {
    // Connect-level failure (Cloudflare TLS drop, DNS, etc). Retry once
    // with GET in case HEAD specifically was rejected. If that also throws,
    // treat allowlisted hosts as anti-bot — the URL is still canonical.
    try {
      const res = await fetch(url, { method: "GET", redirect: "follow", headers: HEADERS });
      const host = new URL(url).host;
      if (!res.ok && res.status === 403 && ANTI_BOT_HOSTS.has(host)) {
        return { id, url, ok: true, status: res.status, antiBot: true };
      }
      return { id, url, ok: res.ok, status: res.status };
    } catch (err2) {
      const host = (() => {
        try { return new URL(url).host; } catch { return ""; }
      })();
      if (ANTI_BOT_HOSTS.has(host)) {
        return { id, url, ok: true, status: 0, antiBot: true };
      }
      return {
        id,
        url,
        ok: false,
        status: 0,
        error: err2 instanceof Error ? err2.message : String(err2),
      };
    }
  }
}

// Limit concurrency to avoid parallel-fetch flakiness (Cloudflare/Akamai
// drop bursts of N+ TLS handshakes from the same IP). Batch of 8 keeps the
// run fast while staying under most rate caps.
const CONCURRENCY = 8;
const results = [];
for (let i = 0; i < urls.length; i += CONCURRENCY) {
  const batch = urls.slice(i, i + CONCURRENCY);
  const idBatch = ids.slice(i, i + CONCURRENCY);
  const batchResults = await Promise.all(
    batch.map((url, j) => checkOne(url, idBatch[j] ?? "?")),
  );
  results.push(...batchResults);
}

for (const r of results) {
  const tag = r.antiBot ? "WARN" : r.ok ? "  ok" : "FAIL";
  const detail = r.error ? ` (${r.error})` : r.antiBot ? " (anti-bot · skipped)" : "";
  console.log(`[${tag}] ${String(r.status).padStart(3, " ")}  ${r.id}  ${r.url}${detail}`);
  if (!r.ok) failed++;
  if (r.antiBot) antiBot++;
}

console.log(`\n${results.length - failed} ok (${antiBot} anti-bot), ${failed} broken.`);
process.exit(failed === 0 ? 0 : 1);
