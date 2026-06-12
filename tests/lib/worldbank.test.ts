import { describe, expect, it } from "vitest";
import { latestWb, parseWbResponse } from "@/lib/data/worldbank";
import {
  COUNTRIES,
  DEFAULT_COUNTRY_CODES,
  MAX_COUNTRIES,
  findCountry,
} from "@/lib/data/worldbank-countries";
import {
  DEFAULT_INDICATOR_CODES,
  INDICATORS,
  MAX_INDICATORS,
  findIndicator,
} from "@/lib/data/worldbank-indicators";

describe("parseWbResponse", () => {
  it("parses a well-formed [meta, data] response", () => {
    const json = [
      { page: 1, pages: 1, per_page: 10, total: 3 },
      [
        { indicator: { id: "X" }, country: { id: "US" }, countryiso3code: "USA", date: "2024", value: 1.5 },
        { indicator: { id: "X" }, country: { id: "US" }, countryiso3code: "USA", date: "2023", value: 1.4 },
        { indicator: { id: "X" }, country: { id: "US" }, countryiso3code: "USA", date: "2022", value: null },
      ],
    ];
    const obs = parseWbResponse(json);
    expect(obs).toHaveLength(3);
    expect(obs?.[0]).toEqual({ date: "2024", value: 1.5 });
    expect(obs?.[2].value).toBeNull();
  });

  it("returns null for an error-shaped response", () => {
    const errJson = [{ message: [{ id: "120", key: "Invalid value", value: "..." }] }];
    expect(parseWbResponse(errJson)).toBeNull();
  });

  it("returns null when input is not an array", () => {
    expect(parseWbResponse(null)).toBeNull();
    expect(parseWbResponse({ data: [] })).toBeNull();
    expect(parseWbResponse("oops")).toBeNull();
  });

  it("returns null when the data slot is missing or not an array", () => {
    expect(parseWbResponse([{ page: 1 }])).toBeNull();
    expect(parseWbResponse([{ page: 1 }, "not-an-array"])).toBeNull();
  });

  it("skips rows with bad shape but keeps the rest", () => {
    const json = [
      { page: 1 },
      [
        null,
        { date: "2024", value: 5 },
        { value: 7 }, // missing date — skipped
        { date: "2023", value: 6 },
      ],
    ];
    const obs = parseWbResponse(json);
    expect(obs).toHaveLength(2);
    expect(obs?.[0].date).toBe("2024");
    expect(obs?.[1].date).toBe("2023");
  });
});

describe("latestWb", () => {
  it("returns the first non-null observation", () => {
    const obs = [
      { date: "2024", value: null },
      { date: "2023", value: 7 },
      { date: "2022", value: 6 },
    ];
    expect(latestWb(obs)?.value).toBe(7);
  });

  it("returns null when all observations are null", () => {
    const obs = [
      { date: "2024", value: null },
      { date: "2023", value: null },
    ];
    expect(latestWb(obs)).toBeNull();
  });
});

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
