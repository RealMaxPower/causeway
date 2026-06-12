/**
 * Causeway · curated country list for /compare.
 *
 * A small, opinionated set covering the cases the brief returns to:
 * G7, BRICS, EM-comparators, plus a handful of structurally interesting
 * outliers (Norway, Singapore, Switzerland). The route only offers
 * these; the World Bank API supports far more but the UI does not.
 */

export interface Country {
  iso3: string;
  iso2: string;
  name: string;
  region: "americas" | "europe" | "asia" | "africa" | "oceania";
}

export const COUNTRIES: Country[] = [
  // G7 + key reference economies
  { iso3: "USA", iso2: "US", name: "United States",   region: "americas" },
  { iso3: "GBR", iso2: "GB", name: "United Kingdom",  region: "europe"   },
  { iso3: "DEU", iso2: "DE", name: "Germany",         region: "europe"   },
  { iso3: "FRA", iso2: "FR", name: "France",          region: "europe"   },
  { iso3: "ITA", iso2: "IT", name: "Italy",           region: "europe"   },
  { iso3: "JPN", iso2: "JP", name: "Japan",           region: "asia"     },
  { iso3: "CAN", iso2: "CA", name: "Canada",          region: "americas" },

  // BRICS + EM heavyweights
  { iso3: "CHN", iso2: "CN", name: "China",           region: "asia"     },
  { iso3: "IND", iso2: "IN", name: "India",           region: "asia"     },
  { iso3: "BRA", iso2: "BR", name: "Brazil",          region: "americas" },
  { iso3: "RUS", iso2: "RU", name: "Russia",          region: "europe"   },
  { iso3: "ZAF", iso2: "ZA", name: "South Africa",    region: "africa"   },
  { iso3: "MEX", iso2: "MX", name: "Mexico",          region: "americas" },
  { iso3: "IDN", iso2: "ID", name: "Indonesia",       region: "asia"     },
  { iso3: "TUR", iso2: "TR", name: "Türkiye",         region: "europe"   },
  { iso3: "KOR", iso2: "KR", name: "South Korea",     region: "asia"     },

  // Structurally interesting outliers
  { iso3: "NOR", iso2: "NO", name: "Norway",          region: "europe"   },
  { iso3: "CHE", iso2: "CH", name: "Switzerland",     region: "europe"   },
  { iso3: "SGP", iso2: "SG", name: "Singapore",       region: "asia"     },
  { iso3: "ARG", iso2: "AR", name: "Argentina",       region: "americas" },
  { iso3: "AUS", iso2: "AU", name: "Australia",       region: "oceania"  },
  { iso3: "NLD", iso2: "NL", name: "Netherlands",     region: "europe"   },
  { iso3: "ESP", iso2: "ES", name: "Spain",           region: "europe"   },
  { iso3: "POL", iso2: "PL", name: "Poland",          region: "europe"   },
];

export function findCountry(iso3: string): Country | undefined {
  return COUNTRIES.find((c) => c.iso3 === iso3.toUpperCase());
}

/** Default three-country comparison for first-time visits. */
export const DEFAULT_COUNTRY_CODES: string[] = ["USA", "CHN", "DEU"];

/** Hard cap to keep charts legible and the request fan-out bounded. */
export const MAX_COUNTRIES = 4;
