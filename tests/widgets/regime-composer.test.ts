import { describe, expect, it } from "vitest";
import {
  DEFAULT_INPUTS,
  PRESETS,
  compose,
  signalTone,
} from "@/components/widgets/regime-composer/model";

describe("regime-composer model", () => {
  describe("compose()", () => {
    it("DEFAULT_INPUTS produces a 3-of-4 high-confidence read", () => {
      const r = compose(DEFAULT_INPUTS);
      expect(r.total).toBe(4);
      expect(r.confirming).toBeGreaterThanOrEqual(3);
      expect(r.confidence).toMatch(/High-confidence/i);
    });

    it("2009 trough is correctly classified across all four axes", () => {
      const r = compose({ inflation: 0.5, fedFunds: 0.2, unemployment: 10, sloos: 65 });
      // Inflation: 0.5 ≤ 2.2 → loose
      // Money: 0.2 < 2 → loose
      // Labor: 10 ≥ 5.5 → loose (slack open)
      // Credit: 65 > 20 → tight
      const byKey = Object.fromEntries(r.axes.map((a) => [a.key, a.signal]));
      expect(byKey.inflation).toBe("loose");
      expect(byKey.money).toBe("loose");
      expect(byKey.labor).toBe("loose");
      expect(byKey.credit).toBe("tight");
    });

    it("2022 inflation surge tags inflation as tight, labor as tight (low U-rate)", () => {
      const r = compose({ inflation: 8, fedFunds: 2.5, unemployment: 3.6, sloos: 25 });
      const byKey = Object.fromEntries(r.axes.map((a) => [a.key, a.signal]));
      expect(byKey.inflation).toBe("tight");
      expect(byKey.labor).toBe("tight"); // U-3 < 4.5
      expect(byKey.credit).toBe("tight"); // SLOOS > 20
    });

    it("axes always count to exactly 4", () => {
      for (const p of PRESETS) {
        const r = compose(p.inputs);
        expect(r.axes).toHaveLength(4);
        expect(r.total).toBe(4);
      }
    });

    it("confirming count is bounded [0, 4]", () => {
      for (const p of PRESETS) {
        const r = compose(p.inputs);
        expect(r.confirming).toBeGreaterThanOrEqual(0);
        expect(r.confirming).toBeLessThanOrEqual(4);
      }
    });

    it("headline is always four space-separated words/phrases", () => {
      for (const p of PRESETS) {
        const r = compose(p.inputs);
        const parts = r.headline.split(" · ");
        expect(parts).toHaveLength(4);
        for (const part of parts) {
          expect(part.length).toBeGreaterThan(0);
        }
      }
    });

    it("axis.value is rounded to 1 decimal", () => {
      const r = compose({ inflation: 2.567, fedFunds: 4.111, unemployment: 4.099, sloos: -3.0001 });
      for (const a of r.axes) {
        // Value is the rounded number; multiplying by 10 should produce an integer.
        expect(Number.isInteger(a.value * 10)).toBe(true);
      }
    });

    it("confidence text shifts with the confirming count", () => {
      const high = compose({ inflation: 2.5, fedFunds: 4, unemployment: 4, sloos: -5 });
      const turning = compose({ inflation: 2.5, fedFunds: 4, unemployment: 6, sloos: 10 });
      const low = compose({ inflation: 8, fedFunds: 1, unemployment: 7, sloos: 30 });
      expect(high.confidence).toMatch(/High-confidence/i);
      expect(turning.confidence).toMatch(/turning|mixed|transitional/i);
      // 'low' confirms zero axes
      expect(low.confirming).toBe(0);
    });
  });

  describe("PRESETS dataset", () => {
    it("includes the five canonical scenarios", () => {
      const ids = PRESETS.map((p) => p.id);
      expect(ids).toEqual(["current", "2022", "2009", "1979", "1998"]);
    });

    it("'current' preset matches DEFAULT_INPUTS", () => {
      const current = PRESETS.find((p) => p.id === "current");
      expect(current?.inputs).toEqual(DEFAULT_INPUTS);
    });

    it("every preset has a non-empty blurb", () => {
      for (const p of PRESETS) {
        expect(p.blurb.length).toBeGreaterThan(40);
      }
    });
  });

  describe("signalTone", () => {
    it("maps signals to design-system tones", () => {
      expect(signalTone("tight")).toBe("red");
      expect(signalTone("neutral")).toBe("gold");
      expect(signalTone("loose")).toBe("green");
    });
  });
});
