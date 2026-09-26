/** Types for data/cases/<id>.json (written by pipeline/build_cases.py) and a validating parser. */

export type Strength = "strong" | "moderate" | "inconclusive";

export type SeriesPoint = { t: string; v: number };

export type TrendStats = {
  trend: string;
  trend_uncorrected: string;
  p_value: number;
  p_value_naive: number;
  slope_per_decade: number;
  units_per_decade: string;
  start: string;
  end: string;
  n: number;
  method: string;
  survives_fdr: boolean | null;
  verdict_strength: Strength;
  role?: string;
};

export type ShiftStats = {
  method: string;
  new_regime_starts: number;
  plain: string;
  p_value: number;
  shift: number;
  mean_before: number;
  mean_after: number;
};

/** The satellite point an exhibit is about (MODIS cases only). */
export type PointRef = { id: string; name: string };

type EvidenceBase = {
  id: string;
  label: string;
  plain: string;
  point?: PointRef;
  /** "city" | "urban edge" | "countryside control" (night-heat exhibits) */
  role?: string;
  /** Tested and kept in the FDR family, but shown as a lead to follow, not a finding. */
  lead?: boolean;
};
export type TrendEvidence = EvidenceBase & {
  kind: "trend";
  stats: TrendStats;
  series: SeriesPoint[];
  threshold?: number;
};
export type ShiftEvidence = EvidenceBase & {
  kind: "shift";
  stats: ShiftStats;
  exploratory_changepoints: string[];
};
export type Evidence = TrendEvidence | ShiftEvidence;

export type Dataset = { short_name: string; provider: string; url: string };

export type Suspect = {
  suspect: string;
  question: string;
  best: { lag: number; r: number; p_value: number; n: number } | null;
  caveat: string;
};

export type LandClass = { code: number; name: string };

export type LandCoverPoint = {
  point: PointRef;
  role: string | null;
  class_2001: LandClass | null;
  class_2024: LandClass | null;
  changed: boolean | null;
  passes_reference_rule: boolean;
};

export type LandCover = { label: string; plain: string; source_note: string; points: LandCoverPoint[] };

export type SatelliteAgreement = {
  point: string;
  months_compared: number;
  monthly_correlation: number;
  first_year: number;
  last_year: number;
  terra_slope_per_decade: number;
  aqua_slope_per_decade: number;
  same_direction: boolean;
  slopes_differ: boolean;
};

export type CaseFlag = { point: string; issue: string; note: string };

export type CaseFile = {
  case_id: string;
  topic: string;
  question: string;
  region: { id: string; name: string; lat: number; lon: number };
  evidence: Evidence[];
  cross_examination: Suspect[];
  sanity_checks: { name: string; result: unknown }[];
  datasets: Dataset[];
  caveats: string[];
  primary_evidence: string[];
  land_cover: LandCover | null;
  satellite_agreement: SatelliteAgreement[];
  flags: CaseFlag[];
};

const STRENGTHS: readonly Strength[] = ["strong", "moderate", "inconclusive"];

type Json = Record<string, unknown>;

function fail(where: string, what: string): never {
  throw new Error(`case file ${where}: ${what}`);
}
const isObject = (x: unknown): x is Json => typeof x === "object" && x !== null && !Array.isArray(x);
const str = (o: Json, k: string, where: string): string =>
  typeof o[k] === "string" ? (o[k] as string) : fail(where, `"${k}" must be a string`);
const num = (o: Json, k: string, where: string): number =>
  typeof o[k] === "number" && Number.isFinite(o[k]) ? (o[k] as number) : fail(where, `"${k}" must be a number`);

function parseSeries(raw: unknown, where: string): SeriesPoint[] {
  if (!Array.isArray(raw)) fail(where, `"series" must be an array`);
  return raw.map((p, i) => {
    if (!isObject(p)) fail(`${where}.series[${i}]`, "must be an object");
    return { t: str(p, "t", `${where}.series[${i}]`), v: num(p, "v", `${where}.series[${i}]`) };
  });
}

function parseTrendStats(s: Json, where: string): TrendStats {
  const strength = str(s, "verdict_strength", where);
  if (!STRENGTHS.includes(strength as Strength)) fail(where, `unknown verdict_strength "${strength}"`);
  const fdr = s.survives_fdr;
  if (fdr !== null && typeof fdr !== "boolean") fail(where, `"survives_fdr" must be true, false or null`);
  return {
    trend: str(s, "trend", where),
    trend_uncorrected: str(s, "trend_uncorrected", where),
    p_value: num(s, "p_value", where),
    p_value_naive: num(s, "p_value_naive", where),
    slope_per_decade: num(s, "slope_per_decade", where),
    units_per_decade: str(s, "units_per_decade", where),
    start: str(s, "start", where),
    end: str(s, "end", where),
    n: num(s, "n", where),
    method: str(s, "method", where),
    survives_fdr: fdr,
    verdict_strength: strength as Strength,
    ...(typeof s.role === "string" ? { role: s.role } : {}),
  };
}

function parseShiftStats(s: Json, where: string): ShiftStats {
  return {
    method: str(s, "method", where),
    new_regime_starts: num(s, "new_regime_starts", where),
    plain: str(s, "plain", where),
    p_value: num(s, "p_value", where),
    shift: num(s, "shift", where),
    mean_before: num(s, "mean_before", where),
    mean_after: num(s, "mean_after", where),
  };
}

function parsePointRef(raw: unknown, where: string): PointRef {
  if (!isObject(raw)) fail(where, "must be an object");
  return { id: str(raw, "id", where), name: str(raw, "name", where) };
}

function parseEvidence(raw: unknown, i: number): Evidence {
  const where = `evidence[${i}]`;
  if (!isObject(raw) || !isObject(raw.stats)) fail(where, "must be an object with stats");
  const base = {
    id: str(raw, "id", where),
    label: str(raw, "label", where),
    plain: str(raw, "plain", where),
    ...(raw.point !== undefined ? { point: parsePointRef(raw.point, `${where}.point`) } : {}),
    ...(typeof raw.role === "string" ? { role: raw.role } : {}),
    ...(isObject(raw.lead) ? { lead: true } : {}),
  };
  const stats = raw.stats as Json;
  if ("slope_per_decade" in stats) {
    return {
      ...base,
      kind: "trend",
      stats: parseTrendStats(stats, `${where}.stats`),
      series: parseSeries(raw.series, where),
      ...(typeof raw.threshold === "number" ? { threshold: raw.threshold } : {}),
    };
  }
  if ("new_regime_starts" in stats) {
    const cps = raw.exploratory_changepoints;
    return {
      ...base,
      kind: "shift",
      stats: parseShiftStats(stats, `${where}.stats`),
      exploratory_changepoints: Array.isArray(cps) ? cps.filter((c): c is string => typeof c === "string") : [],
    };
  }
  return fail(where, "stats are neither a trend test nor a change-point test");
}

function parseSuspect(raw: unknown, i: number): Suspect {
  const where = `cross_examination[${i}]`;
  if (!isObject(raw)) fail(where, "must be an object");
  const best = isObject(raw.best)
    ? {
        lag: num(raw.best, "lag", `${where}.best`),
        r: num(raw.best, "r", `${where}.best`),
        p_value: num(raw.best, "p_value", `${where}.best`),
        n: num(raw.best, "n", `${where}.best`),
      }
    : null;
  return {
    suspect: str(raw, "suspect", where),
    question: str(raw, "question", where),
    best,
    caveat: str(raw, "caveat", where),
  };
}

function parseLandClass(raw: unknown, where: string): LandClass | null {
  if (raw === null) return null;
  if (!isObject(raw)) fail(where, "must be an object or null");
  return { code: num(raw, "code", where), name: str(raw, "name", where) };
}

function parseLandCover(raw: unknown): LandCover | null {
  if (raw === undefined) return null;
  const where = "land_cover";
  if (!isObject(raw) || !Array.isArray(raw.points)) fail(where, "must be an object with points");
  return {
    label: str(raw, "label", where),
    plain: str(raw, "plain", where),
    source_note: str(raw, "source_note", where),
    points: raw.points.map((p, i) => {
      const w = `${where}.points[${i}]`;
      if (!isObject(p)) fail(w, "must be an object");
      const changed = p.changed;
      if (changed !== null && typeof changed !== "boolean") fail(w, `"changed" must be true, false or null`);
      if (typeof p.passes_reference_rule !== "boolean") fail(w, `"passes_reference_rule" must be a boolean`);
      return {
        point: parsePointRef(p.point, `${w}.point`),
        role: typeof p.role === "string" ? p.role : null,
        class_2001: parseLandClass(p.class_2001, `${w}.class_2001`),
        class_2024: parseLandClass(p.class_2024, `${w}.class_2024`),
        changed,
        passes_reference_rule: p.passes_reference_rule,
      };
    }),
  };
}

const AGREEMENT_FIELDS = [
  "months_compared",
  "monthly_correlation",
  "first_year",
  "last_year",
  "terra_slope_per_decade",
  "aqua_slope_per_decade",
];

/** Terra-vs-Aqua rows from the sanity check that has them; points with too few shared months are left out. */
function parseAgreement(checks: { result: unknown }[]): SatelliteAgreement[] {
  const rows = checks
    .map((c) => c.result)
    .find((r) => Array.isArray(r) && r.some((x) => isObject(x) && "terra_slope_per_decade" in x));
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is Json => isObject(r) && AGREEMENT_FIELDS.every((k) => typeof r[k] === "number"))
    .map((r, i) => ({
      point: str(r, "point", `satellite_agreement[${i}]`),
      months_compared: r.months_compared as number,
      monthly_correlation: r.monthly_correlation as number,
      first_year: r.first_year as number,
      last_year: r.last_year as number,
      terra_slope_per_decade: r.terra_slope_per_decade as number,
      aqua_slope_per_decade: r.aqua_slope_per_decade as number,
      same_direction: r.same_direction === true,
      slopes_differ: r.slopes_differ === true,
    }));
}

function parseFlags(raw: unknown): CaseFlag[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f, i) => {
    const w = `flags[${i}]`;
    if (!isObject(f)) fail(w, "must be an object");
    return { point: str(f, "point", w), issue: str(f, "issue", w), note: str(f, "note", w) };
  });
}

export function parseCaseFile(raw: unknown): CaseFile {
  if (!isObject(raw)) fail("root", "must be an object");
  const region = raw.region;
  if (!isObject(region)) fail("region", "must be an object");
  if (!Array.isArray(raw.evidence) || raw.evidence.length === 0) fail("evidence", "must be a non-empty array");
  const datasets = Array.isArray(raw.datasets) ? raw.datasets : fail("datasets", "must be an array");
  const sanityChecks = Array.isArray(raw.sanity_checks)
    ? raw.sanity_checks
        .filter(isObject)
        .map((c, i) => ({ name: str(c, "name", `sanity_checks[${i}]`), result: c.result }))
    : [];
  return {
    case_id: str(raw, "case_id", "root"),
    topic: str(raw, "topic", "root"),
    question: str(raw, "question", "root"),
    region: {
      id: str(region, "id", "region"),
      name: str(region, "name", "region"),
      lat: num(region, "lat", "region"),
      lon: num(region, "lon", "region"),
    },
    evidence: raw.evidence.map(parseEvidence),
    cross_examination: Array.isArray(raw.cross_examination) ? raw.cross_examination.map(parseSuspect) : [],
    sanity_checks: sanityChecks,
    datasets: datasets.map((d, i) => {
      if (!isObject(d)) fail(`datasets[${i}]`, "must be an object");
      const w = `datasets[${i}]`;
      return { short_name: str(d, "short_name", w), provider: str(d, "provider", w), url: str(d, "url", w) };
    }),
    caveats: Array.isArray(raw.caveats) ? raw.caveats.filter((c): c is string => typeof c === "string") : [],
    primary_evidence: Array.isArray(raw.primary_evidence)
      ? raw.primary_evidence.filter((x): x is string => typeof x === "string")
      : [],
    land_cover: parseLandCover(raw.land_cover),
    satellite_agreement: parseAgreement(sanityChecks),
    flags: parseFlags(raw.flags),
  };
}
