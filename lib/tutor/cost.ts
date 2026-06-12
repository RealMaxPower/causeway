/**
 * Tutor cost tracking. Server-only.
 *
 * Three-layer accounting:
 *   1. stdout JSONL — always emitted for log aggregators.
 *   2. In-memory per-instance counter — survives across requests within
 *      a single serverless instance, resets on cold start. This is what
 *      makes the budget kill-switch effective in production where the
 *      filesystem is read-only.
 *   3. JSONL file at data/tutor-cost.jsonl (dev only by default) — useful
 *      for offline introspection. Set TUTOR_COST_LOGFILE=<abs path> to
 *      enable in production, or "off" to disable entirely.
 *
 * The budget check reads the max of memory and file. This is defense in
 * depth, not a primary control — a determined attacker can spread bursts
 * across cold instances. Pair with edge rate-limiting (WAF) per SECURITY.md.
 *
 * Pricing source: anthropic.com/pricing. Update these constants when
 * prices change.
 */

import "server-only";
import { appendFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

interface ModelPricing {
  /** USD per million input tokens. */
  inputPerMTok: number;
  /** USD per million output tokens. */
  outputPerMTok: number;
}

const PRICING: Record<string, ModelPricing> = {
  // Approximate as of 2026-05; verify against anthropic.com/pricing.
  "claude-haiku-4-5":      { inputPerMTok: 1.00, outputPerMTok: 5.00 },
  "claude-haiku-4-5-20251001": { inputPerMTok: 1.00, outputPerMTok: 5.00 },
  "claude-sonnet-4-6":     { inputPerMTok: 3.00, outputPerMTok: 15.00 },
  "claude-opus-4-7":       { inputPerMTok: 15.00, outputPerMTok: 75.00 },
};

interface CostInput {
  nodeId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

interface CostRecord extends CostInput {
  ts: string;
  costUsd: number;
}

/** Compute USD cost for a single Anthropic call. */
export function computeCost(args: CostInput): number {
  const p = PRICING[args.model];
  if (!p) return 0;
  return (
    (args.inputTokens * p.inputPerMTok) / 1_000_000 +
    (args.outputTokens * p.outputPerMTok) / 1_000_000
  );
}

/**
 * Resolve where to append cost records. Returns null when disabled
 * (explicit "off" or production-no-override).
 */
function logFilePath(): string | null {
  const override = process.env.TUTOR_COST_LOGFILE;
  if (override === "off") return null;
  if (override && override.length > 0) return override;
  // Default: enable in non-production for visibility; disable in
  // production where the runtime filesystem is often read-only.
  if (process.env.NODE_ENV === "production") return null;
  return join(process.cwd(), "data", "tutor-cost.jsonl");
}

// Per-instance daily cost counter. Resets on cold start.
let memoryState: { day: string; spentUsd: number } | null = null;

function bumpMemorySpent(costUsd: number): number {
  const day = todayUtc();
  if (!memoryState || memoryState.day !== day) {
    memoryState = { day, spentUsd: 0 };
  }
  memoryState.spentUsd += costUsd;
  return memoryState.spentUsd;
}

function readMemorySpent(): number {
  const day = todayUtc();
  if (!memoryState || memoryState.day !== day) return 0;
  return memoryState.spentUsd;
}

async function tryAppendRecord(record: CostRecord): Promise<void> {
  const path = logFilePath();
  if (!path) return;
  try {
    if (!existsSync(dirname(path))) {
      await mkdir(dirname(path), { recursive: true });
    }
    await appendFile(path, JSON.stringify(record) + "\n", "utf8");
  } catch (err) {
    // Read-only FS or perms issue — don't fail the API call, but
    // surface the reason so it's diagnosable.
    console.warn(
      "[tutor.cost] file append failed; falling back to stdout-only:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Record a tutor call. Always logs a structured JSON line to stdout
 * and increments the in-memory daily counter; additionally appends to
 * the cost JSONL file when one is configured.
 *
 * Safe to await but the file write is best-effort — the API call still
 * succeeds if append fails.
 */
export async function recordTutorCall(args: CostInput): Promise<CostRecord> {
  const record: CostRecord = {
    ts: new Date().toISOString(),
    costUsd: computeCost(args),
    ...args,
  };
  bumpMemorySpent(record.costUsd);
  // Structured stdout log: indexable by any log aggregator.
  console.log("[tutor.cost]", JSON.stringify(record));
  await tryAppendRecord(record);
  return record;
}

/** ISO date for the current UTC day (YYYY-MM-DD). */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

interface BudgetState {
  capUsd: number;
  spentTodayUsd: number;
  withinBudget: boolean;
}

/**
 * Read accumulated cost for today (UTC) as the larger of the in-memory
 * per-instance counter and the JSONL file (when configured).
 *
 * The in-memory counter is what protects the kill switch in production
 * (read-only FS, no override env): it survives across requests within a
 * single serverless instance and resets on cold start.
 *
 * Returns withinBudget=true (fail-open) if the cap is non-positive or
 * the file read errors — the in-memory counter still applies.
 */
export async function getDailyBudgetState(): Promise<BudgetState> {
  const cap = parseFloat(process.env.TUTOR_DAILY_BUDGET_USD ?? "5");
  if (!Number.isFinite(cap) || cap <= 0) {
    return { capUsd: cap, spentTodayUsd: 0, withinBudget: true };
  }

  const memorySpent = readMemorySpent();
  const path = logFilePath();

  let fileSpent = 0;
  if (path) {
    try {
      if (existsSync(path)) {
        const contents = await readFile(path, "utf8");
        const day = todayUtc();
        for (const line of contents.split("\n")) {
          if (!line.trim()) continue;
          try {
            const rec = JSON.parse(line) as CostRecord;
            if (typeof rec.ts === "string" && rec.ts.startsWith(day)) {
              fileSpent += rec.costUsd ?? 0;
            }
          } catch {
            // Skip malformed lines silently — log files can have partial
            // tails after crashes.
          }
        }
      }
    } catch (err) {
      console.warn(
        "[tutor.cost] could not read budget log; falling back to in-memory counter only:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const spent = Math.max(memorySpent, fileSpent);
  return {
    capUsd: cap,
    spentTodayUsd: spent,
    withinBudget: spent < cap,
  };
}

/**
 * True if today's accumulated tutor spend is below TUTOR_DAILY_BUDGET_USD.
 * Used by the API route as a kill switch.
 */
export async function isWithinDailyBudget(): Promise<boolean> {
  const state = await getDailyBudgetState();
  return state.withinBudget;
}
