import { describe, expect, it } from "vitest";
import {
  PRESETS,
  classify,
  type Drivers,
} from "@/components/widgets/inflation-quadrant/model";

const balanced: Drivers = { demand: 50, supply: 50, expectations: 30, fiscal: 40 };

describe("inflation-quadrant model", () => {
  describe("classify", () => {
    it("returns four numeric driver-contribution parts", () => {
      const r = classify(balanced);
      expect(r.parts.demandPull).toBeGreaterThan(0);
      expect(r.parts.costPush).toBeGreaterThan(0);
      expect(r.parts.expContrib).toBeGreaterThan(0);
      expect(r.parts.fiscalContrib).toBeGreaterThan(0);
    });

    it("yPct < 50 and xPct >= 50 → Demand-pull", () => {
      const r = classify({ demand: 80, supply: 20, expectations: 20, fiscal: 20 });
      expect(r.regime).toBe("Demand-pull");
      expect(r.yPct).toBeLessThan(50);
      expect(r.xPct).toBeGreaterThanOrEqual(50);
    });

    it("yPct < 50 and xPct < 50 → Cost-push", () => {
      const r = classify({ demand: 20, supply: 80, expectations: 20, fiscal: 20 });
      expect(r.regime).toBe("Cost-push");
      expect(r.yPct).toBeLessThan(50);
      expect(r.xPct).toBeLessThan(50);
    });

    it("yPct >= 50 and xPct >= 50 → Expectations-driven", () => {
      const r = classify({ demand: 80, supply: 20, expectations: 90, fiscal: 90 });
      expect(r.regime).toBe("Expectations-driven");
      expect(r.yPct).toBeGreaterThanOrEqual(50);
      expect(r.xPct).toBeGreaterThanOrEqual(50);
    });

    it("yPct >= 50 and xPct < 50 → Fiscal-dominant", () => {
      const r = classify({ demand: 20, supply: 80, expectations: 90, fiscal: 90 });
      expect(r.regime).toBe("Fiscal-dominant");
      expect(r.yPct).toBeGreaterThanOrEqual(50);
      expect(r.xPct).toBeLessThan(50);
    });

    it("xPct increases monotonically with demand share", () => {
      const lo = classify({ demand: 10, supply: 80, expectations: 20, fiscal: 20 }).xPct;
      const mid = classify({ demand: 50, supply: 50, expectations: 20, fiscal: 20 }).xPct;
      const hi = classify({ demand: 80, supply: 10, expectations: 20, fiscal: 20 }).xPct;
      expect(mid).toBeGreaterThan(lo);
      expect(hi).toBeGreaterThan(mid);
    });

    it("each regime gets a non-empty cure description", () => {
      for (const drivers of [
        { demand: 80, supply: 20, expectations: 20, fiscal: 20 } as Drivers,
        { demand: 20, supply: 80, expectations: 20, fiscal: 20 } as Drivers,
        { demand: 80, supply: 20, expectations: 90, fiscal: 90 } as Drivers,
        { demand: 20, supply: 80, expectations: 90, fiscal: 90 } as Drivers,
      ]) {
        expect(classify(drivers).cure.length).toBeGreaterThan(20);
      }
    });

    it("returns a sensible headline (~ 1.2 floor at zero drivers, rising with all four)", () => {
      const floor = classify({ demand: 0, supply: 0, expectations: 0, fiscal: 0 }).headline;
      const hot = classify({ demand: 100, supply: 100, expectations: 100, fiscal: 100 }).headline;
      expect(floor).toBeCloseTo(1.2, 1);
      expect(hot).toBeGreaterThan(floor);
    });
  });

  describe("presets", () => {
    it("provides five named historical snapshots", () => {
      expect(PRESETS).toHaveLength(5);
      const names = PRESETS.map((p) => p.name);
      expect(names).toContain("2022 spike");
      expect(names).toContain("1970s stag");
      expect(names).toContain("Argentina 2024");
    });

    it("2022 spike classifies into a hot regime (not Idle)", () => {
      const p = PRESETS.find((p) => p.name === "2022 spike")!;
      const r = classify({
        demand: p.demand,
        supply: p.supply,
        expectations: p.expectations,
        fiscal: p.fiscal,
      });
      expect(r.headline).toBeGreaterThan(8);
    });

    it("Argentina 2024 classifies as Expectations-driven or Fiscal-dominant", () => {
      const p = PRESETS.find((p) => p.name === "Argentina 2024")!;
      const r = classify({
        demand: p.demand,
        supply: p.supply,
        expectations: p.expectations,
        fiscal: p.fiscal,
      });
      expect(["Expectations-driven", "Fiscal-dominant"]).toContain(r.regime);
    });
  });
});
