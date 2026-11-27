import type { WbSeries } from "@/lib/data/worldbank";

/** Summarize every series, so one successful request cannot hide fallback data. */
export function sourceSummary(series: WbSeries[]): string {
  const api = series.filter((entry) => entry.source === "worldbank").length;
  const snapshots = series.filter((entry) => entry.source === "fallback").length;
  const unavailable = series.filter((entry) => entry.source === "unavailable").length;
  return [
    api ? `${api} World Bank API` : null,
    snapshots ? `${snapshots} snapshot${snapshots === 1 ? "" : "s"}` : null,
    unavailable ? `${unavailable} unavailable` : null,
  ].filter(Boolean).join(" · ") || "No series selected";
}
