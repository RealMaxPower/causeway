/** Server-only FRED observations with validated, explicitly dated fallbacks.
 * Observation dates identify periods, not publication/revision timestamps.
 * https://fred.stlouisfed.org/docs/api/fred/series_observations.html
 */
import "server-only";

export interface FredObservation {
  date: string;
  /** FRED's "." missing-value marker becomes null, never zero. */
  value: number | null;
}

export type FredSource = "fred" | "fallback" | "unavailable";
export type FredFallbackReason = "missing-key" | "timeout" | "request-failed" | "invalid-response" | "insufficient-history";
export interface FredSeries {
  id: string;
  observations: FredObservation[];
  /** Local attempt time; a cached response may have been retrieved earlier. */
  checkedAt: string;
  observationDate: string | null;
  source: FredSource;
  fallbackReason: FredFallbackReason | null;
}

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";
const REVALIDATE_SECONDS = 60 * 60 * 6;
export const FRED_TIMEOUT_MS = 8_000;

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validObservation(value: unknown): value is FredObservation {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return validDate(row.date) && (row.value === null || (typeof row.value === "number" && Number.isFinite(row.value)));
}

/** Reject malformed/ambiguous rows instead of quietly promoting older values. */
function validateObservations(rows: unknown, asOf: string): FredObservation[] | null {
  if (!Array.isArray(rows)) return null;
  const dates = new Set<string>();
  const observations: FredObservation[] = [];
  for (const row of rows) {
    if (!validObservation(row) || row.date > asOf || dates.has(row.date)) return null;
    dates.add(row.date);
    observations.push({ date: row.date, value: row.value });
  }
  return observations.sort((a, b) => b.date.localeCompare(a.date));
}

/** Strict documented JSON shape; accepts only complete finite numeric strings. */
export function parseFredResponse(json: unknown, asOf = new Date().toISOString().slice(0, 10)): FredObservation[] | null {
  if (typeof json !== "object" || json === null || !validDate(asOf)) return null;
  const rows = (json as Record<string, unknown>).observations;
  if (!Array.isArray(rows)) return null;
  const observations: FredObservation[] = [];
  for (const row of rows) {
    if (typeof row !== "object" || row === null || typeof row.value !== "string") return null;
    let value: number | null = null;
    if (row.value !== ".") {
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(row.value)) return null;
      value = Number(row.value);
      if (!Number.isFinite(value)) return null;
    }
    observations.push({ date: row.date, value });
  }
  return validateObservations(observations, asOf);
}

/** Newest finite observation, regardless of caller ordering. Zero is valid. */
export function latest(observations: FredObservation[]): FredObservation | null {
  let newest: FredObservation | null = null;
  for (const row of observations) {
    if (validObservation(row) && row.value !== null && (!newest || row.date > newest.date)) newest = row;
  }
  return newest;
}

/** Newest complete CPI YoY pair, with positive indexes exactly one year apart.
 * A newer incomplete period stays in the series but cannot date the YoY value.
 */
export function yoyChange(observations: FredObservation[]): { value: number; date: string } | null {
  let newest: { value: number; date: string } | null = null;
  for (const current of observations) {
    if (!validObservation(current) || current.value === null || current.value <= 0
      || (newest && current.date <= newest.date)) continue;
    const previousDate = `${String(Number(current.date.slice(0, 4)) - 1).padStart(4, "0")}${current.date.slice(4)}`;
    const previous = observations.find((row) => validObservation(row) && row.date === previousDate);
    if (!previous || previous.value === null || previous.value <= 0) continue;
    const value = (current.value / previous.value - 1) * 100;
    if (Number.isFinite(value)) newest = { value, date: current.date };
  }
  return newest;
}

/**
 * Fetch newest observations. CPI callers use the latest complete annual pair;
 * a fallback is selected as a whole series, never spliced into live history.
 */
export async function fetchFredSeries(
  seriesId: string,
  fallback: FredObservation[],
  limit = 24,
  options: { requireYoy?: boolean } = {},
): Promise<FredSeries> {
  const checkedAt = new Date().toISOString();
  const asOf = checkedAt.slice(0, 10);
  const usable = (observations: FredObservation[]) => options.requireYoy ? yoyChange(observations) : latest(observations);
  const recover = (reason: FredFallbackReason): FredSeries => {
    const observations = validateObservations(fallback, asOf);
    const observation = observations && usable(observations);
    return { id: seriesId, observations: observation ? observations! : [], checkedAt,
      observationDate: observation?.date ?? null, source: observation ? "fallback" : "unavailable", fallbackReason: reason };
  };
  const key = process.env.FRED_API_KEY;
  if (!key) return recover("missing-key");

  const query = new URLSearchParams({ series_id: seriesId, api_key: key, file_type: "json", sort_order: "desc", limit: String(limit) });
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("FRED timeout")); }, FRED_TIMEOUT_MS);
  });
  try {
    // The timeout covers response-body parsing too, and bounds even a provider
    // or test transport that does not settle after the abort signal fires.
    const request = (async () => {
      const response = await fetch(`${FRED_BASE}?${query}`, {
        next: { revalidate: REVALIDATE_SECONDS }, signal: controller.signal,
      });
      if (!response.ok) throw new Error("FRED request failed");
      return response.json() as Promise<unknown>;
    })();
    const observations = parseFredResponse(await Promise.race([request, timeout]), asOf);
    if (!observations) return recover("invalid-response");
    const observation = usable(observations);
    if (!observation) return recover("insufficient-history");
    return { id: seriesId, observations, checkedAt, observationDate: observation.date,
      source: "fred", fallbackReason: null };
  } catch {
    return recover(controller.signal.aborted ? "timeout" : "request-failed");
  } finally {
    clearTimeout(timer);
  }
}
