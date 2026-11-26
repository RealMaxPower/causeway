import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RateTransmission } from "@/components/widgets/rate-transmission";
import {
  CHANNELS, DEFAULT_DELTA_BP, DEFAULT_MONTH, HORIZON, pathFor, readingAt,
} from "@/components/widgets/rate-transmission/model";

const spread = CHANNELS.find((channel) => channel.id === "creditspr")!;

describe("rate transmission arithmetic", () => {
  it("matches independently calculated levels for the default 100bp cut at month six", () => {
    expect(DEFAULT_DELTA_BP).toBe(-100);
    expect(DEFAULT_MONTH).toBe(6);
    // Baseline minus sensitivity * logistic(0.45 * (6 - lag)).
    // For example: 320 - 120 / (1 + exp(-1.35)) = 224.7044446161bp.
    const expected: Record<string, number> = {
      shortrate: 3.509824688254147,
      tenY: 3.792907259204600,
      mortgage: 6.328018085695268,
      creditspr: 224.70444461611368,
      equities: 101.25,
      usd: 101.51167674081249,
      unemp: 4.097340300642313,
      cpi: 2.6008992546321883,
    };
    for (const channel of CHANNELS) {
      expect(pathFor(channel, -1, 6)).toBeCloseTo(expected[channel.id], 10);
    }
  });

  it("widens spreads on a hike and narrows them on a cut, with a zero level floor", () => {
    expect(pathFor(spread, 1, 3)).toBe(380);
    expect(pathFor(spread, -1, 3)).toBe(260);
    expect(pathFor(spread, -3, 3)).toBe(140);
    expect(pathFor(spread, -3, 24)).toBe(0);
    for (let bp = -300; bp <= 300; bp += 25) {
      for (let month = 0; month <= HORIZON; month++) {
        expect(pathFor(spread, bp / 100, month)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("holds the baseline for neutral policy and preserves channel directions at every horizon", () => {
    const riseOnHike = new Set(["shortrate", "tenY", "mortgage", "creditspr", "usd", "unemp"]);
    for (const channel of CHANNELS) {
      for (let month = 0; month <= HORIZON; month++) {
        expect(pathFor(channel, 0, month)).toBe(channel.base);
        const hike = pathFor(channel, 3, month);
        const cut = pathFor(channel, -3, month);
        expect(Number.isFinite(hike)).toBe(true);
        expect(Number.isFinite(cut)).toBe(true);
        if (riseOnHike.has(channel.id)) {
          expect(hike).toBeGreaterThan(channel.base);
          expect(cut).toBeLessThan(channel.base);
        } else {
          expect(hike).toBeLessThan(channel.base);
          expect(cut).toBeGreaterThan(channel.base);
        }
      }
    }
  });

  it("treats lags as response midpoints rather than peaks or completed transmission", () => {
    const inflation = CHANNELS.find((channel) => channel.id === "cpi")!;
    expect(pathFor(inflation, 1, 18)).toBe(2.5);
    expect(pathFor(inflation, 1, 24)).toBeGreaterThan(2.4);
    expect(pathFor(inflation, 1, 24)).toBeLessThan(2.5);
    expect(pathFor(spread, 1, 6)).toBeGreaterThan(pathFor(spread, 1, 3));
  });
});

describe("rate transmission narration", () => {
  it("describes the correct direction for a cut, hike and neutral policy in each phase", () => {
    const phases = [
      { months: [0, 2], hike: "rates are higher", cut: "rates are lower" },
      { months: [3, 8], hike: "Credit spreads widen", cut: "Credit spreads narrow" },
      { months: [9, 14], hike: "unemployment starts to rise", cut: "unemployment starts to fall" },
      { months: [15, 24], hike: "inflation lower", cut: "inflation higher" },
    ];
    for (const phase of phases) {
      for (const month of phase.months) {
        expect(readingAt(100, month)).toContain(phase.hike);
        expect(readingAt(-100, month)).toContain(phase.cut);
        expect(readingAt(0, month)).toContain("All channels stay at the illustrative baseline");
        expect(readingAt(100, month)).not.toContain("easier financial conditions");
      }
    }
    expect(readingAt(100, 24)).toContain("still building");
    expect(readingAt(-100, 24)).not.toContain("Full transmission");
  });

  it("renders the corrected default spread and counterfactual assumptions", () => {
    const html = renderToStaticMarkup(createElement(RateTransmission));
    expect(html).toContain("225bp");
    expect(html).toContain("Credit spreads narrow");
    expect(html).toContain("Half-effect lag");
    expect(html).not.toContain("Peak lag");
    expect(html).toContain("unchanged-policy baseline");
    expect(html).toContain("with other shocks held fixed");
    expect(html).toContain("A cut during a recession can coincide with widening spreads");
    expect(html).toContain("Spreads are floored at 0bp");
  });
});
