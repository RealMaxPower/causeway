import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CryptoSizer } from "@/components/widgets/crypto-sizer";
import { clampPortfolio, compute, DEFAULT_INPUTS, verdictTone } from "@/components/widgets/crypto-sizer/model";

describe("crypto sizer arithmetic", () => {
  it("bounds the money input and model to nonnegative, finite portfolio values", () => {
    for (const value of [-1, -Infinity, NaN, Infinity]) {
      expect(clampPortfolio(value)).toBe(0);
      expect(compute({ ...DEFAULT_INPUTS, portfolio: value }).verdict).toBe("no-portfolio");
    }
    expect(clampPortfolio(100_000)).toBe(100_000);
    expect(clampPortfolio(100_000_000)).toBe(100_000_000);
    expect(clampPortfolio(100_000_001)).toBe(100_000_000);
    expect(compute({ ...DEFAULT_INPUTS, portfolio: 100_000_001 }).tail.drawdownDollar).toBe(1_600_000);
  });

  it("matches independently calculated default returns, stress losses and risk shares", () => {
    const r = compute(DEFAULT_INPUTS);
    // $2,000 position; rest $98,000 earns 7%. Weighted vol terms are
    // 1.8 and 11.76 (tail), or 1.4 and 11.76 (reserve), in percentage points.
    expect(r.tail.expectedDollar).toBe(-400);
    expect(r.reserve.expectedDollar).toBe(500);
    expect(r.tail.portfolioReturnPct).toBeCloseTo(6.46, 10);
    expect(r.reserve.portfolioReturnPct).toBeCloseTo(7.36, 10);
    expect(r.tail.portfolioVolPct).toBeCloseTo(11.89695759427594, 10);
    expect(r.reserve.portfolioVolPct).toBeCloseTo(11.84304015023170, 10);
    // 3.24 / 141.5376 and 1.96 / 140.2576, rather than square-root ratios.
    expect(r.tail.riskSharePct).toBeCloseTo(2.289144368704853, 10);
    expect(r.reserve.riskSharePct).toBeCloseTo(1.397428731134712, 10);
    for (const reading of [r.tail, r.reserve]) {
      expect(reading.drawdownDollar).toBe(1600);
      expect(reading.drawdownPortfolioPct).toBeCloseTo(1.6, 10);
      expect(reading.riskSharePct + reading.restRiskSharePct).toBeCloseTo(100, 10);
    }
    expect(r.verdict).toBe("within-limits");
    expect(r.explanation).toContain("1.6%");
    expect(r.explanation).toContain("2.3%");
    expect(r.explanation).toContain("do not establish");
  });

  it("assigns 50% of risk to each equally weighted, equally volatile asset", () => {
    const r = compute({ ...DEFAULT_INPUTS, allocationPct: 50, tailVolPct: 20, reserveVolPct: 20, restVolPct: 20 });
    for (const reading of [r.tail, r.reserve]) {
      expect(reading.portfolioVolPct).toBeCloseTo(14.142135623730951, 10);
      expect(reading.riskSharePct).toBe(50);
      expect(reading.restRiskSharePct).toBe(50);
    }
  });

  it("handles zero and full allocation and zero modelled variance explicitly", () => {
    const empty = compute({ ...DEFAULT_INPUTS, allocationPct: 0 });
    expect(empty.tail.riskSharePct).toBe(0);
    expect(empty.tail.restRiskSharePct).toBe(100);
    expect(empty.tail.portfolioReturnPct).toBe(7);
    expect(empty.tail.drawdownDollar).toBe(0);
    const full = compute({ ...DEFAULT_INPUTS, allocationPct: 100 });
    expect(full.tail.riskSharePct).toBe(100);
    expect(full.tail.restRiskSharePct).toBe(0);
    expect(full.tail.portfolioVolPct).toBe(90);
    expect(full.tail.portfolioReturnPct).toBe(-20);
    expect(full.tail.drawdownDollar).toBe(80_000);
    const noVariance = compute({ ...DEFAULT_INPUTS, tailVolPct: 0, reserveVolPct: 0, restVolPct: 0 });
    expect(noVariance.tail.portfolioVolPct).toBe(0);
    expect(noVariance.tail.riskSharePct).toBe(0);
    expect(noVariance.tail.restRiskSharePct).toBe(0);
  });

  it("keeps a zero-value portfolio's hypothetical percentages separate from dollars", () => {
    const r = compute({ ...DEFAULT_INPUTS, portfolio: 0 });
    expect(r.verdict).toBe("no-portfolio");
    expect(r.tail.expectedDollar).toBeCloseTo(0);
    expect(r.tail.drawdownDollar).toBe(0);
    expect(r.tail.drawdownPortfolioPct).toBeCloseTo(1.6);
    expect(r.explanation).toContain("hypothetical allocation only");
  });

  it("keeps supported slider boundaries finite and variance shares additive", () => {
    for (const allocationPct of [0, 0.5, 2, 25]) {
      for (const tailVolPct of [20, 150]) {
        for (const reserveVolPct of [20, 120]) {
          for (const drawdownPct of [0, 100]) {
            const r = compute({ ...DEFAULT_INPUTS, allocationPct, tailVolPct, reserveVolPct, drawdownPct });
            for (const reading of [r.tail, r.reserve]) {
              expect(Object.values(reading).every(Number.isFinite)).toBe(true);
              expect(reading.riskSharePct).toBeGreaterThanOrEqual(0);
              expect(reading.riskSharePct).toBeLessThanOrEqual(100);
              expect(reading.riskSharePct + reading.restRiskSharePct).toBeCloseTo(100, 10);
              expect(reading.drawdownPortfolioPct).toBeLessThanOrEqual(allocationPct);
            }
          }
        }
      }
    }
  });
});

describe("crypto sizer explanations", () => {
  it("calls the stress threshold an illustrative flag, with the correct boundary", () => {
    const at = compute({ ...DEFAULT_INPUTS, allocationPct: 12.5 });
    expect(at.tail.drawdownPortfolioPct).toBe(10);
    expect(at.verdict).toBe("within-limits");
    const above = compute({ ...DEFAULT_INPUTS, allocationPct: 13 });
    expect(above.tail.drawdownPortfolioPct).toBeCloseTo(10.4);
    expect(above.verdict).toBe("large-stress-loss");
    expect(verdictTone(above.verdict)).toBe("red");
    expect(above.explanation).toContain("10.4%");
    expect(above.explanation).toContain("other holdings stay flat");
    expect(above.explanation).not.toContain("breaks the portfolio");
  });

  it("flags concentration in either reading rather than assuming reserve vol is lower", () => {
    const r = compute({ ...DEFAULT_INPUTS, allocationPct: 20, drawdownPct: 0, tailVolPct: 20, reserveVolPct: 120 });
    // (0.2 * 120)^2 / ((0.2 * 120)^2 + (0.8 * 12)^2) = 86.2069%.
    expect(r.reserve.riskSharePct).toBeCloseTo(86.20689655172414, 10);
    expect(r.tail.riskSharePct).toBeCloseTo(14.79289940828402, 10);
    expect(r.verdict).toBe("risk-concentrated");
    expect(r.explanation).toContain("86.2%");
    expect(r.explanation).toContain("zero correlation");
    expect(compute({ ...DEFAULT_INPUTS, allocationPct: 0 }).verdict).toBe("small-allocation");
  });

  it("renders the actual variance measure, assumptions and revised default values", () => {
    const html = renderToStaticMarkup(createElement(CryptoSizer));
    expect(html).toContain("Crypto share of variance");
    expect(html).toContain("2.3%");
    expect(html).toContain("1.4%");
    expect(html).toContain("Correlation with other holdings is fixed at zero");
    expect(html).toContain("7% annual return and 12%");
    expect(html).toContain("crypto-only drawdown stress");
    expect(html).not.toContain("survive both readings");
  });
});
