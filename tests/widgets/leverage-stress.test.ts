import { describe, expect, it } from "vitest";
import {
  ASSET_TEMPLATES, DEFAULT_INPUTS, INCOME_LIMIT, POSITION_LIMIT, clampMoney, compute, findAssetTemplate, formatMoney,
  inputsForAsset, verdictTone, type AssetKind,
} from "@/components/widgets/leverage-stress/model";

const kinds: AssetKind[] = ["primary-home", "rental-property", "margin-loan", "consumer"];

describe("leverage-stress model", () => {
  it("uses finite upper and lower money bounds for all editable amount fields", () => {
    for (const maximum of [POSITION_LIMIT, INCOME_LIMIT] as const) {
      for (const invalid of [-1, -Infinity, NaN, Infinity]) expect(clampMoney(invalid, maximum)).toBe(0);
      expect(clampMoney(123.45, maximum)).toBe(123.45);
      expect(clampMoney(maximum, maximum)).toBe(maximum);
      expect(clampMoney(maximum + 1, maximum)).toBe(maximum);
      expect(clampMoney(1e308, maximum)).toBe(maximum);
    }
  });

  it("normalizes over-limit pure-model inputs before payments or ratios are computed", () => {
    const result = compute({ ...DEFAULT_INPUTS, assetValue: 1e308, loanAmount: 1e308,
      monthlyIncome: 1e308, apr: 0, termMonths: 12 });
    // Both position amounts cap at $50m; income caps at $500k per month.
    expect(result.ltv).toBe(100);
    expect(result.stressedEquity).toBe(0);
    expect(result.basePayment).toBeCloseTo(4_166_666.666666667, 8);
    expect(result.basePaymentToIncome).toBeCloseTo(833.333333333333, 8);
    expect(result.verdict).toBe("broken");
    const margin = compute({ ...inputsForAsset("margin-loan"), loanAmount: 1e308 });
    expect(margin.basePayment).toBeCloseTo(333_333.3333333333, 8);
    expect(Number.isFinite(margin.stressedPayment)).toBe(true);
  });

  it("normalizes nonfinite money independently without mutating the input", () => {
    for (const invalid of [NaN, Infinity, -Infinity]) {
      const input = { ...DEFAULT_INPUTS, assetValue: invalid, loanAmount: invalid, monthlyIncome: invalid };
      const result = compute(input);
      expect(result.basePayment).toBe(0);
      expect(result.stressedEquity).toBe(0);
      expect(result.verdict).toBe("well-structured");
      expect(Object.is(input.loanAmount, invalid)).toBe(true);
      expect(compute({ ...DEFAULT_INPUTS, monthlyIncome: invalid }).verdict).toBe("broken");
      expect(compute({ ...DEFAULT_INPUTS, assetValue: invalid }).stressedEquity).toBe(-400_000);
    }
  });

  it("defines four complete illustrative positions", () => {
    expect(ASSET_TEMPLATES.map((template) => template.kind)).toEqual(kinds);
    for (const template of ASSET_TEMPLATES) {
      expect(template.blurb.length).toBeGreaterThan(40);
      expect(template.defaultLtv).toBeGreaterThan(0);
      expect(template.defaultLtv).toBeLessThanOrEqual(100);
      expect(inputsForAsset(template.kind).rateType).toBe(template.defaultRateType);
    }
    expect(findAssetTemplate("primary-home")?.label).toMatch(/Primary home/);
    expect(findAssetTemplate("nope" as never)).toBeUndefined();
  });

  // Independently evaluated in decimal arithmetic: P*r/[1-(1+r)^(-n)].
  // These are dollar/ratio expectations, not just ordering between scenarios.
  it.each([
    ["primary-home", 2528.272093971855, 31.603401174648, "well-structured"],
    ["rental-property", 2447.250779934727, 81.575025997824, "tight"],
    ["margin-loan", 666.666666666667, 8.333333333333, "well-structured"],
    ["consumer", 567.050255362319, 14.176256384058, "well-structured"],
  ] as const)("%s default has the documented payment and verdict", (kind, payment, share, verdict) => {
    const result = compute(inputsForAsset(kind));
    expect(result.basePayment).toBeCloseTo(payment, 8);
    expect(result.stressedPayment).toBeCloseTo(payment, 8);
    expect(result.stressedPaymentToIncome).toBeCloseTo(share, 8);
    expect(result.verdict).toBe(verdict);
  });

  it("default rental uses DSCR rather than a household payment share", () => {
    const result = compute(inputsForAsset("rental-property"));
    expect(result.stressedDscr).toBeCloseTo(1.225865377017, 10);
    expect(result.stressedPaymentToIncome).toBeGreaterThan(60);
    expect(result.verdict).toBe("tight");
    expect(result.explanation).toMatch(/DSCR.*1.25/);
    expect(result.assumptions).toMatch(/NOI after vacancy and operating costs, before debt service/);
  });

  it.each(["primary-home", "rental-property", "consumer"] as const)("%s uses contract terms for rate resets", (kind) => {
    const position = { ...inputsForAsset(kind), loanAmount: 12_000, apr: 12, termMonths: 12, rateStressBp: 200 };
    const fixed = compute({ ...position, rateType: "fixed" });
    const floating = compute({ ...position, rateType: "floating" });
    expect(fixed.basePayment).toBeCloseTo(1066.185464140100, 8);
    expect(fixed.stressedPayment).toBeCloseTo(1066.185464140100, 8);
    expect(fixed.effectiveStressedApr).toBe(12);
    expect(floating.effectiveStressedApr).toBe(14);
    expect(floating.stressedPayment).toBeCloseTo(1077.445411336962, 8);
    expect(fixed.assumptions).toMatch(/Fixed:.*unchanged/);
    expect(floating.assumptions).toMatch(/full rate shock.*without caps or delays/);
  });

  it("a fixed mortgage also ignores a combined lab and slider shock", () => {
    const result = compute({ ...DEFAULT_INPUTS, rateStressBp: 850 });
    expect(result.stressedPayment).toBeCloseTo(2528.272093971855, 8);
    expect(result.effectiveStressedApr).toBe(6.5);
  });

  it("margin interest is floating and interest-only, independent of amortization term", () => {
    const position = { ...inputsForAsset("margin-loan"), loanAmount: 100_000, apr: 8, rateStressBp: 200 };
    for (const termMonths of [12, 60, 480]) {
      // A stale fixed selection cannot turn the margin preset into a fixed contract.
      const result = compute({ ...position, termMonths, rateType: "fixed" });
      expect(result.basePayment).toBeCloseTo(666.666666666667, 8);
      expect(result.stressedPayment).toBeCloseTo(833.333333333333, 8);
      expect(result.assumptions).toMatch(/interest-only.*principal stays outstanding/);
    }
  });

  it("maintenance equality meets the minimum; one dollar more debt breaches it", () => {
    // $200k falls 25% to $150k; $105k debt leaves $45k equity = exactly 30%.
    const boundary = { ...inputsForAsset("margin-loan"), loanAmount: 105_000, assetStressPct: 25, maintenanceMarginPct: 30 };
    const at = compute(boundary);
    expect(at.stressedEquity).toBe(45_000);
    expect(at.stressedEquityPct).toBe(30);
    expect(at.stressedLtv).toBe(70);
    expect(at.marginCall).toBe(false);
    expect(at.verdict).toBe("tight");
    expect(at.explanation).toMatch(/Maintenance is met/);
    expect(at.explanation).toMatch(/zero collateral cushion/);
    const below = compute({ ...boundary, loanAmount: 105_001, monthlyIncome: 500_000 });
    expect(below.stressedEquity).toBe(44_999);
    expect(below.stressedUnderwater).toBe(false);
    expect(below.stressedPaymentToIncome).toBeLessThan(1);
    expect(below.marginCall).toBe(true);
    expect(below.verdict).toBe("broken");
    expect(below.explanation).toMatch(/broker liquidation.*even if interest is affordable/);
    expect(compute({ ...boundary, loanAmount: 104_999 }).marginCall).toBe(false);
  });

  it("maintenance requirements differ from the 5-point illustrative cushion", () => {
    const position = { ...inputsForAsset("margin-loan"), assetValue: 100_000, loanAmount: 65_000 };
    expect(compute(position).verdict).toBe("tight"); // 35% equity vs 30% maintenance.
    expect(compute({ ...position, loanAmount: 64_999 }).verdict).toBe("well-structured");
    expect(compute({ ...position, maintenanceMarginPct: 40 }).marginCall).toBe(true);
  });

  it("does not turn arithmetic roundoff at exact maintenance into a margin call", () => {
    // 34% of $500k is $170k: $330k assets minus $165k debt = 50% equity.
    const position = { ...inputsForAsset("margin-loan"), assetValue: 500_000,
      loanAmount: 165_000, assetStressPct: 34, maintenanceMarginPct: 50 };
    const boundary = compute(position);
    expect(boundary.stressedEquity).toBeCloseTo(165_000, 8);
    expect(boundary.stressedEquityPct).toBeCloseTo(50, 10);
    expect(boundary.marginCall).toBe(false);
    expect(boundary.verdict).toBe("tight");
    expect(boundary.explanation).toContain("zero collateral cushion");
    expect(compute({ ...position, loanAmount: 165_001 }).marginCall).toBe(true);
    expect(compute({ ...position, loanAmount: 164_999 }).marginCall).toBe(false);
    expect(compute({ ...position, loanAmount: 165_000.01 }).marginCall).toBe(true);
  });

  it("keeps exact 5-point cushion equality tight despite percentage roundoff", () => {
    // $42k equity / $100k assets = 42%, exactly 5 points above 37% maintenance.
    const position = { ...inputsForAsset("margin-loan"), assetValue: 100_000,
      loanAmount: 58_000, maintenanceMarginPct: 37 };
    expect(compute(position).verdict).toBe("tight");
    expect(compute({ ...position, loanAmount: 58_001 }).verdict).toBe("tight");
    expect(compute({ ...position, loanAmount: 57_999 }).verdict).toBe("well-structured");
  });

  it.each([
    [999, "broken"], [1000, "tight"], [1249, "tight"], [1250, "well-structured"],
  ] as const)("rental NOI %s uses exact 1.00× and 1.25× DSCR boundaries", (monthlyIncome, verdict) => {
    const result = compute({ ...inputsForAsset("rental-property"), assetValue: 20_000,
      loanAmount: 12_000, apr: 0, termMonths: 12, monthlyIncome });
    expect(result.stressedPayment).toBe(1000);
    expect(result.stressedDscr).toBe(monthlyIncome / 1000);
    expect(result.verdict).toBe(verdict);
  });

  it("rental income decline is applied to NOI before coverage is calculated", () => {
    const result = compute({ ...inputsForAsset("rental-property"), loanAmount: 12_000,
      apr: 0, termMonths: 12, monthlyIncome: 1500, incomeStressPct: 40 });
    expect(result.baseDscr).toBe(1.5);
    expect(result.stressedDscr).toBe(0.9);
    expect(result.verdict).toBe("broken");
  });

  it.each([
    [4800, "well-structured", 40], [4812, "tight", 40.1],
    [7200, "tight", 60], [7212, "broken", 60.1],
  ] as const)("household loan %s respects explicit budget boundaries", (loanAmount, verdict, share) => {
    const result = compute({ ...DEFAULT_INPUTS, loanAmount, apr: 0, termMonths: 12, monthlyIncome: 1000 });
    expect(result.stressedPaymentToIncome).toBeCloseTo(share, 8);
    expect(result.verdict).toBe(verdict);
    expect(result.assumptions).toMatch(/not lender DTI rules/);
  });

  it.each(["primary-home", "consumer", "rental-property"] as const)("negative equity alone does not force a %s default", (kind) => {
    const result = compute({ ...inputsForAsset(kind), assetValue: 100_000, loanAmount: 90_000,
      apr: 0, termMonths: 360, monthlyIncome: 10_000, assetStressPct: 50 });
    expect(result.stressedLtv).toBe(180);
    expect(result.stressedEquity).toBe(-40_000);
    expect(result.marginCall).toBe(false);
    expect(result.verdict).toBe("tight");
    expect(result.explanation).toMatch(/negative equity/);
  });

  it("zero income with a payment fails the relevant cash-flow test", () => {
    for (const kind of kinds) {
      const result = compute({ ...inputsForAsset(kind), monthlyIncome: 0 });
      expect(result.verdict).toBe("broken");
      expect(result.stressedPaymentToIncome).toBe(Infinity);
      expect(result.stressedDscr).toBe(0);
    }
  });

  it("zero debt and zero income do not create NaN ratios or a phantom margin call", () => {
    for (const kind of kinds) {
      const result = compute({ ...inputsForAsset(kind), loanAmount: 0, assetValue: 0, monthlyIncome: 0 });
      expect(result.stressedPayment).toBe(0);
      expect(result.stressedPaymentToIncome).toBe(0);
      expect(result.stressedDscr).toBe(Infinity);
      expect(result.marginCall).toBe(false);
      expect(result.verdict).toBe("well-structured");
      expect(result.explanation).toMatch(/no outstanding loan/);
    }
  });

  it("supported control extremes retain finite nonnegative payments and no NaN metrics", () => {
    for (const kind of kinds) for (const apr of [0, 20]) for (const termMonths of [12, 480]) {
      for (const assetValue of [0, 50_000_000]) for (const loanAmount of [0, 50_000_000]) {
        for (const monthlyIncome of [0, 500_000]) for (const rateStressBp of [0, 500]) {
          const result = compute({ ...inputsForAsset(kind), apr, termMonths, assetValue, loanAmount,
            monthlyIncome, rateStressBp, assetStressPct: 50, incomeStressPct: 60 });
          expect(Number.isFinite(result.stressedPayment)).toBe(true);
          expect(result.stressedPayment).toBeGreaterThanOrEqual(0);
          for (const value of Object.values(result)) {
            if (typeof value === "number") expect(Number.isNaN(value)).toBe(false);
          }
        }
      }
    }
  });

  it("formats money and verdict tones", () => {
    expect(formatMoney(Infinity)).toBe("—");
    expect(formatMoney(-50_000)).toBe("−$50.0k");
    expect(formatMoney(-250_000)).toBe("−$250k");
    expect(formatMoney(-500)).toBe("−$500");
    expect(verdictTone("well-structured")).toBe("green");
    expect(verdictTone("tight")).toBe("gold");
    expect(verdictTone("broken")).toBe("red");
  });
});
