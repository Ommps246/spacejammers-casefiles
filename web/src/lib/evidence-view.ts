/**
 * What an evidence card shows, derived from one evidence item of the case JSON.
 * Copy (titles, axis labels, callouts) follows the approved mockups; every number is formatted
 * from the JSON by lib/format.ts, never typed in.
 */
import type { CaseFile, Evidence, ShiftEvidence, Strength, TrendEvidence } from "./case-data";
import { senIntercept, type Point } from "./chart";
import { formatP, formatStep, formatTrend, formatYearSpan } from "./format";

export type StrengthKind = Strength | "lead";
export type SourceKey = "power" | "gistemp" | "modis";

export type ChartLine =
  | { kind: "trend"; slopePerYear: number; intercept: number }
  | { kind: "step"; at: number; before: number; after: number };

export type EvidenceView = {
  id: string;
  tag: string; // "Exhibit A" … or "Reference"
  isReference: boolean;
  title: string;
  strength: StrengthKind;
  stat: { value: string; unit: string };
  meta: string;
  unexpectedDirection: boolean;
  /** For leads: how strong the signal behind the lead is ("Lead · strong signal"). */
  leadSignal?: Strength;
  /** A tag beside the title that links to the method behind it (e.g. the urban-edge point). */
  badge?: { text: string; href: string };
  /** signedTicks: "+" on positive ticks only when the axis is a change (see LEVEL_SERIES). */
  chart: { axisLabel: string; points: Point[]; line: ChartLine; legend: string; signedTicks: boolean };
  source: SourceKey;
};

const REFERENCE_IDS = new Set(["global_context"]);

const TITLES: Record<string, string> = {
  global_context: "The whole planet, same years",
};

const AXIS_LABELS: Record<string, string> = {
  temp_trend: "°C vs 1981–2010 normal",
  hot_days: "very hot days per year",
  global_context: "°C, whole planet vs normal",
  heavy_days: "heavy-rain days per year",
  max_day: "mm on the wettest day",
  total: "mm of rain per year",
};

// Axis labels for the satellite exhibits, by evidence-id prefix (one exhibit per point).
const AXIS_PREFIXES: [string, string][] = [
  ["night_lst_", "°C vs this spot’s usual night"],
  ["uhi_", "°C, city minus farmland"],
  ["ndvi_gap_", "greenness, city minus farmland"],
  ["ndvi_", "greenness vs this spot’s usual"],
];

// Section 8 of docs/METHODS.md: why Chengalpattu is an urban edge and never a control.
const ROLE_BADGES: Record<string, { text: string; href: string }> = {
  "urban edge": { text: "Urban edge, not used as a control", href: "/methods#s8" },
};

const LEAD_NOTE = "a lead to follow, not a finding";

// Series plotted as levels (counts and totals), not as departures from normal: their axes get plain ticks.
const LEVEL_SERIES: ReadonlySet<string> = new Set(["hot_days", "heavy_days", "max_day", "total"]);

// A change-point lead has no FDR verdict, only its Pettitt p-value. Its signal uses the same cut-offs the
// pipeline applies to tests outside the FDR family (pipeline/build_cases.py _strength with p < alpha).
const P_STRONG = 0.01;
const P_ALPHA = 0.05;

function pSignal(p: number): Strength {
  if (p < P_STRONG) return "strong";
  return p < P_ALPHA ? "moderate" : "inconclusive";
}

const PILL_UNITS: Record<string, string> = {
  "°C per decade": "°C per decade",
  "days/yr per decade": "days per decade",
  "mm/yr per decade": "mm per decade",
  "mm/day per decade": "mm per decade",
  "NDVI per decade": "NDVI per decade",
};

const yearOf = (t: string): number => Number(t.slice(0, 4));

function pillUnit(unitsPerDecade: string): string {
  return PILL_UNITS[unitsPerDecade] ?? unitsPerDecade;
}

function axisLabel(e: TrendEvidence): string {
  const prefixed = AXIS_PREFIXES.find(([prefix]) => e.id.startsWith(prefix));
  return AXIS_LABELS[e.id] ?? prefixed?.[1] ?? e.stats.units_per_decade;
}

function trendMeta(e: TrendEvidence): string {
  const span = formatYearSpan(e.stats.start, e.stats.end);
  const p = formatP(e.stats.p_value);
  if (e.lead) return `${span} · ${p} · ${LEAD_NOTE}`;
  if (e.stats.survives_fdr === null) return `${span} · ${p}`;
  const check = e.stats.survives_fdr ? "survived the multiple-test check" : "did not survive the multiple-test check";
  return `${span} · ${p} · ${check}`;
}

/** True only when both slopes are non-zero and point in opposite directions. */
function opposite(a: number, b: number): boolean {
  return a !== 0 && b !== 0 && Math.sign(a) !== Math.sign(b);
}

function trendView(e: TrendEvidence, tag: string, main: TrendEvidence | null, source: SourceKey): EvidenceView {
  const points = e.series.map((p) => ({ x: yearOf(p.t), y: p.v }));
  const slopePerYear = e.stats.slope_per_decade / 10;
  const slope = formatTrend(e.stats.slope_per_decade, e.stats.units_per_decade);
  const unit = pillUnit(e.stats.units_per_decade);
  const isReference = REFERENCE_IDS.has(e.id);
  const badge = e.role ? ROLE_BADGES[e.role] : undefined;
  return {
    id: e.id,
    tag,
    isReference,
    title: TITLES[e.id] ?? e.label,
    strength: e.lead ? "lead" : e.stats.verdict_strength,
    ...(e.lead ? { leadSignal: e.stats.verdict_strength } : {}),
    stat: { value: slope, unit },
    meta: trendMeta(e),
    // Only for single-place cases: per-point exhibits (with a role) are expected to differ in sign.
    unexpectedDirection:
      !isReference &&
      e.role === undefined &&
      main !== null &&
      e.id !== main.id &&
      opposite(e.stats.slope_per_decade, main.stats.slope_per_decade),
    ...(badge ? { badge } : {}),
    chart: {
      axisLabel: axisLabel(e),
      points,
      line: { kind: "trend", slopePerYear, intercept: senIntercept(points, slopePerYear) },
      legend: `Sen’s slope  ${slope} ${unit.replace(" per decade", " / decade")}`,
      signedTicks: !LEVEL_SERIES.has(e.id),
    },
    source: isReference ? "gistemp" : source,
  };
}

/** The change-point exhibit reuses the yearly temperature series, shown relative to the years before the shift. */
function shiftView(e: ShiftEvidence, tag: string, series: TrendEvidence | undefined): EvidenceView {
  const year = e.stats.new_regime_starts;
  const step = formatStep(e.stats.shift);
  const raw = (series?.series ?? []).map((p) => ({ x: yearOf(p.t), y: p.v }));
  const before = raw.filter((p) => p.x < year);
  const baseline = before.length ? before.reduce((sum, p) => sum + p.y, 0) / before.length : 0;
  return {
    id: e.id,
    tag,
    isReference: false,
    title: e.label,
    strength: "lead",
    leadSignal: pSignal(e.stats.p_value),
    stat: { value: step, unit: `°C after ${year}` },
    meta: `${formatP(e.stats.p_value)} · ${LEAD_NOTE}`,
    unexpectedDirection: false,
    chart: {
      axisLabel: `°C vs. years before ${year}`,
      points: raw.map((p) => ({ x: p.x, y: p.y - baseline })),
      line: { kind: "step", at: year, before: 0, after: e.stats.shift },
      legend: `Step at ${year}  ${step} °C`,
      signedTicks: true,
    },
    source: "power",
  };
}

/** Satellite cases cite MODIS; the weather cases cite NASA POWER. */
export function caseSource(c: CaseFile): SourceKey {
  return c.datasets.some((d) => d.short_name.startsWith("MODIS")) ? "modis" : "power";
}

export function buildEvidenceViews(c: CaseFile): EvidenceView[] {
  const trends = c.evidence.filter((e): e is TrendEvidence => e.kind === "trend");
  const main = trends.find((e) => !REFERENCE_IDS.has(e.id)) ?? null;
  const tempSeries = trends.find((e) => e.id === "temp_trend");
  let exhibit = 0;
  return c.evidence.map((e: Evidence) => {
    const tag = REFERENCE_IDS.has(e.id) ? "Reference" : `Exhibit ${String.fromCharCode(65 + exhibit++)}`;
    return e.kind === "trend" ? trendView(e, tag, main, caseSource(c)) : shiftView(e, tag, tempSeries);
  });
}

const RANK: Record<Strength, number> = { inconclusive: 0, moderate: 1, strong: 2 };

/** The case's own findings: trend tests that are neither the planet-wide reference nor leads. */
export function primaryTrends(c: CaseFile): TrendEvidence[] {
  return c.evidence.filter((e): e is TrendEvidence => e.kind === "trend" && !REFERENCE_IDS.has(e.id) && !e.lead);
}

/**
 * The strength at least half of the case's own findings reach. So a case where most points are
 * inconclusive reads "inconclusive", however strong its single best point is.
 */
export function caseVerdict(c: CaseFile): Strength {
  const own = primaryTrends(c);
  if (own.length === 0) throw new Error(`${c.case_id} has no trend evidence to base a verdict on`);
  const ranked = own.map((e) => e.stats.verdict_strength).sort((a, b) => RANK[b] - RANK[a]);
  return ranked[Math.ceil(ranked.length / 2) - 1];
}
