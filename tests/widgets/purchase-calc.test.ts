import { describe, expect, it } from "vitest";
import {
  DEFAULT_INPUTS,
  PRESETS,
  compute,
  formatMoney,
  leverLabel,
} from "@/components/widgets/purchase-calc/model";

describe("purchase-calc model", () => {
  describe("compute()", () => {
    it("negotiated price = list − (list*discount + incentive)", () => {
      const r = compute({ ...DEFAULT_INPUTS, listPrice: 40_000, discountPct: 5, incentive: 1_000 });
      // 40000 * 0.05 = 2000; + 1000 = 3000; 40000 - 3000 = 37000
      expect(r.negotiatedPrice).toBeCloseTo(37_000, 2);
      expect(r.totalDiscount).toBeCloseTo(3_000, 2);
    });

    it("amount financed = negotiated − down payment, clamped at zero", () => {
      const r1 = compute({ ...DEFAULT_INPUTS, downPayment: 10_000 });
      // negotiated = 40000 - (40000*.03 + 1500) = 40000 - 2700 = 37300; - 10000 = 27300
      expect(r1.amountFinanced).toBeCloseTo(27_300, 2);

      const r2 = compute({ ...DEFAULT_INPUTS, downPayment: 100_000 });
      expect(r2.amountFinanced).toBe(0);
    });

    it("paying cash (apr=0) produces zero interest", () => {
      const r = compute({ ...DEFAULT_INPUTS, apr: 0 });
      expect(r.totalInterest).toBe(0);
      expect(r.monthlyPayment).toBeGreaterThan(0); // amortised principal-only
    });

    it("monthly payment formula matches standard amortisation", () => {
      const r = compute({ listPrice: 30_000, discountPct: 0, incentive: 0, apr: 6, termMonths: 60, downPayment: 0 });
      // P = $30,000, r = 0.005, n = 60 → payment ≈ $579.98
      expect(r.monthlyPayment).toBeGreaterThan(579);
      expect(r.monthlyPayment).toBeLessThan(581);
      expect(r.totalInterest).toBeGreaterThan(4_700);
      expect(r.totalInterest).toBeLessThan(4_900);
    });

    it("all-in cost = negotiated + interest", () => {
      const r = compute(DEFAULT_INPUTS);
      expect(r.allInCost).toBeCloseTo(r.negotiatedPrice + r.totalInterest, 2);
    });

    it("vsListPct is positive when all-in cost is below list, negative when above", () => {
      const cheap = compute({ ...DEFAULT_INPUTS, apr: 0, discountPct: 10, incentive: 3_000 });
      expect(cheap.vsListPct).toBeGreaterThan(0);

      const expensive = compute({ ...DEFAULT_INPUTS, apr: 14, termMonths: 84, discountPct: 0, incentive: 0 });
      expect(expensive.vsListPct).toBeLessThan(0);
    });

    it("APR sensitivity: −1pp saves real money over a long term", () => {
      const r = compute({ ...DEFAULT_INPUTS, apr: 7, termMonths: 72 });
      // A 1pp APR drop on a typical financed amount over 72 months should
      // save several hundred dollars at minimum.
      expect(Math.abs(r.sensitivity.perPctAprDrop)).toBeGreaterThan(200);
    });

    it("zero-term loan yields no monthly payment and no interest", () => {
      const r = compute({ ...DEFAULT_INPUTS, termMonths: 0, downPayment: 40_000 });
      expect(r.monthlyPayment).toBe(0);
      expect(r.totalInterest).toBe(0);
    });

    it("incentive sensitivity equals $1,000 exactly when financing is fully covered", () => {
      // If down payment fully covers the negotiated price + $1k, the
      // marginal saving from +$1k incentive is exactly $1k.
      const r = compute({ listPrice: 40_000, discountPct: 0, incentive: 0, apr: 5, termMonths: 60, downPayment: 50_000 });
      // amount financed = 0, so an extra $1k incentive saves $1k flat.
      expect(r.sensitivity.perThousandIncentive).toBeCloseTo(1000, 2);
    });

    it("biggestLever is one of the four valid tokens", () => {
      for (const p of PRESETS) {
        const r = compute(p.inputs);
        expect(["apr", "incentive", "list", "balanced"]).toContain(r.biggestLever);
      }
    });
  });

  describe("PRESETS dataset", () => {
    it("includes the four canonical scenarios", () => {
      expect(PRESETS.map((p) => p.id)).toEqual(["tight", "balanced", "soft", "cash"]);
    });

    it("every preset has a non-empty blurb", () => {
      for (const p of PRESETS) expect(p.blurb.length).toBeGreaterThan(40);
    });

    it("cash preset has apr = 0", () => {
      const cash = PRESETS.find((p) => p.id === "cash")!;
      expect(cash.inputs.apr).toBe(0);
    });
  });

  describe("formatters and labels", () => {
    it("formatMoney scales with magnitude", () => {
      expect(formatMoney(500)).toBe("$500");
      expect(formatMoney(15_000)).toBe("$15.0k");
      expect(formatMoney(120_000)).toBe("$120k");
    });

    it("leverLabel returns a label for each variant", () => {
      expect(leverLabel("apr")).toMatch(/APR/);
      expect(leverLabel("incentive")).toMatch(/incentive/i);
      expect(leverLabel("list")).toMatch(/list/i);
      expect(leverLabel("balanced")).toMatch(/balanced/i);
    });
  });
});
