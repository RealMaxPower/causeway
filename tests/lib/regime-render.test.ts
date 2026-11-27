import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RegimePage from "@/app/regime/page";
import * as fred from "@/lib/data/fred";
import { getRegimeRead } from "@/lib/data/regime";

vi.mock("@/components/chrome/Topbar", () => ({ Topbar: () => null, Crumb: () => null }));
vi.mock("@/components/chrome/Footer", () => ({ Footer: () => null }));
vi.mock("@/lib/data/regime", () => ({ getRegimeRead: vi.fn() }));

type Rows = Record<string, { date: string; value: string }[]>;
const NOW = "2026-11-27T12:00:00.000Z";
const pair = (current: number, previous: number) => [
  { date: "2026-10-01", value: String(current) },
  { date: "2026-09-01", value: String(previous) },
];
function providerRows(): Rows {
  return {
    CPIAUCSL: [...pair(103, 104),
      { date: "2025-10-01", value: "100" }, { date: "2025-09-01", value: "100" }],
    FEDFUNDS: pair(4, 4.25),
    UNRATE: pair(4.7, 4.6),
    DRTSCILM: [{ date: "2026-07-01", value: "10" }, { date: "2026-04-01", value: "15" }],
  };
}
function mockProvider(rows: Rows) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({
    observations: rows[new URL(url).searchParams.get("series_id")!],
  }))));
}
function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, "").replaceAll("&#x27;", "'").replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}
async function renderRead() {
  // Derive the contract from the real model with an offline provider fixture,
  // then inject it into the page so rendering never makes a second request.
  const actual = await vi.importActual<typeof import("@/lib/data/regime")>("@/lib/data/regime");
  const read = await actual.getRegimeRead();
  vi.mocked(getRegimeRead).mockResolvedValue(read);
  const html = renderToStaticMarkup(await RegimePage());
  return { read, html, text: plainText(html) };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  vi.stubEnv("FRED_API_KEY", "synthetic-test-key");
  mockProvider(providerRows());
});
afterEach(() => {
  vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers();
});

describe("regime page interpretation and precision", () => {
  it("renders four derived questions with separate level, change and coverage evidence", async () => {
    const { read, text, html } = await renderRead();
    expect(read.composite).toMatchObject({ confirming: 4, trendCoverage: 4 });
    expect(text).toContain("Evidence coverage4 of 4");
    expect(text).toContain("Trend coverage4 of 4");
    expect(text).toContain("What these readings can help you examine");
    expect(read.implications).toHaveLength(4);
    for (const item of read.implications) {
      expect(text).toContain(item.title);
      expect(text).toContain(item.line);
      expect(html).toContain(`href="${item.href}"`);
    }
    for (const axis of read.axes) {
      expect(text).toContain(axis.verdict);
      expect(text).toContain(axis.level.reference);
      expect(text).toContain(axis.trend.label);
      expect(html).toContain(`https://fred.stlouisfed.org/series/${axis.seriesId}`);
    }
    expect(text).toContain("from Sep 2026 to Oct 2026");
    expect(text).toContain("from Apr 2026 to Jul 2026");
    expect(text).toContain("Dates identify observation periods, not release or retrieval dates.");
    expect(html).toContain("https://www.federalreserve.gov/faqs/economy_14400.htm");
    expect(text).not.toMatch(/Confirming axes|lock some in|Stagger duration|directional defaults|calibrated to the post-1990/);
  });

  it("keeps all four questions when other axes are illustrative, stale or unavailable", async () => {
    const rows = providerRows();
    rows.FEDFUNDS = [{ date: "2026-10-01", value: "invalid" }];
    rows.UNRATE = [{ date: "2026-01-01", value: "6" }];
    mockProvider(rows);
    const original = fred.fetchFredSeries;
    vi.spyOn(fred, "fetchFredSeries").mockImplementation(async (...args) => args[0] === "DRTSCILM"
      ? { id: args[0], observations: [], source: "unavailable", checkedAt: NOW,
        observationDate: null, fallbackReason: "request-failed" }
      : original(...args));
    const { read, text, html } = await renderRead();
    expect(read.composite).toMatchObject({ confirming: 1, trendCoverage: 1 });
    expect(text).toContain("Evidence coverage1 of 4");
    expect(text).toContain("Trend coverage1 of 4");
    for (const item of read.implications) {
      expect(text).toContain(item.title);
      expect(text).toContain(item.line);
      expect(html).toContain(`href="${item.href}"`);
    }
    expect(text).toContain("This card uses a bundled illustration.");
    expect(text).toContain("This observation exceeds the display age threshold.");
    expect(text).toContain("A missing value provides no evidence of favorable or adverse conditions.");
    expect(text).toContain("No usable observation is available.");
    expect(text).toContain("Mixed sources · check each indicator");
    expect(html).toMatch(/>—<span[^>]*>%<\/span>/);
  });

  it("dates CPI to its latest complete annual pair and explains the newer gap", async () => {
    const rows = providerRows();
    rows.CPIAUCSL = [
      { date: "2026-10-01", value: "337.476" },
      { date: "2026-09-01", value: "336.298" },
      { date: "2026-08-01", value: "335" },
      { date: "2025-10-01", value: "." },
      { date: "2025-09-01", value: "324.245" },
      { date: "2025-08-01", value: "323" },
    ];
    mockProvider(rows);
    const { read, text, html } = await renderRead();
    expect(read.axes[0]).toMatchObject({ source: "fred", observationDate: "2026-09-01" });
    expect(text).toContain("Using the latest complete annual comparison, Sep 2026.");
    expect(text).toContain("Newer periods through Oct 2026 lack a usable exact prior-year pair.");
    expect(text).toContain("from Aug 2026 to Sep 2026");
    expect(html).toMatch(/CPIAUCSL<\/span><span[^>]*>as of Sep 2026/);
    expect(html).toMatch(/>3\.72<span[^>]*>%<\/span>/);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it.each([
    { value: 0.004, display: "&lt;0.01" },
    { value: -0.004, display: "−&lt;0.01" },
    { value: 0, display: "0" },
    { value: 4.25, display: "4.25" },
  ])("preserves the sign and magnitude of $value in the displayed number", async ({ value, display }) => {
    const rows = providerRows();
    rows.FEDFUNDS = pair(value, 1);
    mockProvider(rows);
    const { read, html } = await renderRead();
    expect(read.axes[1].value).toBe(value);
    expect(html).toContain(`>${display}<span`);
    expect(html).not.toContain(">-0<span");
  });

  it("retains enough rate precision to show why a value is above the reference band", async () => {
    const rows = providerRows();
    rows.FEDFUNDS = pair(3.5001, 3.5);
    mockProvider(rows);
    const { read, html, text } = await renderRead();
    expect(read.axes[1].level.label).toBe("Effective rate above reference band");
    expect(html).toContain(">3.5001<span");
    expect(text).toContain("Effective rate above reference band");
  });

  it.each([
    { index: 102.2001, display: "2.2001", label: "CPI above the 2% reference" },
    { index: 102.2, display: "2.2", label: "CPI in the lower inflation band" },
  ])("keeps CPI display $display consistent with its unrounded classification", async ({ index, display, label }) => {
    const rows = providerRows();
    rows.CPIAUCSL[0].value = String(index);
    mockProvider(rows);
    const { read, html, text } = await renderRead();
    expect(read.axes[0].level.label).toBe(label);
    expect(html).toContain(`>${display}<span`);
    expect(text).toContain(label);
  });
});
