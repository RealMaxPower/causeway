/**
 * Causeway · FRED data fetcher.
 *
 * Server-only. Wraps the public FRED observations endpoint with Next.js's
 * extended fetch cache (revalidate every 6h — FRED series publish on
 * monthly/quarterly cadence, anything tighter is wasted work).
 *
 * When FRED_API_KEY is unset, or the upstream fails, falls back to the
 * caller-supplied snapshot and labels the read as `fallback`. The dashboard
 * surfaces this honestly rather than pretending stale data is live.
 */

import "server-only";

export interface FredObservation {
  /** ISO date (YYYY-MM-DD) of the observation period start. */
  date: string;
  /** Numeric value, or null for missing periods (FRED uses "." in JSON). */
  value: number | null;
}

export type FredSource = "fred" | "fallback";

export interface FredSeries {
  id: string;
  observations: FredObservation[];
  fetchedAt: string;
  source: FredSource;
}

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";
const REVALIDATE_SECONDS = 60 * 60 * 6;

/**
 * Fetch the most recent `limit` observations of a FRED series, newest-first.
 * Provide `fallback` so the dashboard always renders even without an API key.
 */
export async function fetchFredSeries(
  seriesId: string,
  fallback: FredObservation[],
  limit = 24,
): Promise<FredSeries> {
  const key = process.env.FRED_API_KEY;
  const fetchedAt = new Date().toISOString();

  if (!key) {
    return { id: seriesId, observations: fallback, fetchedAt, source: "fallback" };
  }

  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=${limit}`;

  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`FRED ${seriesId} ${res.status}`);
    const json = (await res.json()) as {
      observations: { date: string; value: string }[];
    };
    return {
      id: seriesId,
      observations: json.observations.map((o) => ({
        date: o.date,
        value: o.value === "." ? null : parseFloat(o.value),
      })),
      fetchedAt,
      source: "fred",
    };
  } catch {
    return { id: seriesId, observations: fallback, fetchedAt, source: "fallback" };
  }
}

/** Newest non-null observation. */
export function latest(obs: FredObservation[]): FredObservation | null {
  return obs.find((o) => o.value !== null) ?? null;
}

/**
 * YoY % change from a descending monthly series. Walks back from the newest
 * non-null observation to the one exactly 12 calendar months earlier.
 */
export function yoyChange(
  obs: FredObservation[],
): { value: number; date: string } | null {
  const newest = latest(obs);
  if (!newest || newest.value === null) return null;

  const nd = new Date(newest.date + "T00:00:00Z");
  for (const o of obs) {
    if (o.value === null) continue;
    const d = new Date(o.date + "T00:00:00Z");
    const months =
      (nd.getUTCFullYear() - d.getUTCFullYear()) * 12 +
      (nd.getUTCMonth() - d.getUTCMonth());
    if (months === 12) {
      return {
        value: ((newest.value - o.value) / o.value) * 100,
        date: newest.date,
      };
    }
  }
  return null;
}
