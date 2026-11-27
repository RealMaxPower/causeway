import { describe, expect, it } from "vitest";
import { DEFAULT_INPUTS, PRESETS, compose, type Inputs } from "@/components/widgets/regime-composer/model";

describe("regime-composer single-period scenarios", () => {
  it("classifies the baseline as four independent levels without a confidence score", () => {
    const result = compose(DEFAULT_INPUTS);
    expect(result.axes.map((axis) => [axis.key, axis.value, axis.level.band])).toEqual([
      ["inflation", 2.5, "above"], ["money", 4, "above"],
      ["labor", 4.1, "below"], ["credit", -3, "below"],
    ]);
    expect(result.headline).toBe("Single-period scenario; direction unavailable");
    expect(result).not.toHaveProperty("confirming");
    expect(result).not.toHaveProperty("confidence");
    for (const axis of result.axes) {
      expect(axis).not.toHaveProperty("confirms");
      expect(axis).not.toHaveProperty("trend");
      expect(axis.verdict).not.toMatch(/trending|disinflating|complete|post-restrictive|turning point/i);
    }
  });

  it("retains four adverse readings without declaring a cycle, trend or certainty", () => {
    const result = compose({ inflation: 8, fedFunds: 8, unemployment: 10, sloos: 65 });
    expect(result.axes.map((axis) => axis.level.band)).toEqual(["above", "above", "above", "above"]);
    expect(result.axes.every((axis) => axis.tone === "red")).toBe(true);
    expect(result.headline).toBe("Single-period scenario; direction unavailable");
    expect(result.detail).toContain("Without earlier observations");
  });

  it("retains unrounded inputs on both sides of the teaching boundaries", () => {
    const inputs = { inflation: 2.2001, fedFunds: 3.5001, unemployment: 5.5001, sloos: 0.0001 };
    const result = compose(inputs);
    expect(result.axes.map((axis) => axis.value)).toEqual([2.2001, 3.5001, 5.5001, 0.0001]);
    expect(result.axes.map((axis) => axis.level.band)).toEqual(["above", "above", "above", "above"]);
    expect(inputs).toEqual({ inflation: 2.2001, fedFunds: 3.5001, unemployment: 5.5001, sloos: 0.0001 });
  });

  it.each([
    ["inflation", -2, "below"], ["inflation", 0, "within"], ["inflation", 2.2, "within"],
    ["inflation", 2.2001, "above"], ["inflation", 12, "above"],
    ["fedFunds", 0, "below"], ["fedFunds", 2.4999, "below"], ["fedFunds", 2.5, "within"],
    ["fedFunds", 3.5, "within"], ["fedFunds", 3.5001, "above"], ["fedFunds", 12, "above"],
    ["unemployment", 2, "below"], ["unemployment", 4.4999, "below"], ["unemployment", 4.5, "within"],
    ["unemployment", 5.5, "within"], ["unemployment", 5.5001, "above"], ["unemployment", 12, "above"],
    ["sloos", -40, "below"], ["sloos", -0.0001, "below"], ["sloos", 0, "within"],
    ["sloos", 0.0001, "above"], ["sloos", 1, "above"], ["sloos", 20, "above"], ["sloos", 80, "above"],
  ] as const)("classifies %s = %s as %s", (input, value, band) => {
    const axisKeys: Record<keyof Inputs, string> = {
      inflation: "inflation", fedFunds: "money", unemployment: "labor", sloos: "credit",
    };
    const axis = compose({ ...DEFAULT_INPUTS, [input]: value }).axes.find((item) => item.key === axisKeys[input])!;
    expect(axis.value).toBe(value);
    expect(axis.level.band).toBe(band);
  });

  it("distinguishes the middle and elevated CPI bands without claiming a direction", () => {
    const middle = compose({ ...DEFAULT_INPUTS, inflation: 3.3 }).axes[0];
    const elevated = compose({ ...DEFAULT_INPUTS, inflation: 3.3001 }).axes[0];
    expect(middle.level.label).toBe("CPI above the 2% reference");
    expect(middle.tone).toBe("gold");
    expect(elevated.level.label).toBe("Elevated CPI inflation");
    expect(elevated.tone).toBe("red");
  });

  it("discloses the independent teaching references and keeps the CPI/PCE distinction", () => {
    const [inflation, money, labor, credit] = compose(DEFAULT_INPUTS).axes;
    expect(inflation.level.reference).toContain("PCE, not CPI");
    expect(money.level.reference).toContain("2.5–3.5%");
    expect(money.level.reference).toContain("not an estimate");
    expect(labor.level.reference).toContain("4.5–5.5%");
    expect(labor.level.reference).toContain("not an estimate of full employment");
    expect(credit.level.reference).toContain("positive means net tightening; negative means net easing");
  });
});

describe("regime-composer saved-state compatibility", () => {
  it("preserves preset IDs and inputs while labeling examples as illustrations", () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(["current", "2022", "2009", "1979", "1998"]);
    expect(PRESETS.map((preset) => preset.inputs)).toEqual([
      DEFAULT_INPUTS,
      { inflation: 8, fedFunds: 2.5, unemployment: 3.6, sloos: 25 },
      { inflation: 0.5, fedFunds: 0.2, unemployment: 10, sloos: 65 },
      { inflation: 11, fedFunds: 11, unemployment: 6, sloos: 30 },
      { inflation: 2.2, fedFunds: 5, unemployment: 4.5, sloos: -10 },
    ]);
    expect(PRESETS[0].name).toBe("Illustrative baseline");
    for (const preset of PRESETS) {
      expect(preset.name).not.toMatch(/\b(?:Now|19\d\d|20\d\d)\b/i);
      const result = compose(preset.inputs);
      expect(result.axes).toHaveLength(4);
      expect(new Set(result.axes.map((axis) => axis.key)).size).toBe(4);
      expect(result.headline).toBe("Single-period scenario; direction unavailable");
      expect(preset.blurb).not.toMatch(/axes confirm|high-confidence|soft.land|disinflating|post-restrictive/i);
    }
  });
});
