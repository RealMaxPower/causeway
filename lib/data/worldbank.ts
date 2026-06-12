/**
 * Causeway · World Bank data fetcher.
 *
 * Server-only. Wraps the World Bank Data API. No API key required.
 * Cached via Next's fetch with `revalidate: 6h`. Falls back to the
 * caller-supplied snapshot on key-less / upstream-failure paths,
 * surfaced honestly via `source: "fallback"`.
 *
 * Mirrors lib/data/fred.ts in shape so consumers can learn one pattern.
 */

import "server-only";

export interface WbObservation {
  /** Year as ISO-ish string (the WB returns plain year strings like "2024"). */
  date: string;
  value: number | null;
}

export type WbSource = "worldbank" | "fallback";

export interface WbSeries {
  indicator: string;
  country: string;
  observations: WbObservation[];
  fetchedAt: string;
  source: WbSource;
}

const WB_BASE = "https://api.worldbank.org/v2";
const REVALIDATE_SECONDS = 60 * 60 * 6;

interface WbApiObservation {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
}

/**
 * Fetch the most-recent `perPage` observations for one (country, indicator).
 * Observations come back newest-first. `fallback` is returned if the API
 * key is unset, the upstream fails, or the response shape is unexpected.
 */
export async function fetchWbSeries(
  indicator: string,
  countryIso3: string,
  fallback: WbObservation[],
  perPage = 30,
): Promise<WbSeries> {
  const fetchedAt = new Date().toISOString();
  const base = {
    indicator,
    country: countryIso3,
    fetchedAt,
  };

  // Test/CI escape hatch — lets us deterministically exercise the fallback path
  // without hitting the live endpoint.
  if (process.env.WORLDBANK_OFFLINE === "1") {
    return { ...base, observations: fallback, source: "fallback" };
  }

  const url = `${WB_BASE}/country/${encodeURIComponent(countryIso3)}/indicator/${encodeURIComponent(indicator)}?format=json&per_page=${perPage}`;

  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`WB ${indicator}/${countryIso3} ${res.status}`);
    const json: unknown = await res.json();
    const parsed = parseWbResponse(json);
    if (!parsed) throw new Error(`WB ${indicator}/${countryIso3} malformed`);
    return { ...base, observations: parsed, source: "worldbank" };
  } catch {
    return { ...base, observations: fallback, source: "fallback" };
  }
}

/**
 * Defensive parser. World Bank returns `[metadata, dataArray]` for success
 * and `[{ message: [...] }]` or other shapes on error. Verify the shape
 * before accessing `json[1]`.
 */
export function parseWbResponse(json: unknown): WbObservation[] | null {
  if (!Array.isArray(json) || json.length < 2) return null;
  const data = json[1];
  if (!Array.isArray(data)) return null;
  const out: WbObservation[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Partial<WbApiObservation>;
    if (typeof r.date !== "string") continue;
    const value = typeof r.value === "number" ? r.value : null;
    out.push({ date: r.date, value });
  }
  return out;
}

/** Newest non-null observation. */
export function latestWb(obs: WbObservation[]): WbObservation | null {
  return obs.find((o) => o.value !== null) ?? null;
}
