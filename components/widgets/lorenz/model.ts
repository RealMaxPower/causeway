/**
 * Lorenz / Gini model (G1).
 *
 * Decile income shares (% of total) for several countries, plus
 * helpers to compute Gini and Lorenz curve points. Pure — no DOM,
 * no globals.
 */

export interface CountryData {
  name: string;
  /** 10 decile shares, summing to 100. D1 = bottom 10%, D10 = top 10%. */
  deciles: number[];
  /** Approximate top-1% share, %. */
  top1: number;
  /** Median / mean income ratio. 1 = symmetric; lower = right-skewed. */
  median: number;
}

export const COUNTRIES: CountryData[] = [
  { name: "Sweden · 2022",       deciles: [3.5, 5,   6,   6.8, 7.5, 8.5, 9.5, 11,   13,   29],   top1: 8,  median: 0.96 },
  { name: "Germany · 2022",      deciles: [3,   4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 11,   13.5, 30.5], top1: 11, median: 0.93 },
  { name: "China · 2020",        deciles: [2.2, 3.5, 4.5, 5.5, 6.5, 8,   9.5, 11.5, 14.5, 34.3], top1: 14, median: 0.85 },
  { name: "US · 2023",           deciles: [1.5, 3,   4,   5,   6.5, 8,   10,  12.5, 15.5, 34],   top1: 19, median: 0.78 },
  { name: "Brazil · 2022",       deciles: [1.2, 2.5, 3.2, 4.2, 5.3, 7,   9,   11.5, 16,   40],   top1: 21, median: 0.68 },
  { name: "South Africa · 2022", deciles: [0.7, 1.5, 2.2, 3.0, 4.2, 5.8, 8.5, 12,   17,   45.1], top1: 23, median: 0.55 },
];

export interface LorenzPoint {
  x: number;
  y: number;
}

export function lorenzPoints(deciles: number[]): LorenzPoint[] {
  const cum: LorenzPoint[] = [{ x: 0, y: 0 }];
  let acc = 0;
  for (let i = 0; i < deciles.length; i++) {
    acc += deciles[i];
    cum.push({ x: (i + 1) / deciles.length, y: acc / 100 });
  }
  return cum;
}

export function giniFromDeciles(deciles: number[]): number {
  const n = deciles.length;
  const cum = [0];
  for (let i = 0; i < n; i++) cum.push(cum[cum.length - 1] + deciles[i] / 100);
  let area = 0;
  for (let i = 0; i < n; i++) area += ((cum[i] + cum[i + 1]) / 2) * (1 / n);
  return 1 - 2 * area;
}
