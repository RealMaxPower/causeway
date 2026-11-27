import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseCountries, parseIndicators } from "@/app/compare/parse";
import { IndicatorPanel } from "@/app/compare/IndicatorPanel";
import { sourceSummary } from "@/app/compare/presentation";
import { DEFAULT_COUNTRY_CODES } from "@/lib/data/worldbank-countries";
import { DEFAULT_INDICATOR_CODES } from "@/lib/data/worldbank-indicators";
import type { WbSeries } from "@/lib/data/worldbank";

const countries = parseCountries("USA,DEU,CHN");
const indicator = parseIndicators("FP.CPI.TOTL.ZG")[0];
const gdp = parseIndicators("NY.GDP.PCAP.CD")[0];

function series(overrides: Partial<WbSeries> = {}): WbSeries {
  return {
    country: "USA",
    indicator: indicator.code,
    observations: [{ date: "2024", value: 2 }],
    fetchedAt: "2026-01-01T00:00:00.000Z",
    source: "worldbank",
    sourceUrl: "https://api.worldbank.org/v2/country/USA/indicator/FP.CPI.TOTL.ZG?format=json",
    latestObservationDate: "2024",
    providerUpdatedAt: "2025-12-01",
    snapshotUpdatedAt: null,
    fallbackReason: null,
    hasGaps: false,
    ...overrides,
  };
}

describe("comparison query selections", () => {
  it("merges repeated keys and comma-separated values in requested order", () => {
    expect(parseCountries([" deu,usa ", "CHN", "USA"])
      .map((country) => country.iso3)).toEqual(["DEU", "USA", "CHN"]);
    expect(parseIndicators([" fp.cpi.totl.zg ", "NY.GDP.PCAP.CD,FP.CPI.TOTL.ZG"])
      .map((entry) => entry.code)).toEqual(["FP.CPI.TOTL.ZG", "NY.GDP.PCAP.CD"]);
  });

  it("applies caps after validation and deduplication", () => {
    expect(parseCountries(["invalid,USA,USA,USA", "DEU,CHN,GBR,JPN"])
      .map((country) => country.iso3)).toEqual(["USA", "DEU", "CHN", "GBR"]);
    expect(parseIndicators(["invalid,FP.CPI.TOTL.ZG,FP.CPI.TOTL.ZG,FP.CPI.TOTL.ZG", "NY.GDP.PCAP.CD,NY.GDP.MKTP.CD,BN.CAB.XOKA.GD.ZS,GC.DOD.TOTL.GD.ZS"])
      .map((entry) => entry.code)).toEqual(["FP.CPI.TOTL.ZG", "NY.GDP.PCAP.CD", "NY.GDP.MKTP.CD", "BN.CAB.XOKA.GD.ZS"]);
  });

  it.each([undefined, "", "unknown", ["", " , ", "unknown"]])("uses defaults for no valid selection: %j", (raw) => {
    expect(parseCountries(raw).map((country) => country.iso3)).toEqual(DEFAULT_COUNTRY_CODES);
    expect(parseIndicators(raw).map((entry) => entry.code)).toEqual(DEFAULT_INDICATOR_CODES);
  });
});

describe("comparison provenance and missingness", () => {
  it("reports mixed sources, dataset updates, observation years and unrecorded snapshot dates separately", () => {
    const mixed = [
      series(),
      series({ country: "DEU", source: "fallback", providerUpdatedAt: null, fallbackReason: "timeout", hasGaps: true }),
      series({ country: "CHN", source: "unavailable", observations: [], latestObservationDate: null, providerUpdatedAt: null, fallbackReason: "no-data" }),
    ];
    expect(sourceSummary(mixed)).toBe("1 World Bank API · 1 snapshot · 1 unavailable");
    const html = renderToStaticMarkup(createElement(IndicatorPanel, { indicator, countries, series: mixed }));
    expect(html).toContain("Latest value year: 2024");
    expect(html).toContain("Source dataset updated: 2025-12-01");
    expect(html).toContain("Snapshot update date: unrecorded");
    expect(html).toContain("Illustrative snapshot");
    expect(html).toContain("API request timed out");
    expect(html).toContain("API returned no usable values; no usable snapshot");
    expect(html).toContain("Partial series: missing, invalid or unsampled years");
    expect(html).toContain("Latest value year: none");
    expect(html).toContain("World Bank source data</a>");
    expect(html).not.toContain("2026-01-01"); // Rendering today cannot refresh older data.
    expect(html).not.toContain("live ·");
  });

  it("does not draw a continuous path over missing years and keeps missing table rows", () => {
    const observations = [
      { date: "2025", value: null },
      { date: "2024", value: 4 },
      { date: "2023", value: null },
      { date: "2022", value: 2 },
      { date: "2021", value: 1 },
    ];
    const html = renderToStaticMarkup(createElement(IndicatorPanel, {
      indicator, countries: countries.slice(0, 1), series: [series({ observations, hasGaps: true })],
    }));
    const path = html.match(/<path d="([^"]+)"/)?.[1];
    expect(path).toBeDefined();
    expect(path?.match(/M /g)).toHaveLength(2);
    expect(path?.match(/L /g)).toHaveLength(1);
    expect(html.match(/<circle /g)).toHaveLength(3);
    expect(html).toContain('<th scope="row">2025</th>');
    expect(html.match(/aria-label="Missing value"/g)).toHaveLength(2);
  });

  it("identifies forecast and other provider flags in chart and table", () => {
    const html = renderToStaticMarkup(createElement(IndicatorPanel, {
      indicator, countries: countries.slice(0, 1), series: [series({ observations: [
        { date: "2025", value: 3, status: "forecast" },
        { date: "2024", value: 2, status: "flagged" },
      ] })],
    }));
    expect(html).toContain("Includes 1 forecast value (F)");
    expect(html).toContain("other provider-flagged values (*)");
    expect(html).toContain('<abbr title="Forecast"> F</abbr>');
    expect(html).toContain('<abbr title="Provider flagged"> *</abbr>');
    expect(html).toContain("Hollow dots mark forecasts");
    expect(html).toContain("3.0% (forecast)</title>");
  });

  it("keeps zero and negative values in the table without moving them onto a log axis", () => {
    const html = renderToStaticMarkup(createElement(IndicatorPanel, {
      indicator: gdp, countries: countries.slice(0, 1), series: [series({ observations: [
        { date: "2024", value: 0 }, { date: "2023", value: -1 }, { date: "2022", value: 10 },
      ] })],
    }));
    expect(html.match(/<circle /g)).toHaveLength(1);
    expect(html).toContain("<td>0</td>");
    expect(html).toContain("<td>-1</td>");
    expect(html).not.toMatch(/(?:NaN|Infinity)/);
  });

  it("renders finite coordinates for extreme values and a constant series", () => {
    for (const values of [[-1e308, 1e308], [2, 2]]) {
      const html = renderToStaticMarkup(createElement(IndicatorPanel, {
        indicator, countries: countries.slice(0, 1), series: [series({ observations: values.map((value, i) => ({ date: String(2024 - i), value })) })],
      }));
      expect(html).not.toMatch(/(?:NaN|Infinity)/);
      expect(html.match(/<circle /g)).toHaveLength(2);
    }
  });

  it("renders explicit unavailable content without a chart or invented zero", () => {
    const html = renderToStaticMarkup(createElement(IndicatorPanel, {
      indicator, countries: countries.slice(0, 1), series: [series({ source: "unavailable", observations: [], latestObservationDate: null, providerUpdatedAt: null, fallbackReason: "offline" })],
    }));
    expect(html).toContain("No values can be plotted");
    expect(html).toContain("Offline mode; no usable snapshot");
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("0.0%");
  });
});
