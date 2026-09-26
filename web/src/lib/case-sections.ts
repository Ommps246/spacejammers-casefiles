/**
 * The case page's sections beyond the evidence cards, derived from the case JSON: exhibit groups,
 * the land-cover table, the Terra/Aqua agreement table, the dot plot and its captions, the "One to watch"
 * callout, the farmland-gap sentence, the planet comparison (heat) and the flood detector check (rain).
 * Numbers are only formatted here (lib/format.ts), never computed anew.
 */
import type { CaseFile, Strength, TrendEvidence } from "./case-data";
import { primaryTrends, type EvidenceView, type StrengthKind } from "./evidence-view";
import { agree, formatSlope, formatTrend, plural } from "./format";

const isTrend = (e: CaseFile["evidence"][number]): e is TrendEvidence => e.kind === "trend";

export type GroupKey = "city" | "countryside" | "gap" | "all";

/** One exhibit's verdict, shown on a collapsed group's summary line. */
export type GroupBadge = { id: string; name: string; strength: StrengthKind; signal?: Strength };

export type EvidenceGroup = {
  key: GroupKey;
  title: string;
  hint: string;
  views: EvidenceView[];
  /** Countryside and gaps fold away (open on desktop, closed on mobile); the city group stays open. */
  collapsible: boolean;
  badges: GroupBadge[];
};

const COLLAPSIBLE: ReadonlySet<GroupKey> = new Set(["countryside", "gap"]);

/** "Kanchipuram west farmland (countryside control)" -> "Kanchipuram west farmland" */
export function shortPointName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "");
}

const GROUPS: { key: Exclude<GroupKey, "all">; title: string; hint: string }[] = [
  {
    key: "city",
    title: "In the city",
    hint: "One satellite pixel per neighbourhood, plus the urban edge we first mistook for farmland.",
  },
  {
    key: "countryside",
    title: "In the countryside",
    hint: "Three farmland spots, classed as cropland in both 2001 and 2024. Together they are the reference.",
  },
  {
    key: "gap",
    title: "City minus countryside",
    hint: "Is each city spot pulling ahead of the farmland? Leads to follow, not findings.",
  },
];

// The gap question depends on what's measured.
const GAP_HINTS: Record<string, string> = {
  greenery: "Is each city spot losing green relative to the farmland? Leads to follow, not findings.",
};

function groupOf(c: CaseFile, id: string): Exclude<GroupKey, "all"> | null {
  const e = c.evidence.find((x) => x.id === id);
  if (!e) return null;
  if (e.lead) return "gap";
  if (e.role === "city" || e.role === "urban edge") return "city";
  if (e.role === "countryside control") return "countryside";
  return null;
}

/** City points (and the urban edge) → countryside controls → gaps; one plain group when a case has no roles. */
export function groupEvidence(c: CaseFile, views: EvidenceView[]): EvidenceGroup[] {
  const keyed = views.map((v) => ({ view: v, key: groupOf(c, v.id) }));
  if (keyed.some((k) => k.key === null)) {
    return [{ key: "all", title: "The evidence", hint: "", views, collapsible: false, badges: [] }];
  }
  const badge = (v: EvidenceView): GroupBadge => {
    const name = c.evidence.find((e) => e.id === v.id)?.point?.name ?? v.title;
    return {
      id: v.id,
      name: shortPointName(name),
      strength: v.strength,
      ...(v.leadSignal ? { signal: v.leadSignal } : {}),
    };
  };
  return GROUPS.map((g) => {
    const members = keyed.filter((k) => k.key === g.key).map((k) => k.view);
    const hint = g.key === "gap" ? (GAP_HINTS[c.topic] ?? g.hint) : g.hint;
    return { ...g, hint, views: members, collapsible: COLLAPSIBLE.has(g.key), badges: members.map(badge) };
  }).filter((g) => g.views.length > 0);
}

export type LandCoverRow = {
  id: string;
  name: string;
  role: string | null;
  from: string;
  to: string;
  changed: boolean;
};

const UNKNOWN_CLASS = "No data";

export function landCoverRows(c: CaseFile): LandCoverRow[] {
  return (c.land_cover?.points ?? []).map((p) => ({
    id: p.point.id,
    name: p.point.name,
    role: p.role,
    from: p.class_2001?.name ?? UNKNOWN_CLASS,
    to: p.class_2024?.name ?? UNKNOWN_CLASS,
    changed: p.changed === true,
  }));
}

export type AgreementRow = {
  id: string;
  name: string;
  terra: string;
  aqua: string;
  correlation: string;
  years: string;
  months: number;
  sameDirection: boolean;
  flagged: boolean;
};

function pointName(c: CaseFile, id: string): string {
  const fromEvidence = c.evidence.find((e) => e.point?.id === id)?.point?.name;
  return fromEvidence ?? c.land_cover?.points.find((p) => p.point.id === id)?.point.name ?? id;
}

export function agreementRows(c: CaseFile): AgreementRow[] {
  const flagged = new Set(c.flags.map((f) => f.point));
  return c.satellite_agreement.map((a) => ({
    id: a.point,
    name: pointName(c, a.point),
    terra: formatSlope(a.terra_slope_per_decade),
    aqua: formatSlope(a.aqua_slope_per_decade),
    correlation: a.monthly_correlation.toFixed(2),
    years: `${a.first_year}–${a.last_year}`,
    months: a.months_compared,
    sameDirection: a.same_direction,
    flagged: flagged.has(a.point),
  }));
}

/** "2003–2025": the years both satellites were compared over, from the Terra/Aqua check. */
export function agreementSpan(c: CaseFile): string | null {
  const rows = c.satellite_agreement;
  if (rows.length === 0) return null;
  return `${Math.min(...rows.map((r) => r.first_year))}–${Math.max(...rows.map((r) => r.last_year))}`;
}

export type DotKind = "city" | "edge" | "control" | "region";

export type PointDot = {
  id: string;
  name: string;
  kind: DotKind;
  slope: number;
  label: string;
  /** Survived the Benjamini-Hochberg multiple-test check (stats.survives_fdr). */
  passes: boolean;
  /** Drawn faded: verdict_strength is "inconclusive". */
  faded: boolean;
};

const DOT_KINDS: Record<string, DotKind> = { city: "city", "urban edge": "edge", "countryside control": "control" };

/** One dot per point (its own trend exhibit's Sen's slope, not a gap), largest first. */
export function pointDots(c: CaseFile): PointDot[] {
  return primaryTrends(c)
    .filter((e) => e.role !== undefined && e.role in DOT_KINDS && e.point !== undefined)
    .map((e) => ({
      id: e.point?.id ?? e.id,
      name: shortPointName(e.point?.name ?? e.label),
      kind: DOT_KINDS[e.role as string],
      slope: e.stats.slope_per_decade,
      label: formatTrend(e.stats.slope_per_decade, e.stats.units_per_decade),
      passes: e.stats.survives_fdr === true,
      faded: e.stats.verdict_strength === "inconclusive",
    }))
    .sort((a, b) => b.slope - a.slope);
}

function countOf(k: number, n: number, capital: boolean): string {
  return k === n ? `${capital ? "All" : "all"} ${n}` : `${k} of ${n}`;
}

/** The dot plot's caption; every count comes from the dots. */
export function dotPlotCaption(dots: PointDot[], topic: string): string {
  const n = dots.length;
  const passes = dots.filter((d) => d.passes);
  if (topic === "greenery") {
    // Only points that pass the check count as greening or browning; the rest show no clear change.
    const greening = passes.filter((d) => d.slope > 0).length;
    const browning = passes.filter((d) => d.slope < 0).length;
    const unclear = n - passes.length;
    const passVerb = agree(passes.length, "passes", "pass");
    const head = `${countOf(passes.length, n, true)} ${passVerb} the check: ${greening} greening, ${browning} browning`;
    return unclear > 0 ? `${head}; ${unclear} ${agree(unclear, "shows", "show")} no clear change.` : `${head}.`;
  }
  const up = dots.filter((d) => d.slope > 0).length;
  const spots = up === n ? `${countOf(up, n, true)} spots` : `${up} of ${plural(n, "spot")}`;
  const passing = `${countOf(passes.length, n, false)} ${agree(passes.length, "passes", "pass")}`;
  return `${spots} ${agree(up, "shows", "show")} night warming; ${passing} the multiple-test check.`;
}

const TALLY_ORDER: { strength: Strength; word: string }[] = [
  { strength: "strong", word: "Strong" },
  { strength: "moderate", word: "Moderate" },
  { strength: "inconclusive", word: "Inconclusive" },
];

/**
 * "Strong 1 · Moderate 4 · Inconclusive 3, of 8 points" (or "…, of 2 tests" for single-place cases):
 * the verdicts behind the headline strength. Null for a case with a single test.
 */
export function strengthTally(c: CaseFile): string | null {
  const own = primaryTrends(c);
  if (own.length < 2) return null;
  const noun = own.every((e) => e.point !== undefined) ? "point" : "test";
  const parts = TALLY_ORDER.map(({ strength, word }) => ({
    word,
    k: own.filter((e) => e.stats.verdict_strength === strength).length,
  }))
    .filter((t) => t.k > 0)
    .map((t) => `${t.word} ${t.k}`);
  return `${parts.join(" · ")}, of ${plural(own.length, noun)}`;
}

export type WatchCallout = {
  pointId: string;
  pointName: string;
  landCover: { from: string; to: string };
  greenery: { value: string; strength: Strength; falling: boolean };
  gap: { value: string; unit: string; largest: boolean; signal: Strength };
};

/**
 * The city point whose land cover changed, with its greenery trend (from the greenery case) and its
 * city-minus-countryside gap. Null unless all three signals are in the data.
 */
export function oneToWatch(night: CaseFile, greenery: CaseFile | null): WatchCallout | null {
  if (!greenery) return null;
  const changed = landCoverRows(night).find((r) => r.changed && r.role === "city");
  if (!changed) return null;
  const ndvi = greenery.evidence.filter(isTrend).find((e) => !e.lead && e.point?.id === changed.id);
  const gaps = night.evidence.filter(isTrend).filter((e) => e.lead);
  const gap = gaps.find((e) => e.point?.id === changed.id);
  if (!ndvi || !gap) return null;
  const largest = gaps.every((g) => g.stats.slope_per_decade <= gap.stats.slope_per_decade);
  return {
    pointId: changed.id,
    pointName: changed.name,
    landCover: { from: changed.from, to: changed.to },
    greenery: {
      value: formatTrend(ndvi.stats.slope_per_decade, ndvi.stats.units_per_decade),
      strength: ndvi.stats.verdict_strength,
      falling: ndvi.stats.trend === "decreasing",
    },
    gap: {
      value: formatTrend(gap.stats.slope_per_decade, gap.stats.units_per_decade),
      unit: gap.stats.units_per_decade,
      largest,
      signal: gap.stats.verdict_strength,
    },
  };
}

const FARMLAND_CAVEAT = "a lead: farmland greening can be irrigation or extra crops, not trees";

/**
 * Greenery only: "Against greening farmland, 3 of 4 city spots are falling behind (a lead: …)". A city spot
 * is falling behind when its city-minus-farmland gap is a decreasing trend that passes the check; the
 * farmland is "greening" when most controls pass with an increasing trend.
 */
export function farmlandGapSentence(c: CaseFile): string | null {
  if (c.topic !== "greenery") return null;
  const gaps = c.evidence.filter(isTrend).filter((e) => e.lead); // one gap per city point
  const controls = primaryTrends(c).filter((e) => e.role === "countryside control");
  if (gaps.length === 0 || controls.length === 0) return null;
  const falling = gaps.filter((e) => e.stats.trend === "decreasing").length;
  const greening = controls.filter((e) => e.stats.trend === "increasing").length > controls.length / 2;
  const against = greening ? "Against greening farmland" : "Against the farmland";
  const caveat = greening ? FARMLAND_CAVEAT : "a lead, not a finding";
  const who =
    falling === 0
      ? "no city spot is clearly falling behind"
      : `${falling} of ${plural(gaps.length, "city spot")} ${agree(falling, "is", "are")} falling behind`;
  return `${against}, ${who} (${caveat}).`;
}

const PLANET_ID = "global_context";
const PASSED_WORDS: Record<Strength, string> = {
  strong: "strong",
  moderate: "moderate",
  inconclusive: "didn’t pass the check",
};

export type ReferenceComparison = {
  dots: PointDot[];
  reference: { name: string; value: number; label: string };
  caption: string;
};

/**
 * Heat cases: the region's own trends in the planet's unit (°C per decade) as dots, with the whole planet
 * (GISTEMP) as a reference line, never a dot. Null for cases without the planet-wide reference.
 */
export function referenceComparison(c: CaseFile): ReferenceComparison | null {
  const planet = c.evidence.filter(isTrend).find((e) => e.id === PLANET_ID);
  if (!planet) return null;
  const unit = planet.stats.units_per_decade;
  const own = primaryTrends(c).filter((e) => e.stats.units_per_decade === unit);
  if (own.length === 0) return null;
  const dots: PointDot[] = own.map((e) => ({
    id: e.id,
    name: own.length === 1 ? c.region.name : `${c.region.name}: ${e.label}`,
    kind: "region",
    slope: e.stats.slope_per_decade,
    label: formatTrend(e.stats.slope_per_decade, unit),
    passes: e.stats.survives_fdr === true,
    faded: e.stats.verdict_strength === "inconclusive",
  }));
  const reference = {
    name: "Whole planet",
    value: planet.stats.slope_per_decade,
    label: formatSlope(planet.stats.slope_per_decade),
  };
  const regionPart = own
    .map(
      (e) =>
        `${dots.find((d) => d.id === e.id)?.name}: ${formatTrend(e.stats.slope_per_decade, unit)} ${unit} (${PASSED_WORDS[e.stats.verdict_strength]})`,
    )
    .join("; ");
  const caption = `${regionPart}; the whole planet: ${reference.label} (${planet.stats.verdict_strength}).`;
  return { dots, reference, caption };
}

export type FloodCheck = { question: string; passed: boolean; rank: number; years: number; mm: string };

/** Rain cases: the 2015 flood detector check. Passed when the 2015 floods rank first in the record. */
export function floodCheck(c: CaseFile): FloodCheck | null {
  const check = c.sanity_checks.find((s) => s.name.includes("2015"));
  const r = check?.result as
    { rank_among_years?: unknown; years_compared?: unknown; nov_dec_2015_mm?: unknown } | undefined;
  if (!check || typeof r?.rank_among_years !== "number" || typeof r.years_compared !== "number") return null;
  if (typeof r.nov_dec_2015_mm !== "number") return null;
  return {
    question: check.name,
    passed: r.rank_among_years === 1,
    rank: r.rank_among_years,
    years: r.years_compared,
    mm: r.nov_dec_2015_mm.toFixed(1),
  };
}
