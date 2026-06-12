import { describe, expect, it } from "vitest";
import { STATIC_PAGES, searchNodes } from "@/lib/search";

describe("searchNodes", () => {
  it("returns [] for an empty or whitespace-only query", () => {
    expect(searchNodes("")).toEqual([]);
    expect(searchNodes("   ")).toEqual([]);
  });

  it("exact node-id match wins outright", () => {
    const r = searchNodes("a3");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].kind).toBe("node");
    expect(r[0].node?.id).toBe("A3");
    expect(r[0].matchedField).toBe("id");
  });

  it("is case-insensitive", () => {
    const lower = searchNodes("a3");
    const upper = searchNodes("A3");
    expect(lower[0].node?.id).toBe(upper[0].node?.id);
  });

  it("title prefix beats title-contains", () => {
    // "How banks" prefixes A3's title "How banks create money"
    const r = searchNodes("how banks");
    expect(r[0].node?.id).toBe("A3");
    expect(r[0].matchedField).toBe("title");
  });

  it("track name match outranks pocket-only matches", () => {
    const r = searchNodes("crises");
    expect(r.length).toBeGreaterThan(0);
    // Track F's name is "Crises", so F nodes should rank above any
    // accidental pocket hits in other tracks (e.g. D4's sudden stops).
    expect(r[0].trackLetter).toBe("F");
    expect(r[0].matchedField).toBe("track");
  });

  it("multi-token query requires every token to match (AND semantics)", () => {
    const r = searchNodes("banks money");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].node?.id).toBe("A3"); // both tokens hit title or pocket
  });

  it("multi-token query with one unmatched token returns []", () => {
    const r = searchNodes("banks zebraquoxx");
    expect(r).toEqual([]);
  });

  it("honours the limit parameter", () => {
    const r = searchNodes("money", 3);
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it("static pages are findable by title", () => {
    const r = searchNodes("regime");
    const staticHit = r.find((x) => x.kind === "static" && x.href === "/regime");
    expect(staticHit).toBeDefined();
    expect(staticHit?.title).toBe("Read the regime now");
  });

  it("static pages are findable by route name", () => {
    const r = searchNodes("playbook");
    const staticHit = r.find((x) => x.kind === "static" && x.href === "/playbook");
    expect(staticHit).toBeDefined();
  });

  it("STATIC_PAGES is the expected hand-maintained set", () => {
    const routes = STATIC_PAGES.map((p) => p.href).sort();
    expect(routes).toEqual(["/about", "/compare", "/playbook", "/regime"]);
  });

  it("results are ordered by score descending", () => {
    const r = searchNodes("money");
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
    }
  });

  it("tied results break stably by track letter then href", () => {
    const r = searchNodes("money");
    // Among results with the same score, track letters should be non-decreasing
    // up to ties, then hrefs sorted.
    let prevScore = Infinity;
    let prevKey = "";
    for (const hit of r) {
      if (hit.score === prevScore) {
        expect(hit.href >= prevKey || hit.kind === "static").toBeTruthy();
      }
      prevScore = hit.score;
      prevKey = hit.href;
    }
  });

  describe("body-text recall (MDX corpus)", () => {
    it("finds prose hits not present in title/pocket/track", () => {
      // 'Mehrling' appears in multiple L3 source attributions but never in
      // a title, pocket, or track name. Body indexing should surface it.
      const r = searchNodes("mehrling");
      expect(r.length).toBeGreaterThan(0);
      expect(r.every((hit) => hit.kind === "node")).toBe(true);
    });

    it("body-only hits are tagged with matchedField === 'body'", () => {
      const r = searchNodes("mehrling");
      // At least one result should have body as its strongest matched field.
      expect(r.some((hit) => hit.matchedField === "body")).toBe(true);
    });

    it("body hits never outrank title hits for the same query", () => {
      // Search for a token that appears in BOTH a title and the body of
      // other nodes. Title-hit nodes should rank first.
      const r = searchNodes("inflation");
      const firstTitleHit = r.findIndex((hit) => hit.matchedField === "title");
      const firstBodyHit = r.findIndex((hit) => hit.matchedField === "body");
      if (firstTitleHit >= 0 && firstBodyHit >= 0) {
        expect(firstTitleHit).toBeLessThan(firstBodyHit);
      }
    });

    it("finds a Bank-of-England-attributed insight that lives only in L3 body", () => {
      // The phrase 'lender of last resort' shows up in body prose across
      // crisis/regime nodes but doesn't appear in any pocket or title.
      const r = searchNodes("lender of last resort");
      expect(r.length).toBeGreaterThan(0);
    });
  });
});
