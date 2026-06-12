import { describe, expect, it } from "vitest";
import {
  REGIME_PRESETS,
  regimeCaption,
  regimeName,
  smileFor,
} from "@/components/widgets/dollar-smile/model";

describe("dollar-smile model", () => {
  describe("smileFor", () => {
    it("is symmetric about the boring middle — both extremes raise DXY", () => {
      const middle = smileFor(0, 2);
      const usStrong = smileFor(2, 2);
      const riskOff = smileFor(0, 9);
      expect(usStrong).toBeGreaterThan(middle);
      expect(riskOff).toBeGreaterThan(middle);
    });

    it("applies a mild-middle penalty when both growth and risk are small", () => {
      const mild = smileFor(0, 1);
      const justOutside = smileFor(0.6, 1);
      // Mild gets a -3 penalty; growth contribution at 0.6 = +2.4. Diff ~5.4.
      expect(justOutside - mild).toBeGreaterThan(3);
    });

    it("DXY rises monotonically with US growth at fixed risk", () => {
      const r = 2;
      const at0 = smileFor(0, r);
      const at1 = smileFor(1, r);
      const at2 = smileFor(2, r);
      expect(at1).toBeGreaterThan(at0);
      expect(at2).toBeGreaterThan(at1);
    });

    it("DXY rises with risk at fixed growth", () => {
      const g = 1;
      const calm = smileFor(g, 0);
      const tense = smileFor(g, 5);
      const panic = smileFor(g, 10);
      expect(tense).toBeGreaterThan(calm);
      expect(panic).toBeGreaterThan(tense);
    });

    it("2022 preset (g=1.8, r=6) lands in a strong-dollar range", () => {
      const dxy = smileFor(1.8, 6);
      expect(dxy).toBeGreaterThan(105);
      expect(dxy).toBeLessThan(125);
    });
  });

  describe("regime presets", () => {
    it("includes six documented historical regimes", () => {
      expect(REGIME_PRESETS).toHaveLength(6);
    });

    it("each preset has a name, growth, risk, and explanatory label", () => {
      for (const p of REGIME_PRESETS) {
        expect(p.name).toBeTruthy();
        expect(typeof p.growth).toBe("number");
        expect(typeof p.risk).toBe("number");
        expect(p.label.length).toBeGreaterThan(10);
      }
    });

    it("the COVID spike has the highest risk", () => {
      const sorted = [...REGIME_PRESETS].sort((a, b) => b.risk - a.risk);
      expect(sorted[0].name).toMatch(/COVID/);
    });
  });

  describe("regimeName", () => {
    it("classifies risk > 6 as risk-off regardless of growth", () => {
      expect(regimeName(0, 7)).toBe("Risk-off rally");
      expect(regimeName(-2, 9)).toBe("Risk-off rally");
    });

    it("classifies high growth as US exceptionalism", () => {
      expect(regimeName(2, 3)).toBe("US exceptionalism");
    });

    it("classifies low growth + calm as dollar weakness", () => {
      expect(regimeName(-1, 2)).toBe("Dollar weakness");
    });

    it("classifies the middle as Mixed / drift", () => {
      expect(regimeName(0, 3)).toBe("Mixed / drift");
    });
  });

  describe("regimeCaption", () => {
    it("returns non-empty descriptive text for every quadrant", () => {
      expect(regimeCaption(0, 9).length).toBeGreaterThan(20);
      expect(regimeCaption(2, 2).length).toBeGreaterThan(20);
      expect(regimeCaption(0, 2).length).toBeGreaterThan(20);
      expect(regimeCaption(2, 7).length).toBeGreaterThan(20);
    });
  });
});
