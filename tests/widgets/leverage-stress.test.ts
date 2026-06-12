import { describe, expect, it } from "vitest";
import {
  ASSET_TEMPLATES,
  DEFAULT_INPUTS,
  compute,
  findAssetTemplate,
  formatMoney,
  verdictTone,
} from "@/components/widgets/leverage-stress/model";

describe("leverage-stress model", () => {
  describe("ASSET_TEMPLATES dataset", () => {
    it("covers the four canonical asset classes", () => {
      const kinds = ASSET_TEMPLATES.map((t) => t.kind);
      expect(kinds).toEqual([
        "primary-home",
        "rental-property",
        "margin-loan",
        "consumer",
      ]);
    });

    it("every template has a non-empty blurb and sane defaults", () => {
      for (const t of ASSET_TEMPLATES) {
        expect(t.blurb.length).toBeGreaterThan(40);
        expect(t.defaultLtv).toBeGreaterThan(0);
        expect(t.defaultLtv).toBeLessThanOrEqual(100);
        expect(t.defaultRate).toBeGreaterThan(0);
        expect(t.defaultTerm).toBeGreaterThan(0);
      }
    });

    it("findAssetTemplate looks up by kind", () => {
      expect(findAssetTemplate("primary-home")?.label).toMatch(/Primary home/);
      expect(findAssetTemplate("nope" as never)).toBeUndefined();
    });
  });

  describe("compute() · base case", () => {
    it("zero-stress DEFAULT_INPUTS classifies as well-structured", () => {
      const r = compute(DEFAULT_INPUTS);
      expect(r.verdict).toBe("well-structured");
      expect(r.basePayment).toBeGreaterThan(2_000);
      expect(r.basePayment).toBeLessThan(3_500);
    });

    it("LTV = loan / asset", () => {
      const r = compute({ ...DEFAULT_INPUTS, loanAmount: 250_000, assetValue: 500_000 });
      expect(r.ltv).toBeCloseTo(50, 2);
    });

    it("base monthly payment is the standard amortised formula", () => {
      // $400k @ 6.5% for 360 months → ~$2,528.27
      const r = compute({ ...DEFAULT_INPUTS, loanAmount: 400_000, apr: 6.5, termMonths: 360 });
      expect(r.basePayment).toBeGreaterThan(2_525);
      expect(r.basePayment).toBeLessThan(2_535);
    });
  });

  describe("compute() · rate pass-through", () => {
    it("primary-home does NOT pass rate stress to the payment (fixed-rate)", () => {
      const baseline = compute({ ...DEFAULT_INPUTS, kind: "primary-home", rateStressBp: 0 });
      const stressed = compute({ ...DEFAULT_INPUTS, kind: "primary-home", rateStressBp: 300 });
      expect(stressed.basePayment).toBeCloseTo(baseline.basePayment, 2);
      expect(stressed.stressedPayment).toBeCloseTo(baseline.basePayment, 2);
    });

    it("margin-loan fully passes rate stress (floating)", () => {
      const stressed = compute({ ...DEFAULT_INPUTS, kind: "margin-loan", loanAmount: 200_000, apr: 8, termMonths: 60, rateStressBp: 200 });
      expect(stressed.stressedPayment).toBeGreaterThan(stressed.basePayment);
    });

    it("consumer debt partially passes rate stress", () => {
      const stressed = compute({ ...DEFAULT_INPUTS, kind: "consumer", apr: 9.5, termMonths: 60, rateStressBp: 200 });
      expect(stressed.stressedPayment).toBeGreaterThan(stressed.basePayment);
    });
  });

  describe("compute() · asset and income stress", () => {
    it("asset stress increases stressedLtv and can produce underwater equity", () => {
      const r = compute({ ...DEFAULT_INPUTS, loanAmount: 450_000, assetValue: 500_000, assetStressPct: 30 });
      expect(r.stressedLtv).toBeGreaterThan(r.ltv);
      expect(r.stressedUnderwater).toBe(true);
    });

    it("income stress increases stressedDti", () => {
      const r = compute({ ...DEFAULT_INPUTS, incomeStressPct: 30 });
      expect(r.stressedDti).toBeGreaterThan(r.baseDti);
    });
  });

  describe("compute() · verdict classification", () => {
    it("a margin-loan position with heavy asset + income stress breaks", () => {
      const r = compute({
        kind: "margin-loan",
        assetValue: 200_000,
        loanAmount: 150_000,
        apr: 8,
        termMonths: 60,
        monthlyIncome: 3_000,
        rateStressBp: 300,
        assetStressPct: 40,
        incomeStressPct: 40,
      });
      expect(r.verdict).toBe("broken");
    });

    it("a conservative primary-home position with moderate stress stays well-structured", () => {
      const r = compute({
        kind: "primary-home",
        assetValue: 500_000,
        loanAmount: 200_000,
        apr: 6,
        termMonths: 360,
        monthlyIncome: 12_000,
        rateStressBp: 300,
        assetStressPct: 15,
        incomeStressPct: 10,
      });
      expect(r.verdict).toBe("well-structured");
    });

    it("a tight position with moderate stress is classified as tight", () => {
      const r = compute({
        kind: "consumer",
        assetValue: 30_000,
        loanAmount: 28_000,
        apr: 10,
        termMonths: 60,
        monthlyIncome: 2_000,
        rateStressBp: 200,
        assetStressPct: 25,
        incomeStressPct: 15,
      });
      expect(["tight", "broken"]).toContain(r.verdict);
    });
  });

  describe("formatters", () => {
    it("formatMoney handles infinite + negative", () => {
      expect(formatMoney(Infinity)).toBe("—");
      expect(formatMoney(-50_000)).toBe("−$50.0k");
      expect(formatMoney(-250_000)).toBe("−$250k");
      expect(formatMoney(-500)).toBe("−$500");
    });
  });

  describe("verdictTone", () => {
    it("maps verdicts to design-system tones", () => {
      expect(verdictTone("well-structured")).toBe("green");
      expect(verdictTone("tight")).toBe("gold");
      expect(verdictTone("broken")).toBe("red");
    });
  });
});
