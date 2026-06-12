/**
 * Resolve the canonical site URL. Used by metadataBase, robots, sitemap,
 * and anywhere else absolute URLs are required.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — set this in Vercel project env once a custom
 *      domain is wired up. Wins over everything else.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel's stable project alias
 *      (e.g. causeway.vercel.app). Auto-injected on production builds.
 *   3. VERCEL_URL — the deployment-specific immutable URL; used on
 *      preview builds so each preview gets its own sitemap entries.
 *   4. http://localhost:3000 — dev fallback.
 *
 * Always returned without a trailing slash so callers can append paths
 * with a single leading slash.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const projectProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (projectProd) return `https://${projectProd}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
