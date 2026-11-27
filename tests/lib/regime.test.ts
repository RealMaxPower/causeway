import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fred from "@/lib/data/fred";
import { getRegimeRead } from "@/lib/data/regime";

const NOW = "2026-11-26T12:00:00.000Z";
const liveRows: Record<string, { date: string; value: string }[]> = {
  CPIAUCSL: [{ date: "2026-10-01", value: "120" }, { date: "2025-10-01", value: "100" }],
  FEDFUNDS: [{ date: "2026-10-01", value: "4" }],
  UNRATE: [{ date: "2026-09-01", value: "4.1" }],
  DRTSCILM: [{ date: "2026-07-01", value: "-2.5" }],
};
function liveResponse(id: string) { return new Response(JSON.stringify({ observations: liveRows[id] })); }
function mockLive() {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => liveResponse(new URL(url).searchParams.get("series_id")!)));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(NOW));
  vi.stubEnv("FRED_API_KEY", "synthetic-test-key"); mockLive();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("regime source and observation metadata", () => {
  it("keeps each available indicator's own period, age, cadence and source", async () => {
    const result = await getRegimeRead();
    expect(result.sourceSummary).toBe("fred");
    expect(result.liveAny).toBe(true);
    expect(result.axes.map((axis) => axis.value)).toEqual([20, 4, 4.1, -2.5]);
    expect(result.axes.map((axis) => axis.observationAgeDays)).toEqual([56, 56, 86, 148]);
    expect(result.axes.map((axis) => axis.staleAfterDays)).toEqual([90, 90, 90, 180]);
    expect(result.axes.map((axis) => axis.observationDate)).toEqual(["2026-10-01", "2026-10-01", "2026-09-01", "2026-07-01"]);
    for (const axis of result.axes) {
      expect(axis).toMatchObject({ source: "fred", freshness: "recent", status: "available", checkedAt: NOW, fallbackReason: null });
      expect(Number.isFinite(axis.fillPct)).toBe(true);
    }
  });

  it("distinguishes mixed-source snapshots and does not refresh old fallback periods", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const id = new URL(url).searchParams.get("series_id")!;
      if (id === "DRTSCILM") return new Response("unavailable", { status: 503 });
      if (id === "FEDFUNDS") return new Response(JSON.stringify({ observations: [{ date: "2026-10-01", value: "4garbage" }] }));
      return liveResponse(id);
    }));
    const result = await getRegimeRead();
    expect(result.sourceSummary).toBe("mixed");
    expect(result.liveAny).toBe(true);
    expect(result.axes[1]).toMatchObject({ source: "fallback", observationDate: "2026-04-01", observationAgeDays: 239,
      freshness: "stale", checkedAt: NOW, fallbackReason: "invalid-response" });
    expect(result.axes[3]).toMatchObject({ source: "fallback", observationDate: "2026-01-01", observationAgeDays: 329,
      freshness: "stale", checkedAt: NOW, fallbackReason: "request-failed" });
    expect(result.axes[0].source).toBe("fred");
  });

  it("labels every bundled snapshot as fallback when no key is configured", async () => {
    vi.stubEnv("FRED_API_KEY", "");
    const result = await getRegimeRead();
    expect(fetch).not.toHaveBeenCalled();
    expect(result.sourceSummary).toBe("fallback");
    expect(result.liveAny).toBe(false);
    expect(result.axes.map((axis) => axis.value)).toEqual([2.6, 4.3, 4.1, -2.5]);
    for (const axis of result.axes) {
      expect(axis).toMatchObject({ source: "fallback", freshness: "stale", status: "available", fallbackReason: "missing-key" });
      expect(axis.checkedAt).not.toBe(axis.observationDate);
    }
    expect(result.composite.detail).not.toContain("wired live");
  });

  it("keeps a genuinely zero reading available", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const id = new URL(url).searchParams.get("series_id");
      const observations = id === "CPIAUCSL"
        ? [{ date: "2026-10-01", value: "100" }, { date: "2025-10-01", value: "100" }]
        : [{ date: "2026-10-01", value: "0" }];
      return new Response(JSON.stringify({ observations }));
    }));
    const result = await getRegimeRead();
    for (const axis of result.axes) expect(axis).toMatchObject({ value: 0, status: "available", source: "fred" });
  });

  it("uses dated fallback inflation when live CPI lacks the prior-year index", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const id = new URL(url).searchParams.get("series_id")!;
      return id === "CPIAUCSL" ? new Response(JSON.stringify({ observations: [{ date: "2026-10-01", value: "120" }] })) : liveResponse(id);
    }));
    const result = await getRegimeRead();
    expect(result.axes[0]).toMatchObject({ value: 2.6, source: "fallback", observationDate: "2026-04-01", freshness: "stale", fallbackReason: "insufficient-history" });
    expect(result.sourceSummary).toBe("mixed");
  });

  it("marks old FRED observations stale independently of their retrieval time", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ observations: [
      { date: "2025-10-01", value: "120" }, { date: "2024-10-01", value: "100" },
    ] }))));
    const result = await getRegimeRead();
    for (const axis of result.axes) expect(axis).toMatchObject({ source: "fred", freshness: "stale", observationDate: "2025-10-01", checkedAt: NOW });
  });
});

describe("unavailable regime observations", () => {
  function noData(id: string): fred.FredSeries {
    return { id, observations: [], source: "unavailable", checkedAt: NOW, observationDate: null, fallbackReason: "request-failed" };
  }

  it("renders missing axes as null without favorable classifications or confirmations", async () => {
    vi.spyOn(fred, "fetchFredSeries").mockImplementation(async (id) => noData(id));
    const result = await getRegimeRead();
    expect(result.sourceSummary).toBe("unavailable");
    expect(result.liveAny).toBe(false);
    expect(result.composite).toMatchObject({ headline: "Data unavailable", confirming: 0, of: 4 });
    for (const axis of result.axes) {
      expect(axis).toMatchObject({ value: null, fillPct: null, observationDate: null, observationAgeDays: null,
        source: "unavailable", status: "unavailable", freshness: "unavailable" });
      expect(axis.verdict).toMatch(/^Unavailable:/);
    }
  });

  it("missing inflation is not counted as at-target in a partial snapshot", async () => {
    vi.spyOn(fred, "fetchFredSeries").mockImplementation(async (id) => id === "CPIAUCSL" ? noData(id) : {
      id, observations: [{ date: "2026-10-01", value: id === "FEDFUNDS" ? 4 : id === "UNRATE" ? 4 : -2 }],
      source: "fred", checkedAt: NOW, observationDate: "2026-10-01", fallbackReason: null,
    });
    const result = await getRegimeRead();
    expect(result.axes[0].value).toBeNull();
    expect(result.composite).toMatchObject({ headline: "Incomplete indicator snapshot", confirming: 3, of: 4 });
    expect(result.composite.detail).toContain("3 of 4 indicators available");
    expect(result.sourceSummary).toBe("mixed");
  });
});
