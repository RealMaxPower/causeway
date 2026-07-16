/**
 * Keepalive cron. Upstash archives an idle database after a stretch of no
 * commands — it has already happened once. The tutor rate limiter
 * (app/api/tutor/route.ts) is the only thing that touches Redis, so a quiet
 * week leaves the DB untouched. A daily PING resets the inactivity clock.
 *
 * This runs inside the app on purpose: it reuses the same
 * UPSTASH_REDIS_REST_{URL,TOKEN} the tutor route already reads, so it adds no
 * new credential surface — the DB secrets stay only in Vercel.
 *
 * Scheduled by vercel.json → crons. Vercel issues a GET and, when CRON_SECRET
 * is set, attaches `Authorization: Bearer $CRON_SECRET`; we verify it so the
 * endpoint can't be hammered publicly to burn invocations. Like the tutor
 * route's other guards (Origin allowlist, Upstash itself), the check is
 * env-gated: set CRON_SECRET to enforce it. CRON_SECRET is a self-generated
 * token that lives only in Vercel — it is not a copy of the DB credentials.
 */

import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

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

  // Nothing to keep alive when Upstash isn't configured (local dev, previews).
  if (!redis) {
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
