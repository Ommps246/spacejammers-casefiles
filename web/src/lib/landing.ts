/**
 * What the landing page shows, derived from the case files: which cases, the stat strip and each card's
 * tag. Pulicat is left out: its weather cases share Chennai's ~50 km grid cell and its satellite point is water.
 */
import type { CaseFile } from "./case-data";
import { floodCheck, oneToWatch, shortPointName } from "./case-sections";

export const FEATURED_CASE = "chennai-night-heat";
export const GRID_CASES = [
  "chennai-greenery",
  "chennai-heat",
  "chennai-rain",
  "nilgiris-heat",
  "nilgiris-greenery",
  "nilgiris-rain",
] as const;

export type LandingStats = {
  cases: number;
  datasets: number;
  places: number;
  satellitePoints: number;
  gridPoints: number;
  firstYear: number;
  lastYear: number;
  years: number;
};

// Cases measured on the NASA POWER weather grid (one grid point per region) rather than at satellite pixels.
const GRID_TOPICS: ReadonlySet<string> = new Set(["heat", "rain"]);

const yearOf = (iso: string): number => Number(iso.slice(0, 4));

/** Counts for the stat strip: every number comes from the case files passed in. */
export function landingStats(cases: CaseFile[]): LandingStats {
  const datasets = new Set(cases.flatMap((c) => c.datasets.map((d) => d.short_name)));
  const pixels = new Set(
    cases.flatMap((c) => [
      ...c.evidence.flatMap((e) => (e.point ? [e.point.id] : [])),
      ...(c.land_cover?.points.map((p) => p.point.id) ?? []),
    ]),
  );
  const gridPoints = new Set(cases.filter((c) => GRID_TOPICS.has(c.topic)).map((c) => c.region.id));
  const spans = cases.flatMap((c) =>
    c.evidence.flatMap((e) => (e.kind === "trend" ? [yearOf(e.stats.start), yearOf(e.stats.end)] : [])),
  );
  const firstYear = Math.min(...spans);
  const lastYear = Math.max(...spans);
  return {
    cases: cases.length,
    datasets: datasets.size,
    places: pixels.size + gridPoints.size,
    satellitePoints: pixels.size,
    gridPoints: gridPoints.size,
    firstYear,
    lastYear,
    years: lastYear - firstYear + 1,
  };
}

export type CardTag = { kind: "detector" | "watch"; text: string };

/** One tag where it applies: a passed detector check (rain), or the greenery case's "One to watch". */
export function cardTag(c: CaseFile, all: CaseFile[]): CardTag | null {
  const flood = floodCheck(c);
  if (flood) return { kind: "detector", text: `Detector check · ${flood.passed ? "passed" : "not passed"}` };
  if (c.topic !== "greenery") return null;
  const night = all.find((x) => x.topic === "night-heat" && x.region.id === c.region.id) ?? null;
  const watch = night ? oneToWatch(night, c) : null;
  return watch ? { kind: "watch", text: `One to watch: ${shortPointName(watch.pointName)}` } : null;
}
