import { Redis } from "@upstash/redis";

/**
 * Resolve Upstash Redis REST credentials from the environment, accepting both
 * naming schemes.
 *
 * `Redis.fromEnv()` only reads UPSTASH_REDIS_REST_{URL,TOKEN}, but the Upstash
 * Vercel Marketplace integration injects the same credentials as
 * KV_REST_API_{URL,TOKEN} instead (a leftover of the Vercel KV branding). A DB
 * wired up through that integration therefore has working credentials that
 * `fromEnv()` never sees — silently disabling every Redis-gated feature. We
 * prefer the explicit UPSTASH_* names and fall back to the KV_* ones so the
 * client works either way.
 *
 * Returns null when neither pair is fully present (local dev, previews without
 * the store attached).
 */
export function resolveRedisCreds(
  env: Record<string, string | undefined> = process.env,
): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

/**
 * Build an Upstash Redis REST client from whichever env vars are configured,
 * or null when the store isn't attached. See {@link resolveRedisCreds}.
 */
export function redisFromEnv(
  env: Record<string, string | undefined> = process.env,
): Redis | null {
  const creds = resolveRedisCreds(env);
  return creds ? new Redis(creds) : null;
}
