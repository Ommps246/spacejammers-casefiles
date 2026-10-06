/**
 * Pure helpers for the interactive exhibits on /methods. They re-use numbers from the case files; the
 * shuffle demo is the one place the browser computes anything, and it only counts its own live shuffles
 * (the verdicts shown next to it are the pipeline's, from 1,000 fixed-seed resamples).
 */
import type { Strength } from "./case-data";

export const FDR_ALPHA = 0.05; // pipeline/build_cases.py apply_fdr

export type FdrTest = {
  caseId: string;
  evidenceId: string;
  label: string;
  caseLabel: string;
  p: number;
  strength: Strength;
  survives: boolean;
  /** Tested in the family, but shown on its case page as a lead, not a finding. */
  lead: boolean;
};

export type RankedTest = FdrTest & { rank: number; bar: number };

/** Benjamini-Hochberg bar for a rank (1-based) in a family of m tests. */
export function bhBar(rank: number, m: number, alpha = FDR_ALPHA): number {
  return (alpha * rank) / m;
}

/** Sort by p-value and attach each test's rank and bar. Ties keep their input order. */
export function rankTests(tests: readonly FdrTest[]): RankedTest[] {
  const m = tests.length;
  return [...tests]
    .map((t, i) => ({ t, i }))
    .sort((a, b) => a.t.p - b.t.p || a.i - b.i)
    .map(({ t }, i) => ({ ...t, rank: i + 1, bar: bhBar(i + 1, m) }));
}

/** How many tests survive: the largest rank whose p-value is at or under its bar (0 if none). */
export function bhCutoff(ranked: readonly RankedTest[]): number {
  let k = 0;
  for (const t of ranked) if (t.p <= t.bar) k = t.rank;
  return k;
}

/** Mann-Kendall S: later-minus-earlier signs summed over every pair (pipeline/stats.py _mk_s). */
export function mannKendallS(x: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < x.length - 1; i++) {
    for (let j = i + 1; j < x.length; j++) s += Math.sign(x[j] - x[i]);
  }
  return s;
}

/**
 * One moving-block resample (pipeline/stats.py block_bootstrap_mk): random blocks of `blockLength`
 * consecutive values, joined and cut to the original length. Returns each new position's source index.
 */
export function blockResample(n: number, blockLength: number, random: () => number = Math.random): number[] {
  if (blockLength < 1 || blockLength > n) throw new RangeError(`block length ${blockLength} for ${n} values`);
  const out: number[] = [];
  while (out.length < n) {
    const start = Math.floor(random() * (n - blockLength + 1));
    for (let i = 0; i < blockLength && out.length < n; i++) out.push(start + i);
  }
  return out;
}

export type ShuffleSeries = {
  id: string;
  name: string;
  what: string;
  caseId: string;
  years: number[];
  values: number[];
  blockLength: number;
  p: number;
  strength: Strength;
};

export type MapPoint = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  role: string;
  class2001: string;
  class2024: string;
  passesRule: boolean;
  isReference: boolean;
  nightTrend: { slope: number; units: string; p: number; strength: Strength } | null;
};

const KM_PER_DEGREE = 111.2;

/** Flat-map offset in km, east and north of an origin. Fine at this scale (under 100 km). */
export function kmOffset(origin: { lat: number; lon: number }, p: { lat: number; lon: number }): { east: number; north: number } {
  const east = (p.lon - origin.lon) * KM_PER_DEGREE * Math.cos((origin.lat * Math.PI) / 180);
  return { east, north: (p.lat - origin.lat) * KM_PER_DEGREE };
}

const HOURS = 24;

/** Hours from `now` forward to `target` on a 24-hour clock, in [0, 24). */
export function hoursUntil(now: number, target: number): number {
  return (((target - now) % HOURS) + HOURS) % HOURS;
}

/** 13.5 -> "1:30 p.m.", 0 -> "12:00 a.m." */
export function clockLabel(hour: number): string {
  const h = ((hour % HOURS) + HOURS) % HOURS;
  const whole = Math.floor(h + 1e-9);
  const minutes = Math.round((h - whole) * 60);
  const twelve = whole % 12 === 0 ? 12 : whole % 12;
  return `${twelve}:${String(minutes).padStart(2, "0")} ${whole < 12 ? "a.m." : "p.m."}`;
}

/** 0.75 -> "45 min", 2.5 -> "2 h 30 min", 3 -> "3 h" */
export function durationLabel(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
