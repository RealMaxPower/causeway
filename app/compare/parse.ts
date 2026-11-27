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

export type QuerySelection = string | string[] | undefined;

export function parseCountries(raw: QuerySelection): Country[] {
  return select(raw, COUNTRIES, (country) => country.iso3, DEFAULT_COUNTRY_CODES, MAX_COUNTRIES);
}

export function parseIndicators(raw: QuerySelection): Indicator[] {
  return select(raw, INDICATORS, (indicator) => indicator.code, DEFAULT_INDICATOR_CODES, MAX_INDICATORS);
}

function select<T>(raw: QuerySelection, catalogue: T[], codeFor: (value: T) => string, defaults: string[], limit: number): T[] {
  const codes = (Array.isArray(raw) ? raw : [raw ?? ""])
    .flatMap((part) => part.split(",").map((code) => code.trim().toUpperCase()));
  const selected: T[] = [];
  for (const code of codes) {
    const entry = catalogue.find((value) => codeFor(value) === code);
    if (entry && !selected.includes(entry)) selected.push(entry);
    if (selected.length === limit) break;
  }
  return selected.length ? selected : defaults.flatMap((code) => catalogue.filter((value) => codeFor(value) === code));
}
