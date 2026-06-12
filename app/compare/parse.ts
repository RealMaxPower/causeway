/**
 * Parsers for /compare's URL params. Pure, no React. Used by the page
 * server component and exercised by tests indirectly via the route.
 */

import {
  COUNTRIES,
  DEFAULT_COUNTRY_CODES,
  MAX_COUNTRIES,
  type Country,
} from "@/lib/data/worldbank-countries";
import {
  DEFAULT_INDICATOR_CODES,
  INDICATORS,
  MAX_INDICATORS,
  type Indicator,
} from "@/lib/data/worldbank-indicators";

export function parseCountries(raw: string | undefined): Country[] {
  const codes = splitCommas(raw, DEFAULT_COUNTRY_CODES).slice(0, MAX_COUNTRIES);
  const set = new Set(codes.map((c) => c.toUpperCase()));
  const out = COUNTRIES.filter((c) => set.has(c.iso3));
  return out.length > 0 ? out : COUNTRIES.filter((c) => DEFAULT_COUNTRY_CODES.includes(c.iso3));
}

export function parseIndicators(raw: string | undefined): Indicator[] {
  const codes = splitCommas(raw, DEFAULT_INDICATOR_CODES).slice(0, MAX_INDICATORS);
  // Preserve user-supplied order
  const out: Indicator[] = [];
  for (const code of codes) {
    const i = INDICATORS.find((x) => x.code === code);
    if (i && !out.includes(i)) out.push(i);
  }
  if (out.length === 0) {
    return INDICATORS.filter((i) => DEFAULT_INDICATOR_CODES.includes(i.code));
  }
  return out;
}

function splitCommas(raw: string | undefined, fallback: string[]): string[] {
  if (!raw) return fallback;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : fallback;
}
