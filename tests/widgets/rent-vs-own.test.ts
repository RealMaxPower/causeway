import { describe, expect, it } from "vitest";
import {
  PRESETS,
  formatMoney,
  simulateH3,
  type ScenarioInputs,
} from "@/components/widgets/rent-vs-own/model";

const baseline: ScenarioInputs = {
  price: 500,
  dp: 20,
  mortRate: 6.5,
  mktRate: 6.5,
  rent: 2400,
  hpiGrow: 3.0,
  rentGrow: 3.5,
  mktRet: 7.0,
  years: 15,
};

describe("rent-vs-own model", () => {
  describe("simulateH3", () => {
    it("returns a path with one entry per year", () => {
      const sim = simulateH3(baseline);
      expect(sim.path).toHaveLength(baseline.years);
    });

    it("loan principal = price - down payment", () => {
      const sim = simulateH3(baseline);
      expect(sim.loanK).toBe(baseline.price * 1000 * (1 - baseline.dp / 100));
      expect(sim.dpK).toBe(baseline.price * 1000 * (baseline.dp / 100));
    });

    it("loan balance is fully paid off after 30 years", () => {
      const sim = simulateH3({ ...baseline, years: 30 });
      expect(sim.path[29].loanBal).toBeLessThan(100); // fp slop
    });

    it("home value compounds at hpiGrow", () => {
      const sim = simulateH3(baseline);
      const expected =
        baseline.price * 1000 * Math.pow(1 + baseline.hpiGrow / 100, baseline.years);
      expect(sim.path[baseline.years - 1].homeVal).toBeCloseTo(expected, 0);
    });

    it("owning wins on long horizons in baseline conditions", () => {
      const sim = simulateH3({ ...baseline, years: 25 });
      const final = sim.path[sim.path.length - 1];
      expect(final.ownNet).toBeGreaterThan(final.rentNet);
    });

    it("short horizons (< 5y) usually favor renting due to selling costs + slow amortization", () => {
      const sim = simulateH3({ ...baseline, years: 3 });
      const final = sim.path[sim.path.length - 1];
      expect(final.rentNet).toBeGreaterThan(final.ownNet);
    });

    it("embedded mortgage value is positive when locked rate < current market rate", () => {
      const sim = simulateH3({ ...baseline, mortRate: 3.0, mktRate: 7.0 });
      expect(sim.mortgageEmbeddedValue).toBeGreaterThan(0);
    });

    it("embedded mortgage value is roughly zero when locked rate == current market rate", () => {
      const sim = simulateH3({ ...baseline, mortRate: 6.5, mktRate: 6.5 });
      expect(Math.abs(sim.mortgageEmbeddedValue)).toBeLessThan(5000);
    });

    it("embedded mortgage value is negative when locked rate > current market rate", () => {
      const sim = simulateH3({ ...baseline, mortRate: 7.5, mktRate: 4.0 });
      expect(sim.mortgageEmbeddedValue).toBeLessThan(0);
    });
  });

  describe("PRESETS", () => {
    it("provides five named scenarios", () => {
      expect(PRESETS).toHaveLength(5);
      const names = PRESETS.map((p) => p.name);
      expect(names).toEqual(
        expect.arrayContaining([
          "Locked in at 3%",
          "Buying at 7%",
          "HCOL renter",
          "Short stay (4y)",
          "Long stay (25y)",
        ]),
      );
    });

    it("Locked in at 3% preset produces a positive embedded value", () => {
      const p = PRESETS.find((p) => p.name === "Locked in at 3%")!;
      const sim = simulateH3(p);
      expect(sim.mortgageEmbeddedValue).toBeGreaterThan(40000);
    });

    it("Long stay (25y) preset has owning win comfortably", () => {
      const p = PRESETS.find((p) => p.name === "Long stay (25y)")!;
      const sim = simulateH3(p);
      const final = sim.path[sim.path.length - 1];
      expect(final.ownNet).toBeGreaterThan(final.rentNet);
    });
  });

  describe("formatMoney", () => {
    it("formats millions with M suffix", () => {
      expect(formatMoney(2_500_000)).toBe("$2.50M");
    });

    it("formats thousands with k suffix", () => {
      expect(formatMoney(150_000)).toBe("$150k");
    });

    it("formats small values as integers", () => {
      expect(formatMoney(450)).toBe("$450");
    });

    it("handles negatives", () => {
      expect(formatMoney(-1_500_000)).toBe("−$1.50M");
      expect(formatMoney(-50_000)).toBe("−$50k");
    });
  });
});
