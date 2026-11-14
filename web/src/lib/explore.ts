/**
 * "Pick a variable" (/explore): every trend the pipeline tested, regrouped by variable instead of by case,
 * so a visitor can choose what to look at and then see where it changes, by how much, and whether it's
 * significant. Nothing is computed here: values, verdicts and charts come from the case files
 * (via buildEvidenceViews, the same views the case pages draw).
 */
import type { CaseFile, Strength, TrendEvidence } from "./case-data";
import { shortPointName } from "./case-sections";
import { buildEvidenceViews, type EvidenceView } from "./evidence-view";
import { formatYearSpan } from "./format";

export type Family = "weather" | "satellite" | "gap";

export type ExploreRow = {
  key: string;
  place: string;
  /** "city", "urban edge", "countryside control", "region" or "whole planet" */
  where: string;
  caseId: string;
  slope: number;
  unitsPerDecade: string;
  p: number;
  strength: Strength;
  /** The verdict label the case shows: a direction only when it passed the multiple-test check. */
  trend: string;
  survivesFdr: boolean | null;
  lead: boolean;
  reference: boolean;
  span: string;
  chart: EvidenceView["chart"];
  /** Where it was measured (the satellite pixel, or the weather grid point); absent for the whole planet. */
  lat?: number;
  lon?: number;
};

export type ExploreVariable = {
  id: string;
  family: Family;
  name: string;
  question: string;
  source: string;
  rows: ExploreRow[];
};

type Spec = { id: string; family: Family; name: string; question: string; source: string; match: (evidenceId: string) => boolean };

// Order = the order of the chips. Evidence ids come from pipeline/build_cases.py and pipeline/modis.py.
const SPECS: readonly Spec[] = [
  { id: "air-temperature", family: "weather", name: "Air temperature", question: "Is the yearly average air temperature rising?", source: "NASA POWER, ~50 km grid; the planet from NASA GISTEMP", match: (id) => id === "temp_trend" || id === "global_context" },
  { id: "hot-days", family: "weather", name: "Very hot days", question: "Are days in the hottest 5% becoming more common?", source: "NASA POWER, ~50 km grid", match: (id) => id === "hot_days" },
  { id: "heavy-rain-days", family: "weather", name: "Heavy-rain days", question: "Are days with 64.5 mm of rain or more becoming more common?", source: "NASA POWER, ~50 km grid", match: (id) => id === "heavy_days" },
  { id: "wettest-day", family: "weather", name: "Wettest day of the year", question: "Is the single worst downpour getting heavier?", source: "NASA POWER, ~50 km grid", match: (id) => id === "max_day" },
  { id: "yearly-rain", family: "weather", name: "Yearly rainfall", question: "Is the total rain each year changing?", source: "NASA POWER, ~50 km grid", match: (id) => id === "total" },
  { id: "night-ground-heat", family: "satellite", name: "Night ground temperature", question: "Is the ground staying warmer at night?", source: "MODIS on NASA Terra, one 1 km pixel per place", match: (id) => id.startsWith("night_lst_") },
  { id: "greenness", family: "satellite", name: "Greenness", question: "Is the vegetation getting greener or browner?", source: "MODIS on NASA Terra (NDVI), one 250 m pixel per place", match: (id) => id.startsWith("ndvi_") && !id.startsWith("ndvi_gap_") },
  { id: "night-heat-gap", family: "gap", name: "City minus countryside: night heat", question: "Are city nights warming faster than the farmland’s?", source: "MODIS on NASA Terra; city pixel minus the farmland average", match: (id) => id.startsWith("uhi_") },
  { id: "greenness-gap", family: "gap", name: "City minus countryside: greenness", question: "Is the city falling behind the farmland in greenness?", source: "MODIS on NASA Terra; city pixel minus the farmland average", match: (id) => id.startsWith("ndvi_gap_") },
];

export const FAMILY_TITLES: Record<Family, string> = {
  weather: "Weather records · 1981–2025",
  satellite: "Satellite pixels · 2000–2025",
  gap: "City minus countryside · leads",
};

const RANK: Record<Strength, number> = { strong: 2, moderate: 1, inconclusive: 0 };

function row(c: CaseFile, e: TrendEvidence, view: EvidenceView): ExploreRow {
  const reference = e.id === "global_context";
  return {
    key: reference ? "planet" : `${c.case_id}/${e.id}`,
    place: reference ? "Whole planet" : e.point ? shortPointName(e.point.name) : c.region.name,
    where: reference ? "whole planet" : (e.role ?? (e.point ? "satellite pixel" : "region, ~50 km grid")),
    caseId: c.case_id,
    slope: e.stats.slope_per_decade,
    unitsPerDecade: e.stats.units_per_decade,
    p: e.stats.p_value,
    strength: e.stats.verdict_strength,
    trend: e.stats.trend,
    survivesFdr: e.stats.survives_fdr,
    lead: e.lead === true,
    reference,
    span: formatYearSpan(e.stats.start, e.stats.end),
    chart: view.chart,
    ...(reference ? {} : e.point?.lat !== undefined && e.point.lon !== undefined ? { lat: e.point.lat, lon: e.point.lon } : { lat: c.region.lat, lon: c.region.lon }),
  };
}

/** Variables with at least one place, each place once, from the fastest rise to the fastest fall (the planet last). */
export function exploreVariables(cases: readonly CaseFile[]): ExploreVariable[] {
  const all = cases.flatMap((c) => {
    const views = buildEvidenceViews(c);
    return c.evidence.flatMap((e, i) => (e.kind === "trend" ? [{ c, e, view: views[i] }] : []));
  });
  return SPECS.flatMap((spec) => {
    const seen = new Set<string>();
    const rows = all
      .filter(({ e }) => spec.match(e.id))
      .map(({ c, e, view }) => row(c, e, view))
      .filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true)))
      .sort((a, b) => Number(a.reference) - Number(b.reference) || b.slope - a.slope || RANK[b.strength] - RANK[a.strength]);
    if (rows.length === 0) return [];
    const { match: _match, ...rest } = spec;
    void _match;
    return [{ ...rest, rows }];
  });
}

export type Tally = { rising: number; falling: number; unclear: number };

/** How many places show a clear rise or fall (passed the check), and how many show no clear trend. */
export function tally(rows: readonly ExploreRow[]): Tally {
  const own = rows.filter((r) => !r.reference);
  return {
    rising: own.filter((r) => r.trend === "increasing").length,
    falling: own.filter((r) => r.trend === "decreasing").length,
    unclear: own.filter((r) => r.trend !== "increasing" && r.trend !== "decreasing").length,
  };
}
