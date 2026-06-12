/**
 * Sudden-stop simulator (D4).
 *
 * A stylized 12-period simulation of a small open economy receiving
 * foreign capital. Sentiment path drives net flows; central-bank defense
 * spends reserves to support FX. State per period: capital, reserves,
 * FX, GDP index, policy rate.
 *
 * Heuristic, not a calibrated DSGE. Pure function — no DOM, no globals.
 */

export interface Preset {
  name: string;
  sentimentPath: number[];
  defend: boolean;
  cbRate: number;
  label: string;
}

export const PRESETS: Preset[] = [
  {
    name: "Thailand · 1997",
    sentimentPath: [85, 85, 84, 80, 70, 50, 28, 22, 20, 22, 30, 38],
    defend: true,
    cbRate: 2.5,
    label: "Asia crisis. Peg defense burns reserves; baht breaks.",
  },
  {
    name: "Argentina · 2001",
    sentimentPath: [70, 68, 65, 60, 52, 42, 32, 25, 20, 22, 28, 32],
    defend: true,
    cbRate: 14,
    label: "Currency board dies. Convertibility ends, default follows.",
  },
  {
    name: "Turkey · 2018",
    sentimentPath: [80, 75, 70, 60, 48, 35, 30, 35, 42, 50, 55, 58],
    defend: false,
    cbRate: 8,
    label: "Lira run after political shock. CB hikes late but eventually.",
  },
  {
    name: "Mexico · 1994",
    sentimentPath: [78, 75, 70, 55, 38, 28, 25, 30, 40, 50, 58, 62],
    defend: true,
    cbRate: 5,
    label: "Tequila crisis. Peso devalues, IMF backstop arrives.",
  },
  {
    name: "Calm baseline",
    sentimentPath: Array(12).fill(80),
    defend: false,
    cbRate: 3,
    label: "Steady inflows, no shock. The counterfactual.",
  },
];

export interface Period {
  t: number;
  sent: number;
  flow: number;
  capital: number;
  reserves: number;
  fx: number;
  gdp: number;
  rate: number;
}

export function simulate(
  sentimentPath: number[],
  defend: boolean,
  cbRate: number,
): Period[] {
  const series: Period[] = [];
  let capital = 100;
  let reserves = 30;
  let fx = 1.0;
  let gdp = 100;
  let rate = cbRate;

  for (let t = 0; t < sentimentPath.length; t++) {
    const sent = sentimentPath[t];
    let flow = (sent - 50) * 0.6;
    if (sent < 45) flow -= (45 - sent) * 1.2; // panic acceleration

    let fxPressure = flow / 100;
    if (defend && fxPressure < 0) {
      const interv = Math.min(reserves * 0.15, -fxPressure * 50);
      reserves -= interv;
      fxPressure += interv / 50;
    }

    capital = Math.max(0, capital + flow);
    fx = Math.max(0.25, fx + fxPressure * 0.4);

    if (defend && flow < -5) rate = Math.min(rate + 2.5, 25);
    else rate = Math.max(rate - 0.3, cbRate);

    const flowImpact = flow * 0.06;
    const rateImpact = -(rate - cbRate) * 0.2;
    const fxImpact = fx < 0.7 ? -2.5 : 0;
    gdp = Math.max(80, gdp + flowImpact + rateImpact + fxImpact);

    series.push({ t, sent, flow, capital, reserves, fx, gdp, rate });
  }

  return series;
}
