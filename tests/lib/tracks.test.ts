import { describe, expect, it } from "vitest";
import {
  TRACKS,
  TRACK_ORDER,
  TOTAL_NODES,
  allNodeIds,
  findNode,
} from "@/lib/tracks";

describe("tracks module", () => {
  describe("structure", () => {
    it("has 8 tracks in order A-H", () => {
      expect(TRACK_ORDER).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
    });

    it("every TRACK_ORDER entry has a matching TRACKS record", () => {
      for (const letter of TRACK_ORDER) {
        expect(TRACKS[letter]).toBeDefined();
        expect(TRACKS[letter].letter).toBe(letter);
      }
    });

    it("totals 44 nodes", () => {
      expect(TOTAL_NODES).toBe(44);
      expect(allNodeIds()).toHaveLength(44);
    });
  });

  describe("node ids", () => {
    it("all start with their track letter", () => {
      for (const letter of TRACK_ORDER) {
        for (const node of TRACKS[letter].nodes) {
          expect(node.id.startsWith(letter)).toBe(true);
        }
      }
    });

    it("are unique across the whole set", () => {
      const ids = allNodeIds();
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("findNode", () => {
    it("finds an existing node and returns its track", () => {
      const found = findNode("A3");
      expect(found).not.toBeNull();
      expect(found!.node.id).toBe("A3");
      expect(found!.track.letter).toBe("A");
    });

    it("returns null for unknown ids", () => {
      expect(findNode("Z99")).toBeNull();
      expect(findNode("")).toBeNull();
    });

    it("is case-sensitive (the page route normalises before calling)", () => {
      expect(findNode("a3")).toBeNull();
    });
  });

  describe("node statuses", () => {
    it("every node has a valid status (port state only: ready or drafted)", () => {
      const valid = new Set(["ready", "drafted"]);
      for (const id of allNodeIds()) {
        const node = findNode(id)!.node;
        expect(valid.has(node.status)).toBe(true);
      }
    });

    it("at least 40 nodes are ready (per the current port state)", () => {
      const readyCount = allNodeIds()
        .map((id) => findNode(id)!.node.status)
        .filter((s) => s === "ready").length;
      expect(readyCount).toBeGreaterThanOrEqual(40);
    });

    it("G4, G5 and H9 are ready but flagged as topicContested", () => {
      for (const id of ["G4", "G5", "H9"]) {
        const n = findNode(id)!.node;
        expect(n.status).toBe("ready");
        expect(n.topicContested).toBe(true);
      }
    });

    it("no other node carries topicContested by accident", () => {
      const flagged = allNodeIds()
        .filter((id) => findNode(id)!.node.topicContested === true)
        .sort();
      expect(flagged).toEqual(["G4", "G5", "H9"]);
    });
  });

  describe("node pocket text", () => {
    it("every node has non-empty pocket prose", () => {
      for (const id of allNodeIds()) {
        const node = findNode(id)!.node;
        expect(node.pocket.length).toBeGreaterThan(40);
      }
    });

    it("every node has a time estimate", () => {
      for (const id of allNodeIds()) {
        const node = findNode(id)!.node;
        expect(node.time).toMatch(/\d+\s*min/);
      }
    });
  });
});
