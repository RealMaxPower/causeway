import { describe, expect, it } from "vitest";
import {
  CURRENCIES,
  DEFAULT_INPUTS,
  bandTone,
  buildSchedule,
  formatCurrency,
  formatUSD,
  plan,
  strategyLabel,
} from "@/components/widgets/currency-planner/model";

describe("currency-planner model", () => {
  describe("CURRENCIES dataset", () => {
    it("includes a spread of major and EM currencies", () => {
      const codes = CURRENCIES.map((c) => c.code);
      expect(codes).toContain("EUR");
      expect(codes).toContain("GBP");
      expect(codes).toContain("JPY");
      expect(codes).toContain("MXN");
      expect(codes).toContain("BRL");
    });

    it("every spot sits inside its 5-year range", () => {
      for (const c of CURRENCIES) {
        expect(c.fiveYearMin).toBeLessThanOrEqual(c.unitsPerUSD);
        expect(c.unitsPerUSD).toBeLessThanOrEqual(c.fiveYearMax);
        expect(c.fiveYearMax).toBeGreaterThan(c.fiveYearMin);
      }
    });

    it("every currency has a non-empty contextual note", () => {
      for (const c of CURRENCIES) {
        expect(c.note.length).toBeGreaterThan(20);
      }
    });
  });

  describe("plan()", () => {
    it("classifies USD strength into weak/neutral/strong by percentile", () => {
      // Force USD-strong: spot at the max of its range.
      const top = { ...DEFAULT_INPUTS, currencyCode: "EUR" };
      const r = plan(top);
      // EUR spot 0.93 in [0.82, 1.05] → pct ~ 0.48 → neutral
      expect(r.usdBand).toBe("neutral");
      expect(r.strategy).toBe("staged");
    });

    it("aggressive strategy when USD percentile ≥ 0.66", () => {
      // JPY: 152 in [105, 161] → (152-105)/(161-105) = 47/56 ≈ 0.84
      const r = plan({ currencyCode: "JPY", amount: 100_000, monthsToTrip: 6 });
      expect(r.usdBand).toBe("strong");
      expect(r.strategy).toBe("aggressive");
    });

    it("wait strategy when USD percentile ≤ 0.34", () => {
      // MXN: 18.5 in [16.3, 24.5] → (18.5-16.3)/(24.5-16.3) = 2.2/8.2 ≈ 0.27
      const r = plan({ currencyCode: "MXN", amount: 5000, monthsToTrip: 6 });
      expect(r.usdBand).toBe("weak");
      expect(r.strategy).toBe("wait");
    });

    it("USD cost today equals amount / spot", () => {
      const r = plan({ currencyCode: "EUR", amount: 1000, monthsToTrip: 6 });
      expect(r.usdCostToday).toBeCloseTo(1000 / 0.93, 2);
    });

    it("reverted cost uses the 5-year median", () => {
      const r = plan({ currencyCode: "EUR", amount: 1000, monthsToTrip: 6 });
      const median = (0.82 + 1.05) / 2;
      expect(r.usdCostIfReverts).toBeCloseTo(1000 / median, 2);
    });

    it("schedule slices always sum to the requested amount", () => {
      for (const code of ["EUR", "JPY", "MXN", "BRL"]) {
        const r = plan({ currencyCode: code, amount: 4321, monthsToTrip: 7 });
        const sum = r.schedule.reduce((a, s) => a + s.units, 0);
        expect(sum).toBeCloseTo(4321, 2);
      }
    });

    it("unknown currencyCode falls back to first currency", () => {
      const r = plan({ ...DEFAULT_INPUTS, currencyCode: "ZZZ" });
      expect(r.currency.code).toBe(CURRENCIES[0].code);
    });

    it("clamps degenerate monthsToTrip to ≥ 1 slice", () => {
      const r = plan({ currencyCode: "EUR", amount: 1000, monthsToTrip: 0 });
      expect(r.schedule.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("buildSchedule()", () => {
    it("aggressive shape front-loads (month 0 > month last)", () => {
      const s = buildSchedule(1000, 6, "aggressive");
      expect(s[0].units).toBeGreaterThan(s[s.length - 1].units);
    });

    it("wait shape back-loads (month 0 < month last)", () => {
      const s = buildSchedule(1000, 6, "wait");
      expect(s[0].units).toBeLessThan(s[s.length - 1].units);
    });

    it("staged shape is uniform across months", () => {
      const s = buildSchedule(1200, 6, "staged");
      for (const slice of s) {
        expect(slice.units).toBeCloseTo(200, 2);
      }
    });

    it("collapses to one slice when monthsToTrip ≤ 1", () => {
      const s = buildSchedule(1000, 1, "staged");
      expect(s).toHaveLength(1);
      expect(s[0].units).toBe(1000);
    });

    it("share values sum to 1 for any strategy", () => {
      for (const strat of ["aggressive", "staged", "wait"] as const) {
        const s = buildSchedule(1000, 9, strat);
        const sumShare = s.reduce((a, sl) => a + sl.share, 0);
        expect(sumShare).toBeCloseTo(1, 5);
      }
    });
  });

  describe("formatters", () => {
    it("formatCurrency uses code prefix and thousands separator", () => {
      expect(formatCurrency(5000, "EUR")).toBe("EUR 5,000");
      expect(formatCurrency(15000, "JPY")).toBe("JPY 15.0k");
      expect(formatCurrency(500000, "MXN")).toBe("MXN 500k");
    });

    it("formatUSD scales with magnitude", () => {
      expect(formatUSD(500)).toBe("$500");
      expect(formatUSD(15_000)).toBe("$15.0k");
      expect(formatUSD(250_000)).toBe("$250k");
    });
  });

  describe("strategyLabel", () => {
    it("returns a human-readable label per strategy", () => {
      expect(strategyLabel("aggressive")).toBe("Pre-buy now");
      expect(strategyLabel("staged")).toBe("Spread evenly");
      expect(strategyLabel("wait")).toBe("Wait and watch");
    });
  });

  describe("bandTone", () => {
    it("maps USD strength to color tone from home-currency holder's POV", () => {
      expect(bandTone("strong")).toBe("green");
      expect(bandTone("neutral")).toBe("gold");
      expect(bandTone("weak")).toBe("red");
    });
  });
});
