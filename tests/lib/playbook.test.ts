import { describe, expect, it } from "vitest";
import {
  CAREER_OPTIONS,
  DEBT_OPTIONS,
  REGIME_OPTIONS,
  decodeShareable,
  deriveGuidance,
  emptyState,
  encodeShareable,
  loadState,
  normaliseState,
  type PlaybookState,
} from "@/lib/playbook";

const SAMPLE: PlaybookState = {
  regime: "easing",
  saving: "extending-duration",
  housing: "buying-soon",
  career: "mid",
  purchases: "wait-6mo",
  currency: "modest-fx",
  debt: "moderate",
  portfolio: "long",
  notes: "Watching the 10y–30y spread before locking the mortgage rate.",
  lastEditedAt: "2026-05-13T00:00:00.000Z",
};

describe("emptyState", () => {
  it("returns null for every choice axis", () => {
    const s = emptyState();
    expect(s.regime).toBeNull();
    expect(s.saving).toBeNull();
    expect(s.notes).toBe("");
    expect(s.lastEditedAt).toBeNull();
  });
});

describe("normaliseState", () => {
  it("accepts a well-formed PlaybookState verbatim", () => {
    expect(normaliseState(SAMPLE)).toEqual(SAMPLE);
  });

  it("returns emptyState when given garbage", () => {
    expect(normaliseState(null)).toEqual(emptyState());
    expect(normaliseState("not an object")).toEqual(emptyState());
    expect(normaliseState({ regime: 123 })).toEqual(emptyState());
  });

  it("resets unknown enum values to null but keeps valid ones", () => {
    const malformed = { ...SAMPLE, regime: "bogus" };
    const n = normaliseState(malformed);
    expect(n.regime).toBeNull();
    expect(n.saving).toBe("extending-duration"); // still valid
  });

  it("preserves notes string but trims to empty if not a string", () => {
    expect(normaliseState({ ...SAMPLE, notes: 42 }).notes).toBe("");
  });
});

describe("loadState · SSR safety", () => {
  it("returns the empty state when window is undefined", () => {
    // The test environment is Node (no DOM). loadState must not throw.
    const s = loadState();
    expect(s).toEqual(emptyState());
  });
});

describe("encodeShareable / decodeShareable", () => {
  it("roundtrips a full state", () => {
    const enc = encodeShareable(SAMPLE);
    const dec = decodeShareable(enc);
    expect(dec).toEqual(SAMPLE);
  });

  it("roundtrips the empty state", () => {
    const enc = encodeShareable(emptyState());
    expect(decodeShareable(enc)).toEqual(emptyState());
  });

  it("returns null for malformed input", () => {
    expect(decodeShareable("not-base64!@#")).toBeNull();
    expect(decodeShareable("")).toBeNull();
  });

  it("encodes to a URL-safe alphabet (no +, /, =)", () => {
    const enc = encodeShareable(SAMPLE);
    expect(enc).not.toMatch(/[+/=]/);
  });
});

describe("deriveGuidance", () => {
  it("returns no bullets for an empty state and completion = 0/8", () => {
    const g = deriveGuidance(emptyState());
    expect(g.bullets).toHaveLength(0);
    expect(g.completed).toBe(0);
    expect(g.total).toBe(8);
  });

  it("returns one bullet per answered axis with the correct blurb", () => {
    const g = deriveGuidance(SAMPLE);
    expect(g.bullets).toHaveLength(8);
    const regimeBullet = g.bullets.find((b) => b.nodeRef === "/nodes/H1");
    expect(regimeBullet?.choiceLabel).toBe(REGIME_OPTIONS[0].label);
  });

  it("omits axes with null choices instead of bulleting them", () => {
    const partial: PlaybookState = {
      ...emptyState(),
      regime: "easing",
      debt: "leveraged",
    };
    const g = deriveGuidance(partial);
    expect(g.bullets.map((b) => b.nodeRef)).toEqual(["/nodes/H1", "/nodes/H7"]);
    expect(g.completed).toBe(2);
  });

  it("blurb text comes from the chosen option, not a generic placeholder", () => {
    const partial: PlaybookState = { ...emptyState(), career: "counter-cyclical" };
    const g = deriveGuidance(partial);
    expect(g.bullets[0].blurb).toBe(
      CAREER_OPTIONS.find((o) => o.value === "counter-cyclical")!.blurb,
    );
  });

  it("debt 'leveraged' produces the leverage warning blurb", () => {
    const partial: PlaybookState = { ...emptyState(), debt: "leveraged" };
    const g = deriveGuidance(partial);
    expect(g.bullets[0].blurb).toContain(
      DEBT_OPTIONS.find((o) => o.value === "leveraged")!.blurb.slice(0, 20),
    );
  });
});
