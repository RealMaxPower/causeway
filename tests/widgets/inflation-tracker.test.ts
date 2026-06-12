import { describe, expect, it } from "vitest";
import {
  BASKETS,
  REGIMES,
  formatMoney,
  futureCost,
  halfLifeYears,
  pathFor,
  realPower,
} from "@/components/widgets/inflation-tracker/model";

describe("inflation-tracker model", () => {
  describe("futureCost", () => {
    it("returns input at zero years", () => {
      expect(futureCost(100, 5, 0)).toBe(100);
    });

    it("compounds at the given rate", () => {
      // $100 at 10% for 1 year = $110
      expect(futureCost(100, 10, 1)).toBeCloseTo(110, 5);
      // $100 at 10% for 2 years = $121
      expect(futureCost(100, 10, 2)).toBeCloseTo(121, 5);
    });

    it("doubles cost after ~7.27 years at 10%", () => {
      const v = futureCost(100, 10, 7.27);
      expect(v).toBeCloseTo(200, 0);
    });
  });

  describe("realPower", () => {
    it("returns input at zero years", () => {
      expect(realPower(100, 5, 0)).toBe(100);
    });

    it("is the inverse of futureCost", () => {
      const cost = futureCost(100, 5, 10);
      expect(realPower(cost, 5, 10)).toBeCloseTo(100, 5);
    });

    it("halves real power after the half-life", () => {
      const half = halfLifeYears(5);
      expect(realPower(100, 5, half)).toBeCloseTo(50, 1);
    });
  });

  describe("halfLifeYears", () => {
    it("returns Infinity at zero or negative rates", () => {
      expect(halfLifeYears(0)).toBe(Infinity);
      expect(halfLifeYears(-1)).toBe(Infinity);
    });

    it("is ~35y at 2% (Fed target)", () => {
      expect(halfLifeYears(2)).toBeCloseTo(35, 0);
    });

    it("is ~9y at 8% (2022 spike)", () => {
      expect(halfLifeYears(8)).toBeCloseTo(9, 0);
    });

    it("is dramatically short at hyperinflation rates", () => {
      expect(halfLifeYears(100)).toBeLessThan(1.5);
      expect(halfLifeYears(5000)).toBeLessThan(0.5);
    });
  });

  describe("pathFor", () => {
    it("returns horizon + 1 points (y0 through yN inclusive)", () => {
      const path = pathFor(100, 3, 5);
      expect(path).toHaveLength(6);
      expect(path[0].year).toBe(0);
      expect(path[5].year).toBe(5);
    });

    it("nominal grows; real shrinks", () => {
      const path = pathFor(100, 5, 10);
      expect(path[10].nominalNeeded).toBeGreaterThan(path[0].nominalNeeded);
      expect(path[10].realValue).toBeLessThan(path[0].realValue);
    });

    it("y0 is identity", () => {
      const path = pathFor(100, 5, 10);
      expect(path[0].nominalNeeded).toBe(100);
      expect(path[0].realValue).toBe(100);
    });
  });

  describe("REGIMES", () => {
    it("includes six named regimes covering the historical range", () => {
      expect(REGIMES).toHaveLength(6);
      const names = REGIMES.map((r) => r.name);
      expect(names).toContain("Fed target");
      expect(names).toContain("2022 spike");
      expect(names).toContain("Argentine 2023");
    });

    it("Weimar 1923 has by far the highest rate", () => {
      const sorted = [...REGIMES].sort((a, b) => b.rate - a.rate);
      expect(sorted[0].name).toMatch(/Weimar/);
    });
  });

  describe("BASKETS", () => {
    it("each component has a name, realRate, and tone", () => {
      for (const b of BASKETS) {
        expect(b.name).toBeTruthy();
        expect(typeof b.realRate).toBe("number");
        expect(["red", "blue", "green", "gold"]).toContain(b.tone);
      }
    });

    it("the canonical headline CPI is in the list", () => {
      expect(BASKETS.some((b) => b.name === "Headline CPI")).toBe(true);
    });

    it("housing/healthcare/tuition all exceed headline CPI (BLS reality)", () => {
      const headline = BASKETS.find((b) => b.name === "Headline CPI")!.realRate;
      const rent = BASKETS.find((b) => b.name.includes("Rent"))!.realRate;
      const med = BASKETS.find((b) => b.name === "Medical care")!.realRate;
      const tuition = BASKETS.find((b) => b.name === "College tuition")!.realRate;
      expect(rent).toBeGreaterThan(headline);
      expect(med).toBeGreaterThan(headline);
      expect(tuition).toBeGreaterThan(headline);
    });

    it("TVs and toys have deflationary categories (negative)", () => {
      const tv = BASKETS.find((b) => b.name.includes("TV"))!.realRate;
      const toys = BASKETS.find((b) => b.name === "Toys")!.realRate;
      expect(tv).toBeLessThan(0);
      expect(toys).toBeLessThan(0);
    });
  });

  describe("formatMoney", () => {
    it("formats small amounts", () => {
      expect(formatMoney(450)).toBe("$450");
    });

    it("formats thousands", () => {
      expect(formatMoney(5000)).toBe("$5.0k");
      expect(formatMoney(150_000)).toBe("$150k");
    });

    it("formats millions and billions", () => {
      expect(formatMoney(2_500_000)).toBe("$2.50M");
      expect(formatMoney(3_000_000_000)).toBe("$3.0B");
    });

    it("handles negatives", () => {
      expect(formatMoney(-150_000)).toBe("−$150k");
    });
  });
});
