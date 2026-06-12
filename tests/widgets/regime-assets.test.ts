import { describe, expect, it } from "vitest";
import {
  ASSETS,
  REGIMES,
  findRegime,
  sixtyFortyReturn,
  verdictsFor,
} from "@/components/widgets/regime-assets/model";

describe("regime-assets dataset", () => {
  it("covers the four canonical regimes", () => {
    const keys = REGIMES.map((r) => r.key);
    expect(keys).toEqual([
      "disinflationary-boom",
      "disinflationary-bust",
      "inflationary-boom",
      "stagflation",
    ]);
  });

  it("every asset has a return entry for every regime", () => {
    for (const asset of ASSETS) {
      for (const regime of REGIMES) {
        expect(typeof asset.returns[regime.key]).toBe("number");
      }
    }
  });

  it("includes the six canonical asset classes", () => {
    const keys = ASSETS.map((a) => a.key);
    expect(keys.sort()).toEqual(
      ["cash", "commodities", "gold", "long-bonds", "stocks", "tips"].sort(),
    );
  });

  it("findRegime returns the matching entry or undefined", () => {
    expect(findRegime("stagflation")?.short).toBe("Stagflation");
    expect(findRegime("nonsense")).toBeUndefined();
  });
});

describe("verdictsFor()", () => {
  it("stocks dominate the disinflationary boom (rank 1)", () => {
    const verdicts = verdictsFor("disinflationary-boom");
    expect(verdicts[0].asset.key).toBe("stocks");
    expect(verdicts[0].rank).toBe(1);
  });

  it("long bonds dominate the disinflationary bust", () => {
    const verdicts = verdictsFor("disinflationary-bust");
    expect(verdicts[0].asset.key).toBe("long-bonds");
  });

  it("gold dominates stagflation", () => {
    const verdicts = verdictsFor("stagflation");
    expect(verdicts[0].asset.key).toBe("gold");
  });

  it("rankings cover 1..N with no duplicates and no gaps", () => {
    for (const r of REGIMES) {
      const ranks = verdictsFor(r.key)
        .map((v) => v.rank)
        .sort();
      expect(ranks).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it("tone classification matches return magnitude", () => {
    for (const r of REGIMES) {
      for (const v of verdictsFor(r.key)) {
        if (v.returnPct >= 5) expect(v.tone).toBe("green");
        else if (v.returnPct <= -3) expect(v.tone).toBe("red");
        else expect(v.tone).toBe("gold");
      }
    }
  });
});

describe("sixtyFortyReturn()", () => {
  it("disinflationary boom is the 60/40 happy place (positive)", () => {
    expect(sixtyFortyReturn("disinflationary-boom")).toBeGreaterThan(5);
  });

  it("stagflation breaks 60/40 (negative)", () => {
    expect(sixtyFortyReturn("stagflation")).toBeLessThan(-3);
  });

  it("disinflationary bust: bonds save 60/40 (positive overall)", () => {
    expect(sixtyFortyReturn("disinflationary-bust")).toBeGreaterThan(0);
  });

  it("equals 0.6*stocks + 0.4*bonds", () => {
    for (const r of REGIMES) {
      const stocks = ASSETS.find((a) => a.key === "stocks")!.returns[r.key];
      const bonds = ASSETS.find((a) => a.key === "long-bonds")!.returns[r.key];
      expect(sixtyFortyReturn(r.key)).toBeCloseTo(0.6 * stocks + 0.4 * bonds, 6);
    }
  });
});
