import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CurrencyPlanner } from "@/components/widgets/currency-planner";
import {
  CURRENCIES, DATA_NOTICE, DEFAULT_INPUTS, MAX_AMOUNT, MAX_MONTHS,
  bandTone, buildSchedule, describeSchedule, formatCurrency, formatUSD,
  plan, strategyLabel, type Strategy,
} from "@/components/widgets/currency-planner/model";

const strategies: Strategy[] = ["aggressive", "staged", "wait"];

describe("currency planner's illustrative data", () => {
  it("labels the bundled examples as unobserved teaching inputs", () => {
    expect(DATA_NOTICE).toContain("Illustrative rates and ranges");
    expect(DATA_NOTICE).toContain("offline teaching inputs");
    expect(DATA_NOTICE).toContain("not live quotes or verified historical observations");
    expect(DATA_NOTICE).toContain("No market observation date is available");
    expect(CURRENCIES.map((currency) => currency.code)).toEqual([
      "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "MXN", "INR", "BRL", "KRW",
    ]);
    for (const currency of CURRENCIES) {
      expect(Number.isFinite(currency.exampleRate)).toBe(true);
      expect(currency.rangeLow).toBeGreaterThan(0);
      expect(currency.rangeHigh).toBeGreaterThan(currency.rangeLow);
      expect(currency.exampleRate).toBeGreaterThanOrEqual(currency.rangeLow);
      expect(currency.exampleRate).toBeLessThanOrEqual(currency.rangeHigh);
    }
  });

  it.each([
    ["EUR", 1000, 11 / 23, 0.935, 100000 / 93, 200000 / 187, "middle", "staged"],
    ["JPY", 100000, 47 / 56, 133, 12500 / 19, 100000 / 133, "upper", "aggressive"],
    ["MXN", 5000, 11 / 41, 20.4, 10000 / 37, 12500 / 51, "lower", "wait"],
  ] as const)("%s uses distance within bounds and a midpoint cost scenario", (
    currencyCode, amount, position, midpoint, exampleCost, midpointCost, band, strategy,
  ) => {
    const result = plan({ currencyCode, amount, monthsToTrip: 6 });
    expect(result.rangePosition).toBeCloseTo(position, 12);
    expect(result.rangeMidpoint).toBeCloseTo(midpoint, 12);
    expect(result.usdCostAtExampleRate).toBeCloseTo(exampleCost, 10);
    expect(result.usdCostAtMidpoint).toBeCloseTo(midpointCost, 10);
    expect(result.rangeBand).toBe(band);
    expect(result.strategy).toBe(strategy);
  });

  it("default EUR costs and rounded allocations have independently calculated values", () => {
    const result = plan(DEFAULT_INPUTS);
    expect(result.usdCostAtExampleRate).toBeCloseTo(5376.344086021505, 9);
    expect(result.usdCostAtMidpoint).toBeCloseTo(5347.593582887701, 9);
    expect(result.schedule.map((slice) => slice.units)).toEqual([834, 834, 833, 833, 833, 833]);
    expect(result.advice).toContain("33.4% of the total, rounded");
  });

  it("unknown currencies fail instead of silently substituting a EUR conversion", () => {
    for (const currencyCode of ["ZZZ", "", "eur"]) {
      expect(() => plan({ ...DEFAULT_INPUTS, currencyCode })).toThrow(/Unknown currency/);
    }
  });
});

describe("whole-unit schedules", () => {
  it.each([
    ["aggressive", 2, [833, 167]],
    ["wait", 2, [167, 833]],
    ["staged", 2, [500, 500]],
    ["aggressive", 3, [556, 333, 111]],
    ["wait", 3, [111, 333, 556]],
    // Six-month early weights 25:21:17:13:9:5 sum to 90.
    // Floors leave three units, assigned to the largest remainders: months 2,0,5.
    ["aggressive", 6, [278, 233, 189, 144, 100, 56]],
    ["wait", 6, [56, 100, 144, 189, 233, 278]],
  ] as const)("%s over %i months matches the worked allocation", (strategy, months, expected) => {
    expect(buildSchedule(1000, months, strategy).map((slice) => slice.units)).toEqual(expected);
  });

  it("reconciles exact totals, shares and shapes for all supported horizons and boundary amounts", () => {
    for (let months = 1; months <= MAX_MONTHS; months++) for (const strategy of strategies) {
      for (const amount of [0, 1, 2, 17, 1000, 5000, MAX_AMOUNT]) {
        const schedule = buildSchedule(amount, months, strategy);
        expect(schedule).toHaveLength(months);
        expect(schedule.map((slice) => slice.month)).toEqual(Array.from({ length: months }, (_, month) => month));
        expect(schedule.reduce((total, slice) => total + slice.units, 0)).toBe(amount);
        expect(schedule.reduce((total, slice) => total + slice.share, 0)).toBeCloseTo(amount === 0 ? 0 : 1, 12);
        for (const slice of schedule) {
          expect(Number.isSafeInteger(slice.units)).toBe(true);
          expect(slice.units).toBeGreaterThanOrEqual(0);
          expect(slice.share).toBeGreaterThanOrEqual(0);
          expect(slice.share).toBeLessThanOrEqual(1);
        }
        const units = schedule.map((slice) => slice.units);
        if (strategy === "staged") expect(Math.max(...units) - Math.min(...units)).toBeLessThanOrEqual(1);
        for (let index = 1; index < units.length; index++) {
          if (strategy === "aggressive") expect(units[index]).toBeLessThanOrEqual(units[index - 1]);
          if (strategy === "wait") expect(units[index]).toBeGreaterThanOrEqual(units[index - 1]);
        }
      }
    }
  });

  it("small amounts produce zero slots rather than rounding the total upward", () => {
    expect(buildSchedule(1, 3, "aggressive").map((slice) => slice.units)).toEqual([1, 0, 0]);
    expect(buildSchedule(1, 3, "wait").map((slice) => slice.units)).toEqual([0, 0, 1]);
    expect(buildSchedule(1, 3, "staged").map((slice) => slice.units)).toEqual([1, 0, 0]);
  });

  it("allocates everything now for a one-month deadline regardless of shape", () => {
    for (const strategy of strategies) {
      const schedule = buildSchedule(1000, 1, strategy);
      expect(schedule).toEqual([{ month: 0, units: 1000, share: 1 }]);
      expect(describeSchedule(schedule, strategy)).toContain("all units are allocated now");
      expect(describeSchedule(schedule, strategy)).toContain("schedule shapes are identical");
      expect(describeSchedule(schedule, strategy)).not.toContain("first two");
    }
  });

  it("zero requested units mean zero cost and no purchasing instruction", () => {
    for (const currency of CURRENCIES) {
      const result = plan({ ...DEFAULT_INPUTS, currencyCode: currency.code, amount: 0 });
      expect(result.usdCostAtExampleRate).toBe(0);
      expect(result.usdCostAtMidpoint).toBe(0);
      expect(result.schedule.every((slice) => slice.units === 0 && slice.share === 0)).toBe(true);
      expect(result.advice).toBe("No currency is needed, so every allocation is zero.");
    }
  });

  it("advice reports actual rounded first-two-slot shares for every supported horizon", () => {
    for (let months = 2; months <= MAX_MONTHS; months++) for (const strategy of strategies) {
      for (const amount of [1, 1000, MAX_AMOUNT]) {
        const schedule = buildSchedule(amount, months, strategy);
        const advice = describeSchedule(schedule, strategy);
        const reported = Number(advice.match(/contain ([\d.]+)%/)?.[1]);
        const actualShare = 100 * (schedule[0].units + schedule[1].units) / amount;
        expect(Math.abs(reported - actualShare)).toBeLessThanOrEqual(0.0500000001);
        expect(advice).toContain(`by month ${months - 1}, one month before the deadline`);
        if (strategy === "wait") expect(advice).toContain("do not wait for the exchange rate to improve");
      }
    }
  });

  it("does not promise a fixed 60% across different horizons", () => {
    expect(describeSchedule(buildSchedule(1000, 2, "aggressive"), "aggressive")).toContain("100.0%");
    expect(describeSchedule(buildSchedule(1000, 6, "aggressive"), "aggressive")).toContain("51.1%");
    expect(describeSchedule(buildSchedule(1000, 18, "aggressive"), "aggressive")).toContain("18.1%");
  });

  it("rejects invalid or unbounded inputs before allocating a schedule", () => {
    for (const amount of [-1, 0.5, MAX_AMOUNT + 1, NaN, Infinity]) {
      expect(() => buildSchedule(amount, 6, "staged")).toThrow(RangeError);
      expect(() => plan({ ...DEFAULT_INPUTS, amount })).toThrow(RangeError);
    }
    for (const months of [0, -1, 1.5, MAX_MONTHS + 1, NaN, Infinity]) {
      expect(() => buildSchedule(1000, months, "staged")).toThrow(RangeError);
      expect(() => plan({ ...DEFAULT_INPUTS, monthsToTrip: months })).toThrow(RangeError);
    }
    expect(() => buildSchedule(1000, 6, "unknown" as Strategy)).toThrow(RangeError);
  });
});

describe("presentation", () => {
  it("formats full foreign units and cent-rounded USD without hiding amounts in k abbreviations", () => {
    expect(formatCurrency(5000, "EUR")).toBe("EUR 5,000");
    expect(formatCurrency(15000, "JPY")).toBe("JPY 15,000");
    expect(formatCurrency(MAX_AMOUNT, "MXN")).toBe("MXN 10,000,000");
    expect(formatUSD(500)).toBe("$500.00");
    expect(formatUSD(15000.25)).toBe("$15,000.25");
    expect(formatUSD(1 / 152)).toBe("$0.01");
    expect(formatUSD(-500)).toBe("-$500.00");
  });

  it("uses neutral schedule labels and colors only for the illustrative range position", () => {
    expect(strategies.map(strategyLabel)).toEqual(["Earlier purchases", "Even purchases", "Later purchases"]);
    expect(bandTone("upper")).toBe("green");
    expect(bandTone("middle")).toBe("gold");
    expect(bandTone("lower")).toBe("red");
  });

  it("renders honest data labels, reconcilable allocations and a midpoint comparison", () => {
    const html = renderToStaticMarkup(createElement(CurrencyPlanner));
    expect(html).toContain(DATA_NOTICE);
    expect(html).toContain("Illustrative exchange rate");
    expect(html).toContain("Illustrative bounds");
    expect(html).toContain("48% of range distance");
    expect(html).toContain("not a historical median or a forecast");
    expect(html).toContain("$5,376.34");
    expect(html).toContain("$5,347.59");
    expect(html).toContain("$28.75 more at the example rate");
    expect(html).not.toMatch(/Spot today|5-year range|th pct|reverts to median|convert at the right time/);
    const displayedUnits = [...html.matchAll(/class="[^"]*scheduleAmount[^"]*">([\d,]+)</g)]
      .map((match) => Number(match[1].replaceAll(",", "")));
    expect(displayedUnits).toEqual([834, 834, 833, 833, 833, 833]);
    expect(displayedUnits.reduce((sum, units) => sum + units, 0)).toBe(5000);
    expect(html).toMatch(/type="number"[^>]*min="0"[^>]*max="10000000"[^>]*step="1"/);
  });
});
