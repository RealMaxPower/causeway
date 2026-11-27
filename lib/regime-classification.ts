export type AxisKey = "inflation" | "money" | "labor" | "credit";
export type AxisTone = "red" | "blue" | "green" | "gold";

export interface AxisLevel {
  band: "below" | "within" | "above" | "unavailable";
  label: string;
  reference: string;
}

/** Bands are teaching assumptions, not fitted estimates or cycle diagnoses. */
export function classifyLevel(key: AxisKey, value: number): { level: AxisLevel; verdict: string; tone: AxisTone } {
  let level: AxisLevel;
  let tone: AxisTone;
  switch (key) {
    case "inflation": {
      const reference = "2% CPI reference; 2.2% and 3.3% teaching boundaries. The Fed's 2% goal uses PCE, not CPI.";
      // Ratio arithmetic can place an exact boundary a few ULPs above it.
      const lowerBand = value - 2.2 <= 1e-10;
      const middleBand = value - 3.3 <= 1e-10;
      level = value < 0
        ? { band: "below", label: "CPI below a year earlier", reference }
        : lowerBand
          ? { band: "within", label: "CPI in the lower inflation band", reference }
          : { band: "above", label: middleBand ? "CPI above the 2% reference" : "Elevated CPI inflation", reference };
      tone = value < 0 ? "blue" : lowerBand ? "green" : middleBand ? "gold" : "red";
      break;
    }
    case "money": {
      const reference = "Assumed 3% nominal reference with a 2.5–3.5% band; not an estimate of the current neutral rate.";
      level = { band: value < 2.5 ? "below" : value <= 3.5 ? "within" : "above",
        label: value < 2.5 ? "Effective rate below reference band" : value <= 3.5 ? "Effective rate within reference band" : "Effective rate above reference band", reference };
      tone = value < 2.5 ? "blue" : value <= 3.5 ? "gold" : "red";
      break;
    }
    case "labor": {
      const reference = "Illustrative unemployment band: 4.5–5.5%; not an estimate of full employment.";
      level = { band: value < 4.5 ? "below" : value <= 5.5 ? "within" : "above",
        label: value < 4.5 ? "Unemployment below reference band" : value <= 5.5 ? "Unemployment within reference band" : "Unemployment above reference band", reference };
      tone = value < 4.5 ? "green" : value <= 5.5 ? "gold" : "red";
      break;
    }
    case "credit": {
      const reference = "Zero is the balance point: positive means net tightening; negative means net easing of C&I lending standards.";
      level = { band: value < 0 ? "below" : value === 0 ? "within" : "above",
        label: value < 0 ? "Banks report net easing" : value === 0 ? "No net change in lending standards" : "Banks report net tightening", reference };
      tone = value < 0 ? "blue" : value === 0 ? "gold" : "red";
      break;
    }
  }
  return { level, verdict: `${level.label}.`, tone };
}

