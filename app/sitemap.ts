import type { MetadataRoute } from "next";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { siteUrl } from "@/lib/site-url";
import { TRACK_ORDER } from "@/lib/tracks";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();

  const staticPaths = [
    "/",
    "/regime",
    "/playbook",
    "/compare",
    "/lab",
    "/about",
    "/about/usage",
    "/license",
  ];

  const trackPaths = TRACK_ORDER.map((t) => `/tracks/${t}`);

  const nodeIds = readdirSync(join(process.cwd(), "content", "nodes"))
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""))
    .sort();
  const nodePaths = nodeIds.map((id) => `/nodes/${id}`);

  return [...staticPaths, ...trackPaths, ...nodePaths].map((path) => ({
    url: `${base}${path}`,
  }));
}
