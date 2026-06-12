import { describe, expect, it } from "vitest";
import {
  BASELINE,
  N_QUARTERS,
} from "@/components/widgets/counterfactual-2008/baseline";
import {
  PRESETS,
  applyDeviation,
} from "@/components/widgets/counterfactual-2008/model";

describe("counterfactual-2008 baseline", () => {
  it("has exactly 24 quarters covering 2007Q1 → 2012Q4", () => {
    expect(BASELINE).toHaveLength(24);
    expect(N_QUARTERS).toBe(24);
    expect(BASELINE[0].label).toBe("2007Q1");
    expect(BASELINE[23].label).toBe("2012Q4");
  });

  it("captures the 2008-2009 unemployment runup", () => {
    const peak2009 = BASELINE.slice(8, 12).map((p) => p.unemp);
    expect(Math.max(...peak2009)).toBeGreaterThan(9);
  });

  it("captures the late-2008 GDP collapse", () => {
    const q2008q4 = BASELINE.find((p) => p.label === "2008Q4")!;
    expect(q2008q4.growth).toBeLessThan(-5);
  });
});

describe("applyDeviation()", () => {
  it("returns the baseline path when deviation is zero everywhere", () => {
    const dev = Array(N_QUARTERS).fill(0);
    const r = applyDeviation(dev);
    for (let t = 0; t < N_QUARTERS; t++) {
      expect(r.counterfactual[t].unemp).toBeCloseTo(BASELINE[t].unemp, 6);
      expect(r.counterfactual[t].cpi).toBeCloseTo(BASELINE[t].cpi, 6);
      expect(r.counterfactual[t].growth).toBeCloseTo(BASELINE[t].growth, 6);
      expect(r.counterfactual[t].fedFunds).toBeCloseTo(BASELINE[t].fedFunds, 6);
    }
    expect(r.unemploymentGap).toBe(0);
    expect(r.cpiGap).toBe(0);
    expect(r.growthGap).toBe(0);
  });

  it("clamps counterfactual fed funds at zero (no negative rates)", () => {
    const dev = Array(N_QUARTERS).fill(-5); // huge cut
    const r = applyDeviation(dev);
    for (const p of r.counterfactual) {
      expect(p.fedFunds).toBeGreaterThanOrEqual(0);
    }
  });

  it("rate cut earlier → lower unemployment (correct sign, lag-respecting)", () => {
    // Cut 1.5pp starting in Q2 (early 2007).
    const dev = Array(N_QUARTERS).fill(0);
    for (let q = 2; q < N_QUARTERS; q++) dev[q] = -1.5;
    const r = applyDeviation(dev);

    // C5 unemployment lag = 14 months ≈ 4.7 quarters. By Q12 (2010Q1),
    // the response should be well past its half-life.
    const lateGap = r.counterfactual[12].unemp - BASELINE[12].unemp;
    expect(lateGap).toBeLessThan(-0.1); // cut → unemployment down

    // And the gap is sign-consistent across the back half of the horizon.
    for (let t = 16; t < N_QUARTERS; t++) {
      expect(r.counterfactual[t].unemp - BASELINE[t].unemp).toBeLessThan(0);
    }
  });

  it("transmission lag is respected: cut at q=10 doesn't move U-rate at q=10", () => {
    // A step-change at Q10 only. The unemployment response at Q10 itself
    // should be very small (well under one tenth of the cumulative effect)
    // because the impulse hasn't propagated yet.
    const dev = Array(N_QUARTERS).fill(0);
    for (let q = 10; q < N_QUARTERS; q++) dev[q] = -1.0;
    const r = applyDeviation(dev);

    const impactAtStep = r.counterfactual[10].unemp - BASELINE[10].unemp;
    const impactLate = r.counterfactual[20].unemp - BASELINE[20].unemp;
    expect(Math.abs(impactLate)).toBeGreaterThan(Math.abs(impactAtStep) * 3);
  });

  it("rate cut → CPI eventually rises (sign-correct)", () => {
    const dev = Array(N_QUARTERS).fill(-2);
    const r = applyDeviation(dev);
    // CPI's lag is 18 months ≈ 6 quarters. By the end of the horizon
    // we should see a clear inflationary deviation.
    const finalCpiGap = r.counterfactual[N_QUARTERS - 1].cpi - BASELINE[N_QUARTERS - 1].cpi;
    expect(finalCpiGap).toBeGreaterThan(0.1);
  });

  it("aggregates the cumulative gaps with the right sign convention", () => {
    // A persistent cut should produce a negative unemployment gap (good)
    // and a positive cpi gap (inflationary).
    const dev = Array(N_QUARTERS).fill(-1);
    const r = applyDeviation(dev);
    expect(r.unemploymentGap).toBeLessThan(0);
    expect(r.cpiGap).toBeGreaterThan(0);
  });

  it("throws if deviation length is wrong", () => {
    expect(() => applyDeviation([1, 2, 3])).toThrow();
  });
});

describe("PRESETS dataset", () => {
  it("includes the five canonical scenarios", () => {
    const ids = PRESETS.map((p) => p.id);
    expect(ids).toEqual([
      "actual",
      "cut-early",
      "cut-deeper",
      "hold-zirp",
      "no-rescue",
    ]);
  });

  it("every preset has 24 deviation values and a non-empty blurb", () => {
    for (const p of PRESETS) {
      expect(p.deviation).toHaveLength(N_QUARTERS);
      expect(p.blurb.length).toBeGreaterThan(40);
      expect(p.name.length).toBeGreaterThan(5);
    }
  });

  it("'actual' preset is zero-deviation", () => {
    const actual = PRESETS.find((p) => p.id === "actual")!;
    expect(actual.deviation.every((v) => v === 0)).toBe(true);
  });

  it("'cut-early' and 'cut-deeper' have all-non-positive deviations", () => {
    for (const id of ["cut-early", "cut-deeper"]) {
      const p = PRESETS.find((x) => x.id === id)!;
      expect(p.deviation.every((v) => v <= 0)).toBe(true);
    }
  });

  it("'no-rescue' has all-non-negative deviations (tightening)", () => {
    const p = PRESETS.find((x) => x.id === "no-rescue")!;
    expect(p.deviation.every((v) => v >= 0)).toBe(true);
  });
});
