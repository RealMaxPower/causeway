/**
 * Keepalive cron. Upstash archives an idle database after a stretch of no
 * commands — it has already happened once. The tutor rate limiter
 * (app/api/tutor/route.ts) is the only thing that touches Redis, so a quiet
 * week leaves the DB untouched. A daily PING resets the inactivity clock.
 *
 * This runs inside the app on purpose: it reuses the same Redis credentials
 * the tutor route reads (via lib/redis, which accepts both UPSTASH_* and the
 * Upstash Marketplace integration's KV_* env names), so it adds no new
 * credential surface — the DB secrets stay only in Vercel.
 *
 * Scheduled by vercel.json → crons. Vercel issues a GET and, when CRON_SECRET
 * is set, attaches `Authorization: Bearer $CRON_SECRET`; we verify it so the
 * endpoint can't be hammered publicly to burn invocations. CRON_SECRET is a
 * self-generated token that lives only in Vercel — not a copy of the DB creds.
 *
 * Fail-loud contract: in any environment that sets CRON_SECRET (Production /
 * Preview), a missing Redis client or a failed PING returns a non-200 so a
 * dead keepalive shows red in the logs instead of masquerading as success.
 * Without CRON_SECRET (local dev) a missing client is a soft skip.
 */

import { redisFromEnv } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // Reject public callers when a cron secret is configured. Vercel attaches
  // this header automatically on scheduled invocations.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const redis = redisFromEnv();
  if (!redis) {
    // An environment with CRON_SECRET set is expected to have Redis attached,
    // so a null client there is a real misconfiguration — surface it. Local
    // dev / previews without the store stay a soft skip.
    if (secret) {
      console.error("keepalive: Redis not configured despite CRON_SECRET being set");
      return Response.json({ ok: false, error: "redis_not_configured" }, { status: 503 });
    }
    return Response.json({ ok: true, skipped: "upstash_not_configured" });
  }

  try {
    const result = await redis.ping();
    return Response.json({ ok: true, result });
  } catch (err) {
    console.error("upstash keepalive ping failed", err);
    return Response.json({ ok: false, error: "ping_failed" }, { status: 503 });
  }
}
