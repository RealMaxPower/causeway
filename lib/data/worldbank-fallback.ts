/**
 * Causeway · World Bank fallback snapshots.
 *
 * Used when WORLDBANK_OFFLINE=1 or the upstream is unreachable. Keeps
 * /compare renderable in offline / CI environments. Only covers the
 * default-trio of countries and the default indicators; less-common
 * combinations fall through to an "unavailable" cell in the UI.
 *
 * Values are publicly available historical figures, sampled from the
 * World Bank's open data. Treat as illustrative.
 */

import type { WbObservation } from "./worldbank";

interface FallbackKey {
  indicator: string;
  country: string;
}

interface FallbackEntry {
  indicator: string;
  country: string;
  observations: WbObservation[];
}

/** Hand-curated points across 2014–2024 for the most common cells. */
const ENTRIES: FallbackEntry[] = [
  // GDP per capita (current US$)
  { indicator: "NY.GDP.PCAP.CD", country: "USA", observations: years({ 2014: 55052, 2016: 58021, 2018: 63064, 2020: 64317, 2022: 76399, 2024: 86601 }) },
  { indicator: "NY.GDP.PCAP.CD", country: "CHN", observations: years({ 2014:  7679, 2016:  8167, 2018:  9905, 2020: 10500, 2022: 12720, 2024: 13280 }) },
  { indicator: "NY.GDP.PCAP.CD", country: "DEU", observations: years({ 2014: 48000, 2016: 42300, 2018: 47800, 2020: 46200, 2022: 48700, 2024: 54000 }) },

  // Inflation (annual %)
  { indicator: "FP.CPI.TOTL.ZG",  country: "USA", observations: years({ 2014: 1.6, 2016: 1.3, 2018: 2.4, 2020: 1.2, 2022: 8.0, 2024: 2.9 }) },
  { indicator: "FP.CPI.TOTL.ZG",  country: "CHN", observations: years({ 2014: 2.0, 2016: 2.0, 2018: 2.1, 2020: 2.4, 2022: 1.9, 2024: 0.2 }) },
  { indicator: "FP.CPI.TOTL.ZG",  country: "DEU", observations: years({ 2014: 0.9, 2016: 0.5, 2018: 1.7, 2020: 0.5, 2022: 6.9, 2024: 2.5 }) },

  // Current account (% of GDP)
  { indicator: "BN.CAB.XOKA.GD.ZS", country: "USA", observations: years({ 2014: -2.1, 2016: -2.1, 2018: -2.1, 2020: -2.9, 2022: -3.8, 2024: -3.4 }) },
  { indicator: "BN.CAB.XOKA.GD.ZS", country: "CHN", observations: years({ 2014:  2.2, 2016:  1.7, 2018:  0.2, 2020:  1.7, 2022:  2.2, 2024:  1.4 }) },
  { indicator: "BN.CAB.XOKA.GD.ZS", country: "DEU", observations: years({ 2014:  7.2, 2016:  8.5, 2018:  7.8, 2020:  6.9, 2022:  4.4, 2024:  6.1 }) },

  // GDP (current US$, trillions)
  { indicator: "NY.GDP.MKTP.CD",  country: "USA", observations: years({ 2014: 17.6e12, 2016: 18.7e12, 2018: 20.6e12, 2020: 21.4e12, 2022: 25.7e12, 2024: 29.2e12 }) },
  { indicator: "NY.GDP.MKTP.CD",  country: "CHN", observations: years({ 2014: 10.5e12, 2016: 11.2e12, 2018: 13.9e12, 2020: 14.7e12, 2022: 18.0e12, 2024: 18.7e12 }) },
  { indicator: "NY.GDP.MKTP.CD",  country: "DEU", observations: years({ 2014:  3.9e12, 2016:  3.5e12, 2018:  4.0e12, 2020:  3.9e12, 2022:  4.1e12, 2024:  4.5e12 }) },

  // Gov debt (% of GDP)
  { indicator: "GC.DOD.TOTL.GD.ZS", country: "USA", observations: years({ 2014: 103, 2016: 105, 2018: 105, 2020: 132, 2022: 121, 2024: 122 }) },
  { indicator: "GC.DOD.TOTL.GD.ZS", country: "CHN", observations: years({ 2014:  40, 2016:  50, 2018:  54, 2020:  72, 2022:  77, 2024:  88 }) },
  { indicator: "GC.DOD.TOTL.GD.ZS", country: "DEU", observations: years({ 2014:  74, 2016:  68, 2018:  61, 2020:  68, 2022:  66, 2024:  64 }) },

  // Exports / GDP (%)
  { indicator: "NE.EXP.GNFS.ZS",  country: "USA", observations: years({ 2014: 13, 2016: 11, 2018: 12, 2020: 10, 2022: 11, 2024: 11 }) },
  { indicator: "NE.EXP.GNFS.ZS",  country: "CHN", observations: years({ 2014: 23, 2016: 19, 2018: 19, 2020: 18, 2022: 21, 2024: 20 }) },
  { indicator: "NE.EXP.GNFS.ZS",  country: "DEU", observations: years({ 2014: 46, 2016: 46, 2018: 47, 2020: 44, 2022: 51, 2024: 47 }) },

  // Imports / GDP (%)
  { indicator: "NE.IMP.GNFS.ZS",  country: "USA", observations: years({ 2014: 16, 2016: 14, 2018: 15, 2020: 13, 2022: 16, 2024: 15 }) },
  { indicator: "NE.IMP.GNFS.ZS",  country: "CHN", observations: years({ 2014: 19, 2016: 16, 2018: 17, 2020: 16, 2022: 18, 2024: 17 }) },
  { indicator: "NE.IMP.GNFS.ZS",  country: "DEU", observations: years({ 2014: 38, 2016: 39, 2018: 41, 2020: 38, 2022: 50, 2024: 42 }) },
];

const INDEX = new Map<string, WbObservation[]>(
  ENTRIES.map((e) => [`${e.indicator}::${e.country}`, e.observations]),
);

export function getFallback(key: FallbackKey): WbObservation[] {
  return INDEX.get(`${key.indicator}::${key.country}`) ?? [];
}

function years(rows: Record<number, number>): WbObservation[] {
  // Newest-first to match the live API ordering.
  return Object.entries(rows)
    .map(([y, v]) => ({ date: String(y), value: v }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
