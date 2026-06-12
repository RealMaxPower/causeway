import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  giniFromDeciles,
  lorenzPoints,
} from "@/components/widgets/lorenz/model";

describe("lorenz model", () => {
  describe("giniFromDeciles", () => {
    it("returns 0 for perfect equality", () => {
      const equal = Array(10).fill(10);
      expect(giniFromDeciles(equal)).toBeCloseTo(0, 2);
    });

    it("returns close to 1 for extreme concentration", () => {
      const concentrated = [0, 0, 0, 0, 0, 0, 0, 0, 0, 100];
      const g = giniFromDeciles(concentrated);
      expect(g).toBeGreaterThan(0.85);
      expect(g).toBeLessThan(1);
    });

    it("Sweden has lower Gini than Brazil", () => {
      const sweden = COUNTRIES.find((c) => c.name.startsWith("Sweden"))!;
      const brazil = COUNTRIES.find((c) => c.name.startsWith("Brazil"))!;
      expect(giniFromDeciles(sweden.deciles)).toBeLessThan(
        giniFromDeciles(brazil.deciles),
      );
    });

    it("South Africa has the highest Gini in the dataset", () => {
      const all = COUNTRIES.map((c) => ({ name: c.name, gini: giniFromDeciles(c.deciles) }));
      const sorted = [...all].sort((a, b) => b.gini - a.gini);
      expect(sorted[0].name).toMatch(/South Africa/);
    });
  });

  describe("lorenzPoints", () => {
    it("starts at (0, 0)", () => {
      const sweden = COUNTRIES[0];
      const pts = lorenzPoints(sweden.deciles);
      expect(pts[0]).toEqual({ x: 0, y: 0 });
    });

    it("ends at (1, ~1)", () => {
      const sweden = COUNTRIES[0];
      const pts = lorenzPoints(sweden.deciles);
      const last = pts[pts.length - 1];
      expect(last.x).toBe(1);
      // Decile dataset is approximate (postwar income shares from various
      // sources); allow ~1% slop from exactly 1.0.
      expect(last.y).toBeGreaterThan(0.99);
      expect(last.y).toBeLessThanOrEqual(1.01);
    });

    it("is monotonically non-decreasing in y", () => {
      for (const country of COUNTRIES) {
        const pts = lorenzPoints(country.deciles);
        for (let i = 1; i < pts.length; i++) {
          expect(pts[i].y).toBeGreaterThanOrEqual(pts[i - 1].y);
        }
      }
    });
  });

  describe("COUNTRIES dataset", () => {
    it("each country's deciles sum to ~100 (allowing 1pp slop in the source data)", () => {
      for (const country of COUNTRIES) {
        const sum = country.deciles.reduce((s, v) => s + v, 0);
        expect(sum).toBeGreaterThanOrEqual(99);
        expect(sum).toBeLessThanOrEqual(101);
      }
    });

    it("provides six country snapshots", () => {
      expect(COUNTRIES).toHaveLength(6);
    });

    it("top-1 share is always between 5% and 25%", () => {
      for (const c of COUNTRIES) {
        expect(c.top1).toBeGreaterThanOrEqual(5);
        expect(c.top1).toBeLessThanOrEqual(25);
      }
    });

    it("median/mean ratio is always less than 1 (right-skewed)", () => {
      for (const c of COUNTRIES) {
        expect(c.median).toBeLessThan(1);
        expect(c.median).toBeGreaterThan(0);
      }
    });
  });
});
