import { describe, expect, it } from "vitest";
import { parseLayer } from "@/lib/layer";

describe("parseLayer", () => {
  it("defaults to 1 when value is undefined", () => {
    expect(parseLayer(undefined)).toBe(1);
  });

  it("returns 1 for empty string", () => {
    expect(parseLayer("")).toBe(1);
  });

  it("returns 2 for '2'", () => {
    expect(parseLayer("2")).toBe(2);
  });

  it("returns 3 for '3'", () => {
    expect(parseLayer("3")).toBe(3);
  });

  it("returns 1 for anything else (out of range, non-numeric)", () => {
    expect(parseLayer("4")).toBe(1);
    expect(parseLayer("0")).toBe(1);
    expect(parseLayer("-1")).toBe(1);
    expect(parseLayer("abc")).toBe(1);
    expect(parseLayer("1.5")).toBe(1);
  });

  it("handles arrays (takes first element)", () => {
    expect(parseLayer(["2", "3"])).toBe(2);
    expect(parseLayer(["4", "2"])).toBe(1);
  });
});
