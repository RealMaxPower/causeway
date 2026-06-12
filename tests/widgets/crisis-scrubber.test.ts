import { describe, expect, it } from "vitest";
import { EPISODES, STAGE_NAMES } from "@/components/widgets/crisis-scrubber/data";

describe("crisis-scrubber data", () => {
  it("exposes exactly six stage names", () => {
    expect(STAGE_NAMES).toHaveLength(6);
  });

  it("includes the four canonical episodes", () => {
    const names = EPISODES.map((e) => e.name);
    expect(names.some((n) => n.includes("2008"))).toBe(true);
    expect(names.some((n) => n.includes("1997"))).toBe(true);
    expect(names.some((n) => n.includes("1929"))).toBe(true);
    expect(names.some((n) => n.includes("2022"))).toBe(true);
  });

  it("every episode has six stages, all fields non-empty", () => {
    for (const ep of EPISODES) {
      expect(ep.stages).toHaveLength(6);
      for (const s of ep.stages) {
        expect(s.window.length).toBeGreaterThan(2);
        expect(s.visible.length).toBeGreaterThan(20);
        expect(s.underneath.length).toBeGreaterThan(20);
        expect(s.tell.length).toBeGreaterThan(20);
      }
    }
  });

  it("every metric has exactly six values, one per stage", () => {
    for (const ep of EPISODES) {
      for (const m of ep.metrics) {
        expect(m.vals).toHaveLength(6);
        for (const v of m.vals) {
          expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });

  it("every episode has at least four metrics so the right column has substance", () => {
    for (const ep of EPISODES) {
      expect(ep.metrics.length).toBeGreaterThanOrEqual(4);
    }
  });
});
