/**
 * Tutor backend. POST a question + nodeId, get a short Anthropic answer.
 * The system prompt is scoped to the node so the tutor stays relevant.
 *
 * Errors:
 * - 400 invalid body / missing API key
 * - 429 daily budget exceeded (kill switch)
 * - 503 upstream Anthropic failure
 *
 * v1 cost-tracks every call to stdout as a structured JSON line so the
 * "instrument from day one" rule from brief §12 is satisfied without
 * needing a database.
 */

import { Anthropic } from "@anthropic-ai/sdk";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/tutor/prompt";
import { recordTutorCall, isWithinDailyBudget } from "@/lib/tutor/cost";

export const runtime = "nodejs";

const Body = z.object({
  nodeId: z.string().regex(/^[A-Ha-h][0-9]{1,3}$/, "nodeId must match /[A-H][0-9]{1,3}/"),
  question: z.string().min(1).max(2000),
});

// Same-origin guard: stops a third-party site from invoking the tutor
// from a victim's browser to drain the Anthropic budget. Opt-in via
// TUTOR_ALLOWED_ORIGINS (comma-separated). If unset, no Origin check
// runs so local dev and curl from outside the browser still work.
const allowedOrigins = (process.env.TUTOR_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Per-IP rate limit backed by Upstash Redis. Two sliding windows: a tight
// per-minute cap blocks bursts and a per-day cap blocks slow drains. Both
// must pass; either tripping returns 429 with Retry-After. Disabled when
// UPSTASH_REDIS_REST_{URL,TOKEN} are missing so local dev and unconfigured
// previews still work — the in-memory daily budget remains as defense in
// depth in that case.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

const minuteLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "tutor:m",
      analytics: true,
    })
  : null;

const dayLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(200, "1 d"),
      prefix: "tutor:d",
      analytics: true,
    })
  : null;

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function rateLimitResponse(scope: "minute" | "day", resetMs: number): Response {
  const retryAfter = Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
  return Response.json(
    { error: "rate_limited", scope },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function POST(req: Request) {
  // Origin allowlist (when configured). Missing Origin header is
  // allowed because non-browser clients (curl, server-to-server) omit
  // it — and a malicious browser-driven request always carries one.
  if (allowedOrigins.length > 0) {
    const origin = req.headers.get("origin");
    if (origin && !allowedOrigins.includes(origin)) {
      return Response.json({ error: "forbidden_origin" }, { status: 403 });
    }
  }

  // Per-IP rate limit (when Upstash is configured).
  if (minuteLimiter && dayLimiter) {
    const ip = clientIp(req);
    const minute = await minuteLimiter.limit(ip);
    if (!minute.success) return rateLimitResponse("minute", minute.reset);
    const day = await dayLimiter.limit(ip);
    if (!day.success) return rateLimitResponse("day", day.reset);
  }

  // Parse and validate body
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { nodeId, question } = parsed.data;
  const upperNodeId = nodeId.toUpperCase();

  // Daily budget kill switch
  if (!(await isWithinDailyBudget())) {
    return Response.json({ error: "daily_budget_exceeded" }, { status: 429 });
  }

  // Config
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[tutor] ANTHROPIC_API_KEY is not set");
    return Response.json({ error: "tutor_misconfigured" }, { status: 503 });
  }
  const model = process.env.TUTOR_MODEL ?? "claude-haiku-4-5";

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 400,
      system: buildSystemPrompt(upperNodeId),
      messages: [{ role: "user", content: question }],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    await recordTutorCall({
      nodeId: upperNodeId,
      model,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
    });

    return Response.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[tutor] upstream error:", msg);
    return Response.json({ error: "tutor_unavailable" }, { status: 503 });
  }
}
