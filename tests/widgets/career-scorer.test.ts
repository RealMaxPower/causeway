import { describe, expect, it } from "vitest";
import {
  DEFAULT_INPUTS,
  SECTORS,
  bandTone,
  phaseLabel,
  score,
} from "@/components/widgets/career-scorer/model";

describe("career-scorer model", () => {
  describe("SECTORS dataset", () => {
    it("covers all four cycle phases", () => {
      const phases = new Set(SECTORS.map((s) => s.phase));
      expect(phases.has("early")).toBe(true);
      expect(phases.has("mid")).toBe(true);
      expect(phases.has("late")).toBe(true);
      expect(phases.has("counter")).toBe(true);
    });

    it("counter-cyclical sectors have the highest base scores", () => {
      const counter = SECTORS.filter((s) => s.phase === "counter").map((s) => s.base);
      const early = SECTORS.filter((s) => s.phase === "early").map((s) => s.base);
      const counterAvg = counter.reduce((a, b) => a + b, 0) / counter.length;
      const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
      expect(counterAvg).toBeGreaterThan(earlyAvg);
    });

    it("every sector has a non-empty descriptive note", () => {
      for (const s of SECTORS) {
        expect(s.note.length).toBeGreaterThan(20);
      }
    });
  });

  describe("score()", () => {
    it("matches DEFAULT_INPUTS for the default tech profile", () => {
      const r = score(DEFAULT_INPUTS);
      expect(r.sectorName).toMatch(/Tech/);
      expect(r.phase).toBe("early");
      // 22 base + tenure 5*1.5=7.5 + skill 50%->10 + geo 50%->7.5 = 47
      expect(r.total).toBeCloseTo(47, 0);
    });

    it("clamps total at 100 even with maxed modifiers", () => {
      const r = score({
        sectorId: "healthcare",
        tenure: 50,
        skillLiquidity: 100,
        geoMobility: 100,
      });
      expect(r.total).toBeLessThanOrEqual(100);
      // healthcare base 38 + tenure 15 + skill 20 + geo 15 = 88
      expect(r.total).toBeCloseTo(88, 0);
    });

    it("classifies bands correctly", () => {
      const low = score({ sectorId: "retail", tenure: 0, skillLiquidity: 0, geoMobility: 0 });
      const high = score({ sectorId: "healthcare", tenure: 15, skillLiquidity: 90, geoMobility: 80 });
      expect(low.band).toBe("low");
      expect(high.band).toBe("strong");
    });

    it("tenure caps at 10 years (diminishing returns)", () => {
      const at10 = score({ ...DEFAULT_INPUTS, tenure: 10 });
      const at20 = score({ ...DEFAULT_INPUTS, tenure: 20 });
      expect(at10.contributions.tenure).toBeCloseTo(at20.contributions.tenure, 5);
    });

    it("skill liquidity scales linearly 0 → 20", () => {
      const at0 = score({ ...DEFAULT_INPUTS, skillLiquidity: 0 });
      const at100 = score({ ...DEFAULT_INPUTS, skillLiquidity: 100 });
      expect(at0.contributions.skillLiquidity).toBeCloseTo(0, 5);
      expect(at100.contributions.skillLiquidity).toBeCloseTo(20, 5);
    });

    it("geo mobility scales linearly 0 → 15", () => {
      const at0 = score({ ...DEFAULT_INPUTS, geoMobility: 0 });
      const at100 = score({ ...DEFAULT_INPUTS, geoMobility: 100 });
      expect(at0.contributions.geoMobility).toBeCloseTo(0, 5);
      expect(at100.contributions.geoMobility).toBeCloseTo(15, 5);
    });

    it("unknown sectorId falls back to first sector", () => {
      const r = score({ ...DEFAULT_INPUTS, sectorId: "nonexistent" });
      expect(r.sectorName).toBe(SECTORS[0].name);
    });

    it("advice text is non-empty for each phase", () => {
      for (const sectorId of ["tech", "manufacturing", "energy", "healthcare"]) {
        const r = score({ ...DEFAULT_INPUTS, sectorId });
        expect(r.advice.length).toBeGreaterThan(40);
      }
    });
  });

  describe("phaseLabel", () => {
    it("returns a human-readable phrase per phase", () => {
      expect(phaseLabel("early")).toBe("Early-cycle");
      expect(phaseLabel("mid")).toBe("Mid-cycle");
      expect(phaseLabel("late")).toBe("Late-cycle");
      expect(phaseLabel("counter")).toBe("Counter-cyclical");
    });
  });

  describe("bandTone", () => {
    it("maps bands to color tones", () => {
      expect(bandTone("low")).toBe("red");
      expect(bandTone("moderate")).toBe("gold");
      expect(bandTone("strong")).toBe("green");
    });
  });
});
