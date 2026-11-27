/** Server-only World Bank client. Annual series retain missingness and provenance. */
import "server-only";

export interface WbObservation {
  /** Four-digit year, as returned by the annual indicators API. */
  date: string;
  value: number | null;
  /** F means forecast; other nonempty provider flags are retained as flagged. */
  status?: "forecast" | "flagged";
}

export type WbSource = "worldbank" | "fallback" | "unavailable";
export type WbFallbackReason = "offline" | "timeout" | "upstream-error" | "invalid-response" | "no-data";

export interface WbSeries {
  indicator: string;
  country: string;
  observations: WbObservation[];
  /** Time this request was handled; the API response may come from the fetch cache. */
  fetchedAt: string;
  source: WbSource;
  sourceUrl: string;
  latestObservationDate: string | null;
  /** API metadata: the source dataset's update date, not an individual observation date. */
  providerUpdatedAt: string | null;
  /** Existing illustrative snapshots have no recorded capture/review date. */
  snapshotUpdatedAt: string | null;
  fallbackReason: WbFallbackReason | null;
  hasGaps: boolean;
}

const WB_BASE = "https://api.worldbank.org/v2";
const REVALIDATE_SECONDS = 60 * 60 * 6;
const TIMEOUT_MS = 8_000;

interface ParsedSeries {
  observations: WbObservation[];
  hasGaps: boolean;
  providerUpdatedAt: string | null;
}

/** Fetch recent annual values without replacing missing years with older values. */
export async function fetchWbSeries(
  indicator: string,
  countryIso3: string,
  fallback: WbObservation[],
  perPage = 30,
): Promise<WbSeries> {
  const count = Number.isFinite(perPage) ? Math.min(100, Math.max(1, Math.floor(perPage))) : 30;
  const sourceUrl = `${WB_BASE}/country/${encodeURIComponent(countryIso3)}/indicator/${encodeURIComponent(indicator)}?format=json&per_page=${count}&mrv=${count}&gapfill=N`;
  const base = { indicator, country: countryIso3, fetchedAt: new Date().toISOString(), sourceUrl };
  const fallbackSeries = (fallbackReason: WbFallbackReason): WbSeries => {
    const parsed = normalizeRows(fallback);
    const latest = latestWb(parsed.observations);
    return {
      ...base,
      observations: parsed.observations,
      source: latest ? "fallback" : "unavailable",
      latestObservationDate: latest?.date ?? null,
      providerUpdatedAt: null,
      snapshotUpdatedAt: null,
      fallbackReason,
      hasGaps: parsed.hasGaps,
    };
  };

  if (process.env.WORLDBANK_OFFLINE === "1") return fallbackSeries("offline");

  try {
    const response = await fetchPayload(sourceUrl);
    if (response.failure) return fallbackSeries(response.failure);
    const parsed = parsePayload(response.json, { indicator, country: countryIso3 });
    if (!parsed) return fallbackSeries("invalid-response");
    const latest = latestWb(parsed.observations);
    if (!latest) return fallbackSeries("no-data");
    return {
      ...base,
      ...parsed,
      source: "worldbank",
      latestObservationDate: latest.date,
      snapshotUpdatedAt: null,
      fallbackReason: null,
    };
  } catch (error) {
    const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    return fallbackSeries(timeout ? "timeout" : "upstream-error");
  }
}

/** Bound both transport and body decoding, including transports that ignore abort. */
async function fetchPayload(url: string): Promise<{ json?: unknown; failure?: WbFallbackReason }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new DOMException("World Bank request timed out", "TimeoutError"));
      controller.abort();
    }, TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      deadline,
      (async () => {
        const response = await fetch(url, {
          next: { revalidate: REVALIDATE_SECONDS },
          signal: controller.signal,
        });
        if (!response.ok) return { failure: "upstream-error" as const };
        try {
          return { json: await response.json() as unknown };
        } catch (error) {
          return { failure: error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)
            ? "timeout" as const : "invalid-response" as const };
        }
      })(),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Error envelopes and empty/malformed data do not count as observations. */
export function parseWbResponse(json: unknown): WbObservation[] | null {
  const parsed = parsePayload(json);
  return parsed?.observations.length ? parsed.observations : null;
}

function parsePayload(json: unknown, expected?: { indicator: string; country: string }): ParsedSeries | null {
  if (!Array.isArray(json) || json.length !== 2 || !isRecord(json[0]) || !Array.isArray(json[1])) return null;
  const [metadata, rows] = json;
  if ("message" in metadata || "error" in metadata) return null;
  // Never silently plot another country or indicator under the requested label.
  if (expected && rows.some((row) => isRecord(row) && (
    !isRecord(row.indicator) || row.indicator.id !== expected.indicator || row.countryiso3code !== expected.country
  ))) return null;
  const normalized = normalizeRows(rows, true);
  return { ...normalized, providerUpdatedAt: isoDate(metadata.lastupdated) };
}

function normalizeRows(rows: unknown[], fromApi = false): Omit<ParsedSeries, "providerUpdatedAt"> {
  const byYear = new Map<string, WbObservation>();
  const conflicts = new Set<string>();
  let hasGaps = false;
  for (const row of rows) {
    if (!isRecord(row) || !isYear(row.date)) {
      hasGaps = true;
      continue;
    }
    const rawStatus = fromApi ? row.obs_status : row.status;
    const statusCode = typeof rawStatus === "string" ? rawStatus.trim() : "";
    const status = statusCode === "F" || (!fromApi && statusCode === "forecast")
      ? "forecast" : statusCode ? "flagged" : undefined;
    const validStatus = rawStatus === undefined || rawStatus === null || typeof rawStatus === "string";
    // A future year must be explicitly identified as a forecast by the provider.
    const validYear = Number(row.date) <= new Date().getUTCFullYear() || status === "forecast";
    const value = validStatus && validYear && typeof row.value === "number" && Number.isFinite(row.value) ? row.value : null;
    if (value === null) hasGaps = true;
    const observation: WbObservation = { date: row.date, value, ...(status && { status }) };
    const previous = byYear.get(row.date);
    if (conflicts.has(row.date) || (previous && (previous.value !== value || previous.status !== status))) {
      conflicts.add(row.date);
      byYear.set(row.date, { date: row.date, value: null });
      hasGaps = true;
    } else {
      byYear.set(row.date, observation);
    }
  }
  const observations = [...byYear.values()].sort((a, b) => Number(b.date) - Number(a.date));
  if (observations.some((row, i) => i > 0 && Number(observations[i - 1].date) - Number(row.date) > 1)) hasGaps = true;
  return { observations, hasGaps };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isYear(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}$/.test(value) && Number(value) > 0;
}

function isoDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

/** Newest finite observation, independent of provider order. Does not mutate input. */
export function latestWb(observations: WbObservation[]): WbObservation | null {
  return observations.reduce<WbObservation | null>((latest, observation) =>
    isYear(observation.date) && observation.value !== null && Number.isFinite(observation.value)
      && (!latest || observation.date > latest.date) ? observation : latest, null);
}
