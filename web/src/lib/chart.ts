/** Chart geometry for the evidence cards. Nothing here is displayed as a number except axis ticks. */

export type Point = { x: number; y: number };

/**
 * Sen's slope intercept (Conover): median of y - slope·x. The case file carries the slope but not
 * the intercept, so this places the line on the chart; the value itself is never shown.
 */
export function senIntercept(points: readonly Point[], slopePerX: number): number {
  if (points.length === 0) throw new RangeError("need at least one point");
  return median(points.map((p) => p.y - slopePerX * p.x));
}

export function median(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError("median of an empty list");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export type Ticks = { values: number[]; decimals: number; min: number; max: number };

const NICE_MULTIPLES = [1, 2, 5];

/**
 * Round ticks (steps of 1, 2 or 5 × 10^k) covering [lo, hi]: the finest step that gives at most
 * `count + 2` ticks, e.g. −1, −0.5, 0, +0.5, +1 for a temperature range. Zero is a tick when in range.
 */
export function niceTicks(lo: number, hi: number, count = 3): Ticks {
  if (!(hi >= lo)) throw new RangeError(`bad range [${lo}, ${hi}]`);
  const span = hi - lo || Math.abs(hi) || 1;
  const maxTicks = count + 2;
  const magnitude = 10 ** Math.floor(Math.log10(span / maxTicks));
  const steps = [magnitude, magnitude * 10, magnitude * 100].flatMap((m) => NICE_MULTIPLES.map((k) => k * m));
  const tickCount = (s: number) => Math.ceil(hi / s - 1e-9) - Math.floor(lo / s + 1e-9) + 1;
  const step = steps.find((s) => tickCount(s) <= maxTicks) ?? steps[steps.length - 1];
  const min = Math.floor(lo / step + 1e-9) * step;
  const max = Math.ceil(hi / step - 1e-9) * step;
  const values: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) values.push(Number(v.toFixed(10)));
  return { values, decimals: Math.max(0, -Math.floor(Math.log10(step) + 1e-9)), min, max };
}

export type LinearScale = (value: number) => number;

export function linearScale(domain: readonly [number, number], range: readonly [number, number]): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (value) => r0 + (value - d0) * k;
}

/** First year, last year, and a round year in between (1981, 2000, 2025). */
export function yearTicks(first: number, last: number): number[] {
  if (last - first < 10) return [first, last];
  const middle = Math.round((first + last) / 2 / 10) * 10;
  return middle > first && middle < last ? [first, middle, last] : [first, last];
}
