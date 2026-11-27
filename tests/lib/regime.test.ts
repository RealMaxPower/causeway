import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fred from "@/lib/data/fred";
import { getRegimeRead, type RegimeRead } from "@/lib/data/regime";

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
    expect(result.axes[0].value).toBeCloseTo(20, 10);
    expect(result.axes.slice(1).map((axis) => axis.value)).toEqual([4, 4.1, -2.5]);
    expect(result.axes.map((axis) => axis.observationAgeDays)).toEqual([56, 56, 86, 148]);
    expect(result.axes.map((axis) => axis.staleAfterDays)).toEqual([90, 90, 90, 180]);
    expect(result.axes.map((axis) => axis.observationDate)).toEqual(["2026-10-01", "2026-10-01", "2026-09-01", "2026-07-01"]);
    for (const axis of result.axes) {
      expect(axis).toMatchObject({ source: "fred", freshness: "recent", status: "available", checkedAt: NOW, fallbackReason: null });
      expect(Number.isFinite(axis.fillPct)).toBe(true);
    }
    expect(result.composite).toMatchObject({ confirming: 4, of: 4, trendCoverage: 0 });
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
    expect(result.composite).toMatchObject({ headline: "Limited current evidence", confirming: 2, of: 4, trendCoverage: 0 });
  });

  it("labels every bundled snapshot as fallback when no key is configured", async () => {
    vi.stubEnv("FRED_API_KEY", "");
    const result = await getRegimeRead();
    expect(fetch).not.toHaveBeenCalled();
    expect(result.sourceSummary).toBe("fallback");
    expect(result.liveAny).toBe(false);
    expect(result.axes[0].value).toBeCloseTo((322.1 / 313.8 - 1) * 100, 10);
    expect(result.axes.slice(1).map((axis) => axis.value)).toEqual([4.25, 4.1, -2.5]);
    for (const axis of result.axes) {
      expect(axis).toMatchObject({ source: "fallback", freshness: "stale", status: "available", fallbackReason: "missing-key" });
      expect(axis.checkedAt).not.toBe(axis.observationDate);
    }
    expect(result.composite.detail).not.toContain("wired live");
    expect(result.composite).toMatchObject({ headline: "Illustrative snapshot", confirming: 0, of: 4, trendCoverage: 0 });
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
    expect(result.axes[0].value).toBeCloseTo((322.1 / 313.8 - 1) * 100, 10);
    expect(result.axes[0]).toMatchObject({ source: "fallback", observationDate: "2026-04-01", freshness: "stale", fallbackReason: "insufficient-history" });
    expect(result.sourceSummary).toBe("mixed");
  });

  it("marks old FRED observations stale independently of their retrieval time", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ observations: [
      { date: "2025-10-01", value: "120" }, { date: "2024-10-01", value: "100" },
    ] }))));
    const result = await getRegimeRead();
    for (const axis of result.axes) expect(axis).toMatchObject({ source: "fred", freshness: "stale", observationDate: "2025-10-01", checkedAt: NOW });
    expect(result.composite).toMatchObject({ headline: "Limited current evidence", confirming: 0, of: 4, trendCoverage: 0 });
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
    expect(result.composite).toMatchObject({ headline: "Data unavailable", confirming: 0, of: 4, trendCoverage: 0 });
    for (const axis of result.axes) {
      expect(axis).toMatchObject({ value: null, fillPct: null, observationDate: null, observationAgeDays: null,
        source: "unavailable", status: "unavailable", freshness: "unavailable" });
      expect(axis.verdict).toMatch(/^Unavailable:/);
      expect(axis.level.band).toBe("unavailable");
      expect(axis.trend).toMatchObject({ direction: "unknown", change: null, fromDate: null });
    }
  });

  it("missing inflation is not counted as at-target in a partial snapshot", async () => {
    vi.spyOn(fred, "fetchFredSeries").mockImplementation(async (id) => id === "CPIAUCSL" ? noData(id) : {
      id, observations: [{ date: "2026-10-01", value: id === "FEDFUNDS" ? 4 : id === "UNRATE" ? 4 : -2 }],
      source: "fred", checkedAt: NOW, observationDate: "2026-10-01", fallbackReason: null,
    });
    const result = await getRegimeRead();
    expect(result.axes[0].value).toBeNull();
    expect(result.composite).toMatchObject({ headline: "Incomplete indicator snapshot", confirming: 3, of: 4, trendCoverage: 0 });
    expect(result.composite.detail).toContain("3 of 4 indicators available");
    expect(result.sourceSummary).toBe("mixed");
  });
});

type ProviderRows = Record<string, { date: string; value: string }[]>;
const monthlyPair = (value: number, previous: number) => [
  { date: "2026-10-01", value: String(value) },
  { date: "2026-09-01", value: String(previous) },
];
function scenarioRows({ cpi = 103, previousCpi = 102, money = 4, previousMoney = 3.5,
  labor = 4.2, previousLabor = 4.1, credit = 10, previousCredit = 5 } = {}): ProviderRows {
  return {
    CPIAUCSL: [...monthlyPair(cpi, previousCpi), { date: "2025-10-01", value: "100" }, { date: "2025-09-01", value: "100" }],
    FEDFUNDS: monthlyPair(money, previousMoney),
    UNRATE: monthlyPair(labor, previousLabor),
    DRTSCILM: [{ date: "2026-07-01", value: String(credit) }, { date: "2026-04-01", value: String(previousCredit) }],
  };
}
function mockScenario(rows: ProviderRows) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({
    observations: rows[new URL(url).searchParams.get("series_id")!],
  }))));
}
const axisFor = (read: RegimeRead, key: RegimeRead["axes"][number]["key"]) => read.axes.find((axis) => axis.key === key)!;

describe("regime levels, adjacent changes and evidence coverage", () => {
  it("excludes illustrative values even when their periods are recent and changes are known", async () => {
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));
    vi.stubEnv("FRED_API_KEY", "");
    const read = await getRegimeRead();
    for (const axis of read.axes) expect(axis).toMatchObject({ source: "fallback", freshness: "recent" });
    expect(read.axes.filter((axis) => axis.trend.direction !== "unknown")).toHaveLength(3);
    expect(read.composite).toMatchObject({ headline: "Illustrative snapshot", confirming: 0, trendCoverage: 0 });
    for (const item of read.implications) expect(item.line).toContain("bundled illustration");
  });

  it("excludes stale FRED evidence even when exact adjacent comparisons remain available", async () => {
    const rows = Object.fromEntries(Object.entries(scenarioRows()).map(([id, observations]) => [id,
      observations.map((row) => ({ ...row, date: `${Number(row.date.slice(0, 4)) - 1}${row.date.slice(4)}` })),
    ]));
    mockScenario(rows);
    const read = await getRegimeRead();
    for (const axis of read.axes) {
      expect(axis).toMatchObject({ source: "fred", freshness: "stale" });
      expect(axis.trend.direction).toBe("rising");
    }
    expect(read.composite).toMatchObject({ headline: "Limited current evidence", confirming: 0, trendCoverage: 0 });
    for (const item of read.implications) expect(item.line).toContain("exceeds the display age threshold");
  });

  it("distinguishes opposite historical changes at identical current levels", async () => {
    mockScenario(scenarioRows());
    const rising = await getRegimeRead();
    mockScenario(scenarioRows({ previousCpi: 104, previousMoney: 4.5, previousLabor: 4.3, previousCredit: 15 }));
    const falling = await getRegimeRead();
    expect(rising.axes.map((axis) => axis.value)).toEqual(falling.axes.map((axis) => axis.value));
    expect(rising.axes.map((axis) => axis.level.band)).toEqual(["above", "above", "below", "above"]);
    expect(falling.axes.map((axis) => axis.level)).toEqual(rising.axes.map((axis) => axis.level));
    for (const read of [rising, falling]) {
      expect(read.composite).toMatchObject({ confirming: 4, of: 4, trendCoverage: 4 });
      expect(read.implications.map((item) => item.axis).sort()).toEqual(["credit", "inflation", "labor", "money"]);
      for (const implication of read.implications) {
        expect(implication.href).toMatch(/^\/nodes\/[A-H][1-9]$/);
        expect(implication.title.length).toBeGreaterThan(0);
        expect(implication.line.length).toBeGreaterThan(0);
      }
    }
    for (const [key, change] of [["inflation", 1], ["money", 0.5], ["labor", 0.1], ["credit", 5]] as const) {
      const up = axisFor(rising, key), down = axisFor(falling, key);
      expect(up.trend.direction).toBe("rising");
      expect(down.trend.direction).toBe("falling");
      expect(up.trend.change).toBeCloseTo(change, 10);
      expect(down.trend.change).toBeCloseTo(-change, 10);
      expect(up.trend.fromDate).toBe(key === "credit" ? "2026-04-01" : "2026-09-01");
      expect(up.trend.toDate).toBe(key === "credit" ? "2026-07-01" : "2026-10-01");
    }
    expect(rising.composite.headline).not.toBe(falling.composite.headline);
    for (const key of ["inflation", "money"] as const) {
      expect(rising.implications.find((item) => item.axis === key)).not.toEqual(falling.implications.find((item) => item.axis === key));
    }
  });

  it("gives a fully adverse snapshot four covered axes rather than a low favorable-theme score", async () => {
    mockScenario(scenarioRows({ cpi: 105, previousCpi: 104.5, money: 5, previousMoney: 4.5,
      labor: 6, previousLabor: 5.5, credit: 30, previousCredit: 25 }));
    const read = await getRegimeRead();
    expect(read.axes.map((axis) => axis.level.band)).toEqual(["above", "above", "above", "above"]);
    expect(read.axes.map((axis) => axis.trend.direction)).toEqual(["rising", "rising", "rising", "rising"]);
    expect(read.composite).toMatchObject({ confirming: 4, of: 4, trendCoverage: 4 });
    expect(read.composite.headline).not.toMatch(/disinflating|post-restrictive|at target|soft.land|high.confidence/i);
  });

  it("preserves opposing directions without turning disagreement into a forecast", async () => {
    mockScenario(scenarioRows({ previousMoney: 4.5, previousLabor: 4.2, credit: -5, previousCredit: 5 }));
    const read = await getRegimeRead();
    expect(read.axes.map((axis) => axis.trend.direction)).toEqual(["rising", "falling", "unchanged", "falling"]);
    expect(axisFor(read, "labor").trend.change).toBe(0);
    expect(axisFor(read, "credit").level.band).toBe("below");
    expect(read.composite).toMatchObject({ confirming: 4, of: 4, trendCoverage: 4 });
    expect(read.composite.headline).not.toMatch(/turning point|high.confidence|soft.land/i);
  });

  it("requires the exact previous month or quarter rather than skipping a missing period", async () => {
    const rows = scenarioRows();
    rows.CPIAUCSL = [rows.CPIAUCSL[0], { date: "2026-09-01", value: "." }, { date: "2026-08-01", value: "102" },
      { date: "2025-10-01", value: "100" }, { date: "2025-09-01", value: "100" }, { date: "2025-08-01", value: "100" }];
    rows.FEDFUNDS = [rows.FEDFUNDS[0], { date: "2026-09-01", value: "." }, { date: "2026-08-01", value: "3" }];
    rows.UNRATE = [rows.UNRATE[0], { date: "2026-08-01", value: "4" }];
    rows.DRTSCILM = [rows.DRTSCILM[0], { date: "2026-04-01", value: "." }, { date: "2026-01-01", value: "0" }];
    mockScenario(rows);
    const read = await getRegimeRead();
    for (const axis of read.axes) {
      expect(axis).toMatchObject({ source: "fred", status: "available", freshness: "recent" });
      expect(axis.trend).toMatchObject({ direction: "unknown", change: null, fromDate: null });
    }
    expect(read.composite).toMatchObject({ confirming: 4, of: 4, trendCoverage: 0 });
  });

  it("uses the latest complete CPI annual pair and anchors its trend to that selected period", async () => {
    const rows = scenarioRows();
    rows.CPIAUCSL = [{ date: "2026-10-01", value: "105" }, { date: "2026-09-01", value: "104" },
      { date: "2026-08-01", value: "103" }, { date: "2025-10-01", value: "." },
      { date: "2025-09-01", value: "100" }, { date: "2025-08-01", value: "100" }];
    mockScenario(rows);
    const read = await getRegimeRead(), inflation = axisFor(read, "inflation");
    expect(inflation).toMatchObject({ source: "fred", observationDate: "2026-09-01", observationAgeDays: 86,
      freshness: "recent", fallbackReason: null, checkedAt: NOW });
    expect(inflation.value).toBeCloseTo(4, 10);
    expect(inflation.trend).toMatchObject({ direction: "rising", fromDate: "2026-08-01", toDate: "2026-09-01" });
    expect(inflation.trend.change).toBeCloseTo(1, 10);
    expect(inflation.selectionNote?.length).toBeGreaterThan(0);
  });

  it("compares CPI annual inflation rates rather than the index levels", async () => {
    const rows = scenarioRows({ cpi: 103, previousCpi: 102.9 });
    rows.CPIAUCSL[3].value = "98";
    mockScenario(rows);
    const inflation = axisFor(await getRegimeRead(), "inflation");
    // The index rose 102.9→103, but annual inflation fell 5%→3%.
    expect(inflation.value).toBeCloseTo(3, 10);
    expect(inflation.trend.direction).toBe("falling");
    expect(inflation.trend.change).toBeCloseTo(-2, 10);
  });

  it("keeps exact threshold equality distinct from a genuinely higher reading", async () => {
    mockScenario(scenarioRows({ cpi: 102.2, money: 3.5, labor: 5.5, credit: 0 }));
    const at = await getRegimeRead();
    expect(at.axes.map((axis) => axis.level.band)).toEqual(["within", "within", "within", "within"]);
    mockScenario(scenarioRows({ cpi: 102.2001, money: 3.5001, labor: 5.5001, credit: 0.0001 }));
    const above = await getRegimeRead();
    expect(above.axes.map((axis) => axis.level.band)).toEqual(["above", "above", "above", "above"]);
    expect(axisFor(above, "inflation").value).toBeCloseTo(2.2001, 10);
  });

  it("distinguishes CPI deflation from a nonnegative lower band", async () => {
    mockScenario(scenarioRows({ cpi: 99, previousCpi: 100 }));
    expect(axisFor(await getRegimeRead(), "inflation").level.band).toBe("below");
    mockScenario(scenarioRows({ cpi: 100, previousCpi: 100, money: 2.5, labor: 4.5 }));
    const zero = await getRegimeRead();
    expect(axisFor(zero, "inflation").value).toBe(0);
    expect(axisFor(zero, "inflation").level.band).toBe("within");
    expect(axisFor(zero, "inflation").trend.direction).toBe("unchanged");
    expect(axisFor(zero, "money").level.band).toBe("within");
    expect(axisFor(zero, "labor").level.band).toBe("within");
  });
});
