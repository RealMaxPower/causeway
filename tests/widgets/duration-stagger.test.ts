import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DurationStagger } from "@/components/widgets/duration-stagger";
import {
  DEFAULT_INPUTS,
  HORIZON_MONTHS,
  SCENARIOS,
  STRATEGIES,
  findScenario,
  simulateAll,
  simulateStrategy,
  type ScenarioId,
} from "@/components/widgets/duration-stagger/model";

describe("duration-stagger model", () => {
  describe("dataset shape", () => {
    it("HORIZON_MONTHS is 24", () => {
      expect(HORIZON_MONTHS).toBe(24);
    });

    it("includes three strategies and three scenarios", () => {
      expect(STRATEGIES.map((s) => s.id)).toEqual([
        "go-now",
        "stagger",
        "wait-confirmation",
      ]);
      expect(SCENARIOS.map((s) => s.id)).toEqual([
        "on-time",
        "delayed",
        "higher-for-longer",
      ]);
    });

    it("every scenario has 24 monthly rate-change entries and a non-empty blurb", () => {
      for (const s of SCENARIOS) {
        expect(s.rateChanges).toHaveLength(HORIZON_MONTHS);
        expect(s.blurb.length).toBeGreaterThan(30);
      }
    });

    it("findScenario looks up by id", () => {
      expect(findScenario("on-time")?.name).toBe("Cuts on time");
      expect(findScenario("nope")).toBeUndefined();
    });
  });

  describe("simulateStrategy() · go-now", () => {
    it("portfolio duration starts at target from month 0", () => {
      const r = simulateStrategy("go-now", DEFAULT_INPUTS);
      for (const p of r.points) {
        expect(p.duration).toBe(DEFAULT_INPUTS.targetDuration);
      }
      expect(r.finalDuration).toBe(DEFAULT_INPUTS.targetDuration);
    });

    it("adds 9% carry to 22.5% duration gain, giving the documented 31.5% default", () => {
      const r = simulateStrategy("go-now", DEFAULT_INPUTS);
      // 24 × (4.5 / 12) − 10 × (−2.25 percentage points).
      expect(r.totalReturn).toBeCloseTo(31.5, 10);
      expect(r.points[0].monthlyReturn).toBeCloseTo(0.375, 10);
      expect(r.points[6].monthlyReturn).toBeCloseTo(3.708333333333333, 10);
      expect(r.points.at(-1)?.cumReturn).toBeCloseTo(31.5, 10);
      expect(r.maxDrawdown).toBe(0);
    });

    it("no-cut default earns 4.5% after carry offsets a 4.5% price loss", () => {
      const r = simulateStrategy("go-now", { ...DEFAULT_INPUTS, scenarioId: "higher-for-longer" });
      expect(r.totalReturn).toBeCloseTo(4.5, 10);
      expect(r.maxDrawdown).toBe(0);
    });
  });

  describe("simulateStrategy() · stagger", () => {
    it("duration ramps in four chunks over 12 months", () => {
      const r = simulateStrategy("stagger", DEFAULT_INPUTS);
      const gap = DEFAULT_INPUTS.targetDuration - DEFAULT_INPUTS.startDuration;
      // At m=0: 1 chunk in → start + gap/4
      expect(r.points[0].duration).toBeCloseTo(DEFAULT_INPUTS.startDuration + gap / 4, 6);
      // At m=3: 2 chunks
      expect(r.points[3].duration).toBeCloseTo(DEFAULT_INPUTS.startDuration + gap / 2, 6);
      // At m=9 onwards: full target
      expect(r.points[9].duration).toBeCloseTo(DEFAULT_INPUTS.targetDuration, 6);
      expect(r.finalDuration).toBe(DEFAULT_INPUTS.targetDuration);
    });
  });

  describe("simulateStrategy() · wait-confirmation", () => {
    it("holds startDuration until scenario.confirmMonth", () => {
      const r = simulateStrategy("wait-confirmation", { ...DEFAULT_INPUTS, scenarioId: "on-time" });
      const scen = findScenario("on-time")!;
      if (scen.confirmMonth === null) throw new Error("On-time cuts must confirm.");
      for (let m = 0; m < scen.confirmMonth; m++) {
        expect(r.points[m].duration).toBe(DEFAULT_INPUTS.startDuration);
      }
    });

    it("never extends in the higher-for-longer scenario (confirm never arrives)", () => {
      const r = simulateStrategy("wait-confirmation", { ...DEFAULT_INPUTS, scenarioId: "higher-for-longer" });
      expect(findScenario("higher-for-longer")?.confirmMonth).toBeNull();
      for (const p of r.points) {
        expect(p.duration).toBe(DEFAULT_INPUTS.startDuration);
      }
    });
  });

  describe("simulateAll()", () => {
    it("returns exactly three strategy results", () => {
      const all = simulateAll(DEFAULT_INPUTS);
      expect(all).toHaveLength(3);
      expect(all.map((r) => r.strategy.id)).toEqual([
        "go-now",
        "stagger",
        "wait-confirmation",
      ]);
    });

    it("on-time: go-now beats wait-confirmation (the playbook scenario)", () => {
      const all = simulateAll({ ...DEFAULT_INPUTS, scenarioId: "on-time" });
      const goNow = all.find((r) => r.strategy.id === "go-now")!;
      const wait = all.find((r) => r.strategy.id === "wait-confirmation")!;
      expect(goNow.totalReturn).toBeGreaterThan(wait.totalReturn);
    });

    it("higher-for-longer: wait-confirmation beats go-now (staying short was the call)", () => {
      const all = simulateAll({ ...DEFAULT_INPUTS, scenarioId: "higher-for-longer" });
      const goNow = all.find((r) => r.strategy.id === "go-now")!;
      const wait = all.find((r) => r.strategy.id === "wait-confirmation")!;
      expect(wait.totalReturn).toBeGreaterThan(goNow.totalReturn);
    });

    it("max drawdown is non-negative for every result", () => {
      for (const scen of SCENARIOS) {
        const all = simulateAll({ ...DEFAULT_INPUTS, scenarioId: scen.id });
        for (const r of all) {
          expect(r.maxDrawdown).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe("independently calculated returns and drawdowns", () => {
    it.each([
      // Fixed 9% carry plus each duration schedule's exposure to yield changes.
      ["on-time", [31.5, 29.5, 133 / 6], [0, 0, 0]],
      ["delayed", [23, 24.8, 277 / 15], [1.5, 45 / 100.75, 0]],
      ["higher-for-longer", [4.5, 5.4, 8.1], [0, 0, 0]],
    ] as const)("%s defaults have hand-calculated outcomes", (scenarioId, returns, drawdowns) => {
      const results = simulateAll({ ...DEFAULT_INPUTS, scenarioId });
      results.forEach((result, index) => {
        expect(result.totalReturn).toBeCloseTo(returns[index], 10);
        expect(result.maxDrawdown).toBeCloseTo(drawdowns[index], 10);
        expect(result.finalDuration).toBe(scenarioId === "higher-for-longer" && index === 2 ? 2 : 10);
      });
    });

    it("measures drawdown relative to the prior wealth peak, not a return-point difference", () => {
      const result = simulateStrategy("stagger", {
        startDuration: 0, targetDuration: 30, carryPct: 6, scenarioId: "delayed",
      });
      // First 3 months: +0.125 each, reaching 100.375. By month 12: 94.75.
      // The 5.625 loss is 5.604% of peak wealth, not a 5.625% drawdown.
      expect(result.points[2].cumReturn).toBeCloseTo(0.375, 10);
      expect(result.points[11].cumReturn).toBeCloseTo(-5.25, 10);
      expect(result.maxDrawdown).toBeCloseTo(4500 / 803, 10);
      expect(result.totalReturn).toBeCloseTo(60.75, 10);
    });

    it("includes starting wealth in drawdown when the first month loses money", () => {
      const result = simulateStrategy("go-now", {
        startDuration: 0, targetDuration: 30, carryPct: 0, scenarioId: "delayed",
      });
      expect(result.points[0].cumReturn).toBeCloseTo(-1.5, 10);
      expect(result.points[11].cumReturn).toBeCloseTo(-18, 10);
      expect(result.maxDrawdown).toBeCloseTo(18, 10);
      expect(result.totalReturn).toBeCloseTo(42, 10);
    });
  });

  describe("observed cuts and elapsed months", () => {
    it.each([["on-time", 7], ["delayed", 13]] as const)(
      "%s waits until the first cut has been observed at month %i", (scenarioId, confirmation) => {
        const scenario = findScenario(scenarioId)!;
        const result = simulateStrategy("wait-confirmation", { ...DEFAULT_INPUTS, scenarioId });
        expect(scenario.confirmMonth).toBe(confirmation);
        expect(scenario.rateChanges[confirmation - 1]).toBeLessThan(0);
        expect(scenario.rateChanges.slice(0, confirmation - 1).every((change) => change >= 0)).toBe(true);
        expect(result.points[confirmation - 1].month).toBe(confirmation);
        expect(result.points[confirmation - 1].duration).toBe(2);
        expect(result.points[confirmation].duration).toBeCloseTo(10 / 3, 10);
        expect(result.points[confirmation + 4].duration).toBeCloseTo(26 / 3, 10);
        expect(result.points[confirmation + 5].duration).toBe(10);
      },
    );

    it("the no-cut scenario actually contains no cuts and rises 0.45 percentage points", () => {
      const scenario = findScenario("higher-for-longer")!;
      expect(scenario.rateChanges.every((change) => change >= 0)).toBe(true);
      expect(scenario.rateChanges.reduce((sum, change) => sum + change, 0)).toBeCloseTo(0.45, 10);
      expect(scenario.confirmMonth).toBeNull();
    });
  });

  describe("supported input boundaries", () => {
    it.each(["on-time", "delayed", "higher-for-longer"] as ScenarioId[])(
      "%s remains finite across every displayed input corner", (scenarioId) => {
        for (const startDuration of [0, 30]) for (const targetDuration of [0, 30]) for (const carryPct of [0, 15]) {
          const results = simulateAll({ startDuration, targetDuration, carryPct, scenarioId });
          for (const result of results) {
            expect(Number.isFinite(result.totalReturn)).toBe(true);
            expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
            expect(result.maxDrawdown).toBeLessThanOrEqual(18.0000000001);
            expect(result.points.map((point) => point.month)).toEqual(Array.from({ length: 24 }, (_, index) => index + 1));
            for (const point of result.points) {
              expect(Number.isFinite(point.monthlyReturn)).toBe(true);
              expect(Number.isFinite(point.cumReturn)).toBe(true);
              expect(point.duration).toBeGreaterThanOrEqual(Math.min(startDuration, targetDuration));
              expect(point.duration).toBeLessThanOrEqual(Math.max(startDuration, targetDuration));
            }
          }
        }
      },
    );

    it("zero duration isolates non-compounded carry at 0% and 30% over two years", () => {
      for (const carryPct of [0, 15]) {
        for (const result of simulateAll({ ...DEFAULT_INPUTS, startDuration: 0, targetDuration: 0, carryPct })) {
          expect(result.totalReturn).toBe(carryPct * 2);
          expect(result.maxDrawdown).toBe(0);
        }
      }
    });

    it("equal starting and target durations remove all timing differences", () => {
      const results = simulateAll({ ...DEFAULT_INPUTS, startDuration: 30, targetDuration: 30, carryPct: 15 });
      for (const result of results) expect(result.totalReturn).toBeCloseTo(97.5, 10);
      expect(results[1].points).toEqual(results[0].points);
      expect(results[2].points).toEqual(results[0].points);
    });

    it("rejects nonfinite and out-of-range model inputs", () => {
      for (const patch of [{ startDuration: -1 }, { targetDuration: 31 }, { carryPct: 16 }, { carryPct: Infinity }, { targetDuration: NaN }]) {
        expect(() => simulateAll({ ...DEFAULT_INPUTS, ...patch })).toThrow(RangeError);
      }
    });
  });

  it("renders the corrected default, additive assumptions and 0–24 month charts consistently", () => {
    const html = renderToStaticMarkup(createElement(DurationStagger));
    expect(html).toContain("31.5");
    expect(html).toContain("added without compounding");
    expect(html).toContain("same fixed carry");
    expect(html).toContain("percentage fall from prior peak wealth");
    expect(html).toContain("first cut is observed at month 7");
    expect(html).toContain("monthly yield cuts end in months 7–12");
    expect(html.match(/>m24</g)).toHaveLength(2);
    expect(html).not.toContain(">m23<");
    expect(html.match(/d="M 38 /g)).toHaveLength(4);
  });
});
