import { describe, expect, it } from "vitest";
import {
  DEFAULT_INPUTS,
  PRESETS,
  compute,
  formatPct,
  regimeLabel,
  regimeTone,
} from "@/components/widgets/trade-balance/model";

describe("trade-balance model", () => {
  describe("compute()", () => {
    it("respects the identity: capitalAccount === -tradeBalance", () => {
      for (const p of PRESETS) {
        const r = compute(p.inputs);
        expect(r.capitalAccount).toBeCloseTo(-r.tradeBalance, 6);
      }
    });

    it("fdi + portfolio always sums to the capital account", () => {
      for (const p of PRESETS) {
        const r = compute(p.inputs);
        expect(r.fdi + r.portfolio).toBeCloseTo(r.capitalAccount, 6);
      }
    });

    it("classifies USA 2024 as a hot-money deficit (low FDI share)", () => {
      const r = compute({ exports: 11, imports: 14, fdiShare: 25 });
      expect(r.regime).toBe("deficit-hot-money");
    });

    it("classifies China 2005 as a mercantile surplus (low FDI share, surplus)", () => {
      const r = compute({ exports: 36, imports: 26, fdiShare: 30 });
      expect(r.regime).toBe("surplus-mercantile");
    });

    it("classifies Germany 2010s the same shape (surplus + low FDI share)", () => {
      const r = compute({ exports: 47, imports: 41, fdiShare: 35 });
      expect(r.regime).toBe("surplus-mercantile");
    });

    it("flips to surplus-productive when most outflows are FDI", () => {
      const r = compute({ exports: 30, imports: 20, fdiShare: 75 });
      expect(r.regime).toBe("surplus-productive");
    });

    it("flips to deficit-productive when most inflows are FDI", () => {
      const r = compute({ exports: 20, imports: 30, fdiShare: 70 });
      expect(r.regime).toBe("deficit-productive");
    });

    it("classifies near-zero trade balance as balanced", () => {
      const r = compute({ exports: 20, imports: 20.5, fdiShare: 30 });
      expect(r.regime).toBe("balanced");
    });

    it("DEFAULT_INPUTS matches USA 2024 preset", () => {
      const preset = PRESETS.find((p) => p.name === "USA 2024");
      expect(preset?.inputs).toEqual(DEFAULT_INPUTS);
    });

    it("clamps fdiShare to [0,100] even if a caller passes garbage", () => {
      const r1 = compute({ exports: 30, imports: 20, fdiShare: 200 });
      // fdi never exceeds capitalAccount magnitude
      expect(Math.abs(r1.fdi)).toBeLessThanOrEqual(Math.abs(r1.capitalAccount) + 1e-9);
      const r2 = compute({ exports: 30, imports: 20, fdiShare: -50 });
      expect(Math.abs(r2.fdi)).toBeLessThanOrEqual(Math.abs(r2.capitalAccount) + 1e-9);
    });

    it("story text is non-empty for every regime path", () => {
      const samples = [
        { exports: 11, imports: 14, fdiShare: 20 },
        { exports: 11, imports: 14, fdiShare: 70 },
        { exports: 30, imports: 20, fdiShare: 20 },
        { exports: 30, imports: 20, fdiShare: 75 },
        { exports: 20, imports: 20, fdiShare: 30 },
      ];
      for (const s of samples) {
        const r = compute(s);
        expect(r.story.length).toBeGreaterThan(40);
      }
    });
  });

  describe("PRESETS dataset", () => {
    it("covers the five canonical historical analogues", () => {
      const names = PRESETS.map((p) => p.name);
      expect(names).toContain("USA 2024");
      expect(names).toContain("Germany 2010s");
      expect(names).toContain("China 2005");
      expect(names).toContain("Greece 2008");
      expect(names).toContain("Argentina 2001");
    });

    it("every preset has a non-empty descriptive note", () => {
      for (const p of PRESETS) {
        expect(p.note.length).toBeGreaterThan(40);
      }
    });
  });

  describe("formatters and labels", () => {
    it("formatPct includes a sign and one decimal", () => {
      expect(formatPct(3.2)).toBe("+3.2%");
      expect(formatPct(-1.5)).toBe("−1.5%");
      expect(formatPct(0)).toBe("0.0%");
    });

    it("regimeLabel returns a human phrase for each regime", () => {
      expect(regimeLabel("balanced")).toMatch(/balanced/i);
      expect(regimeLabel("deficit-hot-money")).toMatch(/hot-money/i);
      expect(regimeLabel("surplus-mercantile")).toMatch(/mercantile/i);
    });

    it("regimeTone maps imbalances to red, balanced to gold, productive to green", () => {
      expect(regimeTone("deficit-hot-money")).toBe("red");
      expect(regimeTone("surplus-mercantile")).toBe("red");
      expect(regimeTone("balanced")).toBe("gold");
      expect(regimeTone("deficit-productive")).toBe("green");
      expect(regimeTone("surplus-productive")).toBe("green");
    });
  });
});
