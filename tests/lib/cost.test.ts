import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("computeCost", () => {
  it("returns 0 for unknown models", async () => {
    const { computeCost } = await import("@/lib/tutor/cost");
    expect(computeCost({ nodeId: "A3", model: "fake-model", inputTokens: 1000, outputTokens: 1000 })).toBe(0);
  });

  it("computes Haiku cost as $1/MTok input + $5/MTok output", async () => {
    const { computeCost } = await import("@/lib/tutor/cost");
    const c = computeCost({
      nodeId: "A3",
      model: "claude-haiku-4-5",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(c).toBeCloseTo(6, 4);
  });

  it("computes Opus cost an order of magnitude higher than Haiku", async () => {
    const { computeCost } = await import("@/lib/tutor/cost");
    const haiku = computeCost({
      nodeId: "A3",
      model: "claude-haiku-4-5",
      inputTokens: 1_000_000,
      outputTokens: 0,
    });
    const opus = computeCost({
      nodeId: "A3",
      model: "claude-opus-4-7",
      inputTokens: 1_000_000,
      outputTokens: 0,
    });
    expect(opus).toBeGreaterThan(haiku * 10);
  });

  it("scales linearly with token counts", async () => {
    const { computeCost } = await import("@/lib/tutor/cost");
    const half = computeCost({
      nodeId: "A3",
      model: "claude-haiku-4-5",
      inputTokens: 500_000,
      outputTokens: 500_000,
    });
    const full = computeCost({
      nodeId: "A3",
      model: "claude-haiku-4-5",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(full).toBeCloseTo(half * 2, 4);
  });

  it("returns zero for zero tokens", async () => {
    const { computeCost } = await import("@/lib/tutor/cost");
    expect(
      computeCost({
        nodeId: "A3",
        model: "claude-haiku-4-5",
        inputTokens: 0,
        outputTokens: 0,
      }),
    ).toBe(0);
  });
});

describe("cost logging + budget state (JSONL file backend)", () => {
  let tmpDir: string;
  let logFile: string;
  const origEnv = { ...process.env };
  const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "causeway-cost-"));
    logFile = join(tmpDir, "tutor-cost.jsonl");
    process.env.TUTOR_COST_LOGFILE = logFile;
    process.env.TUTOR_DAILY_BUDGET_USD = "1.00";
    vi.resetModules();
    consoleSpy.mockClear();
  });

  afterEach(() => {
    process.env = { ...origEnv };
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("appends one JSON line per recordTutorCall", async () => {
    const { recordTutorCall } = await import("@/lib/tutor/cost");
    await recordTutorCall({
      nodeId: "A3",
      model: "claude-haiku-4-5",
      inputTokens: 100,
      outputTokens: 50,
    });
    await recordTutorCall({
      nodeId: "A4",
      model: "claude-haiku-4-5",
      inputTokens: 200,
      outputTokens: 80,
    });
    expect(existsSync(logFile)).toBe(true);
    const lines = (await readFile(logFile, "utf8")).trim().split("\n");
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]);
    expect(first.nodeId).toBe("A3");
    expect(first.model).toBe("claude-haiku-4-5");
    expect(first.inputTokens).toBe(100);
    expect(first.costUsd).toBeGreaterThan(0);
  });

  it("each record carries a parseable ISO timestamp", async () => {
    const { recordTutorCall } = await import("@/lib/tutor/cost");
    await recordTutorCall({
      nodeId: "A3",
      model: "claude-haiku-4-5",
      inputTokens: 100,
      outputTokens: 50,
    });
    const line = (await readFile(logFile, "utf8")).trim().split("\n")[0];
    const rec = JSON.parse(line);
    expect(rec.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(rec.ts).getTime()).toBeGreaterThan(0);
  });

  it("stdout log line is emitted alongside file append", async () => {
    const { recordTutorCall } = await import("@/lib/tutor/cost");
    await recordTutorCall({
      nodeId: "A3",
      model: "claude-haiku-4-5",
      inputTokens: 100,
      outputTokens: 50,
    });
    const stdoutCall = consoleSpy.mock.calls.find(
      (c) => c[0] === "[tutor.cost]",
    );
    expect(stdoutCall).toBeDefined();
  });

  it("getDailyBudgetState sums today's costs and reports under-budget", async () => {
    const { recordTutorCall, getDailyBudgetState } = await import("@/lib/tutor/cost");
    // Each call costs ~$0.00035 — well under the $1 cap.
    await recordTutorCall({
      nodeId: "A3",
      model: "claude-haiku-4-5",
      inputTokens: 100,
      outputTokens: 50,
    });
    const state = await getDailyBudgetState();
    expect(state.capUsd).toBe(1);
    expect(state.spentTodayUsd).toBeGreaterThan(0);
    expect(state.spentTodayUsd).toBeLessThan(1);
    expect(state.withinBudget).toBe(true);
  });

  it("flips withinBudget to false when accumulated cost exceeds the cap", async () => {
    const { recordTutorCall, getDailyBudgetState } = await import("@/lib/tutor/cost");
    // Two big Opus calls at 1M in/out cost $90 each, blowing the $1 cap.
    await recordTutorCall({
      nodeId: "A3",
      model: "claude-opus-4-7",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    const state = await getDailyBudgetState();
    expect(state.spentTodayUsd).toBeGreaterThan(1);
    expect(state.withinBudget).toBe(false);
  });

  it("returns within-budget when no log file exists", async () => {
    const { getDailyBudgetState } = await import("@/lib/tutor/cost");
    const state = await getDailyBudgetState();
    expect(state.spentTodayUsd).toBe(0);
    expect(state.withinBudget).toBe(true);
  });

  it("skips malformed JSONL lines silently", async () => {
    const { recordTutorCall, getDailyBudgetState } = await import("@/lib/tutor/cost");
    await recordTutorCall({
      nodeId: "A3",
      model: "claude-haiku-4-5",
      inputTokens: 100,
      outputTokens: 50,
    });
    // Append garbage between valid lines
    await import("node:fs/promises").then((fs) =>
      fs.appendFile(logFile, "not json\n{\"partial\":\n", "utf8"),
    );
    const state = await getDailyBudgetState();
    expect(state.spentTodayUsd).toBeGreaterThan(0);
    expect(state.withinBudget).toBe(true);
  });
});

describe("budget kill-switch (in-memory fallback when no logfile)", () => {
  const origEnv = { ...process.env };
  const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  beforeEach(() => {
    // Simulate the prod default: no log file path, kill switch must
    // still trip on accumulated spend.
    process.env.TUTOR_COST_LOGFILE = "off";
    process.env.TUTOR_DAILY_BUDGET_USD = "1.00";
    vi.resetModules();
    consoleSpy.mockClear();
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("starts at zero spent and within budget", async () => {
    const { getDailyBudgetState } = await import("@/lib/tutor/cost");
    const state = await getDailyBudgetState();
    expect(state.spentTodayUsd).toBe(0);
    expect(state.withinBudget).toBe(true);
  });

  it("accumulates spend across calls even without a logfile", async () => {
    const { recordTutorCall, getDailyBudgetState } = await import("@/lib/tutor/cost");
    await recordTutorCall({
      nodeId: "A3",
      model: "claude-haiku-4-5",
      inputTokens: 100,
      outputTokens: 50,
    });
    await recordTutorCall({
      nodeId: "A3",
      model: "claude-haiku-4-5",
      inputTokens: 100,
      outputTokens: 50,
    });
    const state = await getDailyBudgetState();
    expect(state.spentTodayUsd).toBeGreaterThan(0);
    expect(state.withinBudget).toBe(true);
  });

  it("trips the kill switch once cumulative cost exceeds the cap", async () => {
    const { recordTutorCall, getDailyBudgetState, isWithinDailyBudget } =
      await import("@/lib/tutor/cost");
    // One Opus call at 1M/1M tokens costs $90 — well past the $1 cap.
    await recordTutorCall({
      nodeId: "A3",
      model: "claude-opus-4-7",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    const state = await getDailyBudgetState();
    expect(state.spentTodayUsd).toBeGreaterThan(1);
    expect(state.withinBudget).toBe(false);
    expect(await isWithinDailyBudget()).toBe(false);
  });
});
