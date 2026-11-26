import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWbSeries, latestWb, parseWbResponse, type WbObservation } from "@/lib/data/worldbank";
import { COUNTRIES, DEFAULT_COUNTRY_CODES, MAX_COUNTRIES, findCountry } from "@/lib/data/worldbank-countries";
import { DEFAULT_INDICATOR_CODES, INDICATORS, MAX_INDICATORS, findIndicator } from "@/lib/data/worldbank-indicators";

const NOW = "2026-11-26T12:00:00.000Z";
const INDICATOR = "NY.GDP.PCAP.CD";
const fallback = [{ date: "2024", value: 120 }];
const row = (date: string, value: unknown, extra = {}) => ({ date, value,
  indicator: { id: INDICATOR }, country: { id: "US" }, countryiso3code: "USA", ...extra });
const payload = (rows: unknown[], metadata = {}) => [{ page: 1, pages: 1, ...metadata }, rows];
const response = (rows: unknown[], metadata = {}) => new Response(JSON.stringify(payload(rows, metadata)));

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(NOW));
  vi.stubEnv("WORLDBANK_OFFLINE", "");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unmocked request"); }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("country + indicator catalogues", () => {
  it("includes the G7 + BRICS + key outliers", () => {
    const codes = COUNTRIES.map((c) => c.iso3);
    for (const iso of ["USA", "GBR", "DEU", "JPN", "CHN", "IND", "BRA", "RUS", "ZAF"]) {
      expect(codes).toContain(iso);
    }
  });

  it("every country entry has a non-empty name and a valid region", () => {
    const regions = new Set(["americas", "europe", "asia", "africa", "oceania"]);
    for (const c of COUNTRIES) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(regions.has(c.region)).toBe(true);
    }
  });

  it("findCountry resolves case-insensitively by iso3", () => {
    expect(findCountry("usa")?.name).toBe("United States");
    expect(findCountry("CHN")?.name).toBe("China");
    expect(findCountry("ZZZ")).toBeUndefined();
  });

  it("indicator catalogue covers the brief's compare set", () => {
    const codes = INDICATORS.map((i) => i.code);
    expect(codes).toContain("NY.GDP.MKTP.CD");
    expect(codes).toContain("NY.GDP.PCAP.CD");
    expect(codes).toContain("FP.CPI.TOTL.ZG");
    expect(codes).toContain("BN.CAB.XOKA.GD.ZS");
  });

  it("findIndicator returns the right entry by exact code", () => {
    expect(findIndicator("FP.CPI.TOTL.ZG")?.short).toBe("Inflation");
    expect(findIndicator("nonsense.code")).toBeUndefined();
  });

  it("defaults all resolve to real catalogue entries", () => {
    for (const iso of DEFAULT_COUNTRY_CODES) {
      expect(findCountry(iso)).toBeDefined();
    }
    for (const code of DEFAULT_INDICATOR_CODES) {
      expect(findIndicator(code)).toBeDefined();
    }
  });

  it("default selections fit within the route limits", () => {
    expect(DEFAULT_COUNTRY_CODES.length).toBeLessThanOrEqual(MAX_COUNTRIES);
    expect(DEFAULT_INDICATOR_CODES.length).toBeLessThanOrEqual(MAX_INDICATORS);
  });
});

describe("World Bank observation parsing", () => {
  it("preserves zero/null, sorts newest first, and does not mutate provider rows", () => {
    const rows = [row("2022", 1.5), row("2024", 0), row("2023", null)];
    expect(parseWbResponse(payload(rows))).toEqual([
      { date: "2024", value: 0 }, { date: "2023", value: null }, { date: "2022", value: 1.5 },
    ]);
    expect(rows[0].date).toBe("2022");
  });

  it.each([null, "bad", {}, [], [null, []], [{}, null], [{}, "bad"], [{}, [], {}],
    [{ error: "bad" }, []], [{ message: [{ id: "120" }] }, []], [{}, []]].map((input) => ({ input })))("rejects empty or malformed envelopes: %j", ({ input }) => {
    expect(parseWbResponse(input)).toBeNull();
  });

  it("keeps malformed values missing rather than coercing them into zeros or partial numbers", () => {
    const values = [null, undefined, NaN, Infinity, -Infinity, "", "0", "3junk", true];
    const result = parseWbResponse(payload(values.map((value, index) => row(String(2025 - index), value))));
    expect(result).toHaveLength(values.length);
    expect(result?.every((observation) => observation.value === null)).toBe(true);
  });

  it("drops malformed years/rows while retaining valid observations", () => {
    expect(parseWbResponse(payload([
      null, [], row("0000", 4), row("2024-01-01", 4), row("2024Q1", 4), row("24", 4),
      { value: 5 }, row("2024", 6), row("2023", -2),
    ]))).toEqual([{ date: "2024", value: 6 }, { date: "2023", value: -2 }]);
  });

  it("deduplicates identical years and keeps conflicting duplicate years missing", () => {
    expect(parseWbResponse(payload([row("2024", 3), row("2024", 3), row("2023", 2)]))).toEqual([
      { date: "2024", value: 3 }, { date: "2023", value: 2 },
    ]);
    for (const rows of [[row("2024", 3), row("2024", 4), row("2024", 3)],
      [row("2024", 3), row("2024", 3, { obs_status: "F" })]]) {
      expect(parseWbResponse(payload(rows))).toEqual([{ date: "2024", value: null }]);
    }
  });

  it("retains provider forecast and other nonempty status flags", () => {
    expect(parseWbResponse(payload([row("2025", 5, { obs_status: "F" }), row("2024", 4, { obs_status: "P" }),
      row("2023", 3, { obs_status: "" })]))).toEqual([
      { date: "2025", value: 5, status: "forecast" }, { date: "2024", value: 4, status: "flagged" }, { date: "2023", value: 3 },
    ]);
  });

  it("requires an explicit forecast flag before a future year can carry a value", () => {
    expect(parseWbResponse(payload([row("2029", 9), row("2028", 8, { obs_status: "P" }),
      row("2027", 7, { obs_status: " F " }), row("2026", 6)]))).toEqual([
      { date: "2029", value: null }, { date: "2028", value: null, status: "flagged" },
      { date: "2027", value: 7, status: "forecast" }, { date: "2026", value: 6 },
    ]);
  });

  it("does not treat a malformed provider status as a normal observed value", () => {
    for (const obs_status of [true, 1, {}, []]) {
      expect(parseWbResponse(payload([row("2024", 4, { obs_status })]))).toEqual([{ date: "2024", value: null }]);
    }
  });

  it("latestWb finds the newest finite observation independently of array order", () => {
    const observations = [{ date: "2022", value: 5 }, { date: "2024", value: 0 }, { date: "2025", value: null }];
    expect(latestWb(observations)).toEqual({ date: "2024", value: 0 });
    expect(observations[0].date).toBe("2022");
    expect(latestWb([{ date: "2025", value: NaN }, { date: "2024", value: Infinity }, { date: "bad", value: 3 }])).toBeNull();
  });
});

describe("World Bank fetch and provenance", () => {
  it("requests bounded recent periods with gap filling disabled and records three distinct dates", async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(response([row("2024", 0)], { lastupdated: "2026-11-15" }));
    vi.stubGlobal("fetch", mock);
    const series = await fetchWbSeries(INDICATOR, "USA", fallback);
    expect(series).toMatchObject({ source: "worldbank", observations: [{ date: "2024", value: 0 }],
      fetchedAt: NOW, latestObservationDate: "2024", providerUpdatedAt: "2026-11-15", snapshotUpdatedAt: null,
      fallbackReason: null, hasGaps: false });
    const [url, options] = mock.mock.calls[0];
    expect(series.sourceUrl).toBe(String(url));
    expect(new URL(String(url)).searchParams.get("mrv")).toBe("30");
    expect(new URL(String(url)).searchParams.get("gapfill")).toBe("N");
    expect(options?.next?.revalidate).toBe(21600);
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([[0, "1"], [1000, "100"], [NaN, "30"], [Infinity, "30"], [25.5, "25"]] as const)("bounds perPage %s to %s", async (perPage, expected) => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(response([row("2024", 2)]));
    vi.stubGlobal("fetch", mock);
    await fetchWbSeries(INDICATOR, "USA", fallback, perPage);
    const params = new URL(String(mock.mock.calls[0][0])).searchParams;
    expect(params.get("per_page")).toBe(expected);
    expect(params.get("mrv")).toBe(expected);
  });

  it("labels partial observations as gapped without pretending the fallback is live data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([row("2025", null), row("2024", "broken"), row("2022", 100)])));
    const series = await fetchWbSeries(INDICATOR, "USA", fallback);
    expect(series).toMatchObject({ source: "worldbank", latestObservationDate: "2022", hasGaps: true, fallbackReason: null });
    expect(series.observations).toEqual([{ date: "2025", value: null }, { date: "2024", value: null }, { date: "2022", value: 100 }]);
  });

  it("keeps missing annual periods and conflicting duplicate values identifiable", async () => {
    for (const rows of [[row("2024", 4), row("2022", 2)], [row("2024", 4), row("2024", 5), row("2023", 3)],
      [null, row("2024", 4)]]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(rows)));
      expect((await fetchWbSeries(INDICATOR, "USA", fallback)).hasGaps).toBe(true);
    }
  });

  it.each([
    { countryiso3code: "CAN" }, { indicator: { id: "WRONG" } }, { countryiso3code: undefined }, { indicator: undefined },
  ])("rejects mismatched or missing provider identities %j", async (extra) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([row("2024", 999, extra)])));
    const series = await fetchWbSeries(INDICATOR, "USA", fallback);
    expect(series).toMatchObject({ source: "fallback", observations: fallback, fallbackReason: "invalid-response" });
  });

  it("does not present a malformed dataset update date as verified metadata", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([row("2024", 4)], { lastupdated: "2025-02-30" })));
    expect((await fetchWbSeries(INDICATOR, "USA", fallback)).providerUpdatedAt).toBeNull();
  });

  it("keeps unflagged future rows missing while explicitly identifying usable forecasts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([row("2029", 9), row("2027", 7, { obs_status: "F" }), row("2024", 4)])));
    const series = await fetchWbSeries(INDICATOR, "USA", fallback);
    expect(series).toMatchObject({ source: "worldbank", hasGaps: true, latestObservationDate: "2027" });
    expect(latestWb(series.observations)).toEqual({ date: "2027", value: 7, status: "forecast" });
  });

  it("offline mode retains snapshot years and unknown snapshot verification date", async () => {
    vi.stubEnv("WORLDBANK_OFFLINE", "1");
    const series = await fetchWbSeries(INDICATOR, "USA", [{ date: "2024", value: 120, status: "forecast" }]);
    expect(fetch).not.toHaveBeenCalled();
    expect(series).toMatchObject({ source: "fallback", latestObservationDate: "2024", providerUpdatedAt: null,
      snapshotUpdatedAt: null, fetchedAt: NOW, fallbackReason: "offline" });
    expect(series.observations[0].status).toBe("forecast");
  });

  it.each([[], [{ date: "2024", value: null }]].map((rows) => ({ rows })))("empty or null-only responses cannot become confident live zeros", async ({ rows }) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(rows.map((item) => row(item.date, item.value)))));
    const series = await fetchWbSeries(INDICATOR, "USA", fallback);
    expect(series).toMatchObject({ source: "fallback", observations: fallback, fallbackReason: "no-data", latestObservationDate: "2024" });
  });

  it.each([[], [{ date: "bad", value: 4 }], [{ date: "2024", value: null }], [{ date: "2024", value: NaN }],
    [{ date: "2024", value: Infinity }]].map((snapshot) => ({ snapshot })))("unusable fallbacks remain unavailable", async ({ snapshot }) => {
    vi.stubEnv("WORLDBANK_OFFLINE", "1");
    const series = await fetchWbSeries(INDICATOR, "USA", snapshot);
    expect(series.source).toBe("unavailable");
    expect(series.latestObservationDate).toBeNull();
    expect(latestWb(series.observations)).toBeNull();
  });

  it("handles HTTP, transport, JSON and error-envelope failures distinctly", async () => {
    for (const [transport, expected] of [
      [vi.fn().mockRejectedValue(new Error("synthetic failure")), "upstream-error"],
      [vi.fn().mockResolvedValue(new Response("bad", { status: 503 })), "upstream-error"],
      [vi.fn().mockResolvedValue(new Response("not JSON")), "invalid-response"],
      [vi.fn().mockResolvedValue(new Response(JSON.stringify([{ message: [{ id: "120" }] }]))), "invalid-response"],
      [vi.fn().mockRejectedValue(new DOMException("synthetic timeout", "TimeoutError")), "timeout"],
    ] as const) {
      vi.stubGlobal("fetch", transport);
      expect((await fetchWbSeries(INDICATOR, "USA", fallback)).fallbackReason).toBe(expected);
      expect(vi.getTimerCount()).toBe(0);
    }
  });

  it.each(["request", "body"])("enforces the 8-second deadline when the %s ignores abort", async (phase) => {
    let signal: AbortSignal | null | undefined;
    vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => {
      signal = options.signal;
      if (phase === "request") return new Promise(() => {});
      return Promise.resolve({ ok: true, json: () => new Promise(() => {}) });
    }));
    const pending = fetchWbSeries(INDICATOR, "USA", fallback);
    await vi.advanceTimersByTimeAsync(8_000);
    expect(await pending).toMatchObject({ source: "fallback", fallbackReason: "timeout" });
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves timeout classification when response-body decoding aborts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true,
      json: () => Promise.reject(new DOMException("synthetic body timeout", "AbortError")) }));
    expect((await fetchWbSeries(INDICATOR, "USA", fallback)).fallbackReason).toBe("timeout");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("never mutates caller-owned fallback observations during normalization", async () => {
    vi.stubEnv("WORLDBANK_OFFLINE", "1");
    const snapshot: WbObservation[] = [{ date: "2023", value: 3 }, { date: "2024", value: 4 }];
    const before = structuredClone(snapshot);
    const series = await fetchWbSeries(INDICATOR, "USA", snapshot);
    expect(series.observations.map((item) => item.date)).toEqual(["2024", "2023"]);
    expect(snapshot).toEqual(before);
  });
});
