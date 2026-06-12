import { describe, expect, it } from "vitest";
import {
  DEFAULT_INPUTS,
  HORIZON_MONTHS,
  SCENARIOS,
  STRATEGIES,
  findScenario,
  simulateAll,
  simulateStrategy,
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

    it("on-time scenario produces positive total return (long duration captures the rally)", () => {
      const r = simulateStrategy("go-now", DEFAULT_INPUTS);
      expect(r.totalReturn).toBeGreaterThan(0);
    });

    it("higher-for-longer scenario produces negative or near-zero return", () => {
      const r = simulateStrategy("go-now", { ...DEFAULT_INPUTS, scenarioId: "higher-for-longer" });
      expect(r.totalReturn).toBeLessThan(5); // carry minus duration losses; should be modest
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
      for (let m = 0; m < scen.confirmMonth; m++) {
        expect(r.points[m].duration).toBe(DEFAULT_INPUTS.startDuration);
      }
    });

    it("never extends in the higher-for-longer scenario (confirm never arrives)", () => {
      const r = simulateStrategy("wait-confirmation", { ...DEFAULT_INPUTS, scenarioId: "higher-for-longer" });
      // confirmMonth is HORIZON_MONTHS in that scenario; durationAt never reaches target.
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

    it("stagger is rarely the best AND rarely the worst — the robustness claim", () => {
      // Across all three scenarios, stagger should never be the worst-performing
      // strategy; that's the whole point of the strategy.
      for (const scen of SCENARIOS) {
        const all = simulateAll({ ...DEFAULT_INPUTS, scenarioId: scen.id });
        const sorted = [...all].sort((a, b) => a.totalReturn - b.totalReturn);
        const worst = sorted[0].strategy.id;
        expect(worst).not.toBe("stagger");
      }
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
});
