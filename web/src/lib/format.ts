/**
 * Display rounding for numbers that come from the case JSON. These only round; they never compute
 * a new statistic, so every printed number still traces to the case file (pipeline/guard.py).
 */

const MINUS = "−"; // typographic minus, as in the mockups (−1.54)
const BOOTSTRAP_FLOOR = 0.001; // 1,000 resamples: the smallest reportable p is 1/1001

function signed(text: string, value: number): string {
  if (value > 0) return `+${text}`;
  if (value < 0) return `${MINUS}${text.replace("-", "")}`;
  return text;
}

/** Slopes and trends: 3 significant figures, trailing zeros dropped (+0.065, −1.54, +0.211). */
export function formatSlope(value: number): string {
  if (value === 0) return "0";
  return signed(String(Number(Math.abs(value).toPrecision(3))), value);
}

/** "1 exhibit", "4 exhibits"; pass the plural when it isn't singular + "s". */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** The verb form that agrees with a count: agree(1, "passes", "pass") -> "passes". */
export function agree(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
}

const NDVI_DECIMALS = 3;

/** Trend slopes by unit: greenness (NDVI) always to 3 decimals (−0.040, +0.000), the rest via formatSlope. */
export function formatTrend(value: number, unitsPerDecade: string): string {
  if (!unitsPerDecade.startsWith("NDVI")) return formatSlope(value);
  const text = Math.abs(value).toFixed(NDVI_DECIMALS);
  if (value < 0 && Number(text) !== 0) return `${MINUS}${text}`;
  return `+${text}`;
}

/** Step sizes: 2 decimals, matching the pipeline's own Pettitt sentence (+0.21). */
export function formatStep(value: number): string {
  return signed(Math.abs(value).toFixed(2), value);
}

/** p-values: 2 significant figures, or "< 0.001" at the bootstrap floor. */
export function formatP(p: number): string {
  if (!Number.isFinite(p) || p < 0 || p > 1) throw new RangeError(`not a p-value: ${p}`);
  if (p < BOOTSTRAP_FLOOR) return "p < 0.001";
  return `p = ${p.toPrecision(2)}`;
}

/** "1981-01-01", "2025-01-01" -> "1981–2025" */
export function formatYearSpan(start: string, end: string): string {
  return `${start.slice(0, 4)}–${end.slice(0, 4)}`;
}

/**
 * Axis tick. On change axes (departures from normal, differences, steps) positives carry a "+": 0, +0.5, −4.
 * On count and total axes (days per year, mm) they don't: 0, 2000. Negatives always keep their minus.
 */
export function formatTick(value: number, decimals: number, signedAxis = true): string {
  if (Math.abs(value) < 1e-9) return "0";
  const text = Math.abs(value).toFixed(decimals);
  if (signedAxis) return signed(text, value);
  return value < 0 ? `${MINUS}${text}` : text;
}
