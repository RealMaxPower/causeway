import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchFredSeries, FRED_TIMEOUT_MS, latest, parseFredResponse, yoyChange } from "@/lib/data/fred";

const NOW = "2026-11-26T12:00:00.000Z";
const fallback = [{ date: "2026-04-01", value: 4.25 }];
const response = (observations: unknown) => new Response(JSON.stringify({ observations }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  vi.stubEnv("FRED_API_KEY", "synthetic-test-key");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unmocked request"); }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("FRED observation validation", () => {
  it("parses complete finite strings, preserves zero/missing, sorts without mutating input", () => {
    const rows = [{ date: "2026-08-01", value: "-2.5" }, { date: "2026-10-01", value: "." },
      { date: "2026-09-01", value: "0" }, { date: "2026-07-01", value: "1.25e2" }];
    expect(parseFredResponse({ observations: rows })).toEqual([
      { date: "2026-10-01", value: null }, { date: "2026-09-01", value: 0 },
      { date: "2026-08-01", value: -2.5 }, { date: "2026-07-01", value: 125 },
    ]);
    expect(rows[0].date).toBe("2026-08-01");
  });

  it.each([null, [], {}, { observations: null }, { observations: {} }, { error_code: 400 }])("rejects invalid provider shape %j", (payload) => {
    expect(parseFredResponse(payload)).toBeNull();
  });

  it.each(["", " ", "3.1%", "3junk", "Infinity", "NaN", "1e309", 4, null, true])("rejects a malformed numeric value %j", (value) => {
    expect(parseFredResponse({ observations: [{ date: "2026-10-01", value }] })).toBeNull();
  });

  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "2026-12-01", "2026-1-1", "bad", null])("rejects invalid or future dates %j", (date) => {
    expect(parseFredResponse({ observations: [{ date, value: "4" }] })).toBeNull();
  });

  it("accepts real leap days and rejects duplicate or partly malformed series", () => {
    expect(parseFredResponse({ observations: [{ date: "2024-02-29", value: "4" }] })).toHaveLength(1);
    const row = { date: "2026-10-01", value: "4" };
    expect(parseFredResponse({ observations: [row, row] })).toBeNull();
    expect(parseFredResponse({ observations: [row, null] })).toBeNull();
  });

  it("latest chooses the newest finite value, including zero", () => {
    expect(latest([{ date: "2026-09-01", value: 3 }, { date: "2026-10-01", value: 0 },
      { date: "2026-11-01", value: null }])).toEqual({ date: "2026-10-01", value: 0 });
    expect(latest([{ date: "bad", value: 4 }, { date: "2026-10-01", value: NaN },
      { date: "2026-09-01", value: Infinity }])).toBeNull();
  });

  it("requires the exact prior-year CPI period, not a nearby month or twelve array entries", () => {
    const current = { date: "2026-10-01", value: 120 };
    expect(yoyChange([current, { date: "2025-10-01", value: 100 }])).toEqual({ date: current.date, value: expect.closeTo(20, 10) });
    for (const date of ["2025-09-01", "2025-11-01", "2025-10-02"]) {
      expect(yoyChange([current, { date, value: 100 }])).toBeNull();
    }
    for (const value of [0, -100, null, NaN, Infinity]) {
      expect(yoyChange([current, { date: "2025-10-01", value }])).toBeNull();
    }
    expect(yoyChange([{ ...current, value: 0 }, { date: "2025-10-01", value: 100 }])).toBeNull();
    expect(yoyChange([current, { date: "2025-10-01", value: Number.MIN_VALUE }])).toBeNull();
  });
});

describe("bounded FRED reads and fallback provenance", () => {
  it("does not request data without a key and records the snapshot observation date", async () => {
    vi.stubEnv("FRED_API_KEY", "");
    const result = await fetchFredSeries("FEDFUNDS", fallback);
    expect(fetch).not.toHaveBeenCalled();
    expect(result).toMatchObject({ source: "fallback", observationDate: "2026-04-01", checkedAt: NOW, fallbackReason: "missing-key" });
    expect(result.observations).not.toBe(fallback);
  });

  it("sets a cache lifetime/abort signal and retains the real observation date", async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(response([{ date: "2026-10-01", value: "0" }]));
    vi.stubGlobal("fetch", mock);
    const result = await fetchFredSeries("FEDFUNDS", fallback, 6);
    expect(result).toMatchObject({ source: "fred", observationDate: "2026-10-01", checkedAt: NOW, fallbackReason: null });
    expect(result.observations[0].value).toBe(0);
    const [url, options] = mock.mock.calls[0];
    expect(new URL(String(url)).searchParams.get("limit")).toBe("6");
    expect(options?.next?.revalidate).toBe(21600);
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([[], [{ date: "2026-10-01", value: "." }]].map((rows) => ({ rows })))("empty/missing live series falls back, never to live zero", async ({ rows }) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(rows)));
    const result = await fetchFredSeries("FEDFUNDS", fallback);
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("insufficient-history");
    expect(result.observations[0].value).toBe(4.25);
  });

  it("uses the whole CPI snapshot when the live prior-year comparison is absent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ date: "2026-10-01", value: "999" }])));
    const cpiFallback = [{ date: "2026-04-01", value: 120 }, { date: "2025-04-01", value: 100 }];
    const result = await fetchFredSeries("CPIAUCSL", cpiFallback, 18, { requireYoy: true });
    expect(result.source).toBe("fallback");
    expect(result.observationDate).toBe("2026-04-01");
    expect(result.observations).toEqual(cpiFallback);
    expect(yoyChange(result.observations)?.value).toBeCloseTo(20, 10);
  });

  it.each([[], [{ date: "bad", value: 4 }], [{ date: "2026-10-01", value: NaN }], [{ date: "2026-10-01", value: null }]].map((snapshot) => ({ snapshot })))("bad or absent fallback produces explicit unavailability", async ({ snapshot }) => {
    vi.stubEnv("FRED_API_KEY", "");
    const result = await fetchFredSeries("FEDFUNDS", snapshot);
    expect(result).toMatchObject({ source: "unavailable", observations: [], observationDate: null });
  });

  it("does not call incomplete fallback CPI inflation zero", async () => {
    vi.stubEnv("FRED_API_KEY", "");
    expect((await fetchFredSeries("CPIAUCSL", fallback, 18, { requireYoy: true })).source).toBe("unavailable");
  });

  it("handles malformed JSON, HTTP and network failures without leaking request details", async () => {
    for (const transport of [vi.fn().mockRejectedValue(new Error("synthetic failure")),
      vi.fn().mockResolvedValue(new Response("bad", { status: 503 })),
      vi.fn().mockResolvedValue(new Response("not JSON"))]) {
      vi.stubGlobal("fetch", transport);
      expect((await fetchFredSeries("FEDFUNDS", fallback)).fallbackReason).toBe("request-failed");
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ date: "2026-10-01", value: "4oops" }])));
    expect((await fetchFredSeries("FEDFUNDS", fallback)).fallbackReason).toBe("invalid-response");
  });

  it.each(["request", "body"])("bounds a stalled %s even if it ignores abort", async (phase) => {
    let signal: AbortSignal | null | undefined;
    vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => {
      signal = options.signal;
      if (phase === "request") return new Promise(() => {});
      return Promise.resolve({ ok: true, json: () => new Promise(() => {}) });
    }));
    const pending = fetchFredSeries("FEDFUNDS", fallback);
    await vi.advanceTimersByTimeAsync(FRED_TIMEOUT_MS);
    expect(await pending).toMatchObject({ source: "fallback", fallbackReason: "timeout" });
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
