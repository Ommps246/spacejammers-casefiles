import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Strength } from "./case-data";
import type { FdrTest, MapPoint, ShuffleSeries } from "./method-demos";

/** Loads the numbers behind the /methods exhibits straight from the pipeline's JSON (copied by copy-data.mjs). */
const DATA = join(process.cwd(), "public", "data");

type RawEvidence = {
  id: string;
  label: string;
  lead?: unknown;
  point?: { id: string };
  stats: { p_value: number; verdict_strength: Strength; survives_fdr: boolean | null; block_length: number; slope_per_decade: number; units_per_decade: string };
  series: { t: string; v: number }[];
};
type RawPoint = {
  point: { id: string; name: string; lat: number; lon: number };
  role: string | null;
  class_2001: { name: string } | null;
  class_2024: { name: string } | null;
  passes_reference_rule: boolean;
};
type RawCase = {
  case_id: string;
  topic: string;
  region: { name: string };
  evidence: RawEvidence[];
  land_cover?: { points: RawPoint[] };
  reference?: { points: string[] };
};

async function readJson<T>(...path: string[]): Promise<T> {
  return JSON.parse(await readFile(join(DATA, ...path), "utf8")) as T;
}

const cache = new Map<string, Promise<RawCase>>();
function rawCase(id: string): Promise<RawCase> {
  const hit = cache.get(id) ?? readJson<RawCase>("cases", `${id}.json`);
  cache.set(id, hit);
  return hit;
}

function evidence(c: RawCase, id: string): RawEvidence {
  const found = c.evidence.find((e) => e.id === id);
  if (!found) throw new Error(`${c.case_id}: no evidence "${id}"`);
  return found;
}

const TOPIC_WORDS: Record<string, string> = {
  heat: "heat",
  rain: "rain",
  greenery: "greenery",
  "night-heat": "night heat",
};

/** The frozen family (data/fdr_family.json), each test with its p-value and verdict from its case file. */
export async function loadFdrFamily(): Promise<FdrTest[]> {
  const family = await readJson<{ case_id: string; evidence_id: string }[]>("fdr_family.json");
  return Promise.all(
    family.map(async ({ case_id, evidence_id }): Promise<FdrTest> => {
      const c = await rawCase(case_id);
      const e = evidence(c, evidence_id);
      if (typeof e.stats.survives_fdr !== "boolean") throw new Error(`${case_id}/${evidence_id}: not in the family`);
      return {
        caseId: case_id,
        evidenceId: evidence_id,
        label: e.label,
        caseLabel: `${c.region.name} ${TOPIC_WORDS[c.topic] ?? c.topic}`,
        p: e.stats.p_value,
        strength: e.stats.verdict_strength,
        survives: e.stats.survives_fdr,
        lead: Boolean(e.lead),
      };
    }),
  );
}

const SHUFFLE_PICKS = [
  { caseId: "chennai-heat", evidenceId: "global_context", name: "The planet", what: "Global temperature, °C above the long-term average, each year" },
  { caseId: "chennai-night-heat", evidenceId: "night_lst_chennai_core", name: "Chennai nights", what: "Night ground temperature in central Chennai, °C above or below its own normal, each year" },
  { caseId: "chennai-rain", evidenceId: "total", name: "Chennai rain", what: "Total rainfall around Chennai, mm, each year" },
] as const;

/** Three real yearly series for the shuffle demo, with the block length and verdict the pipeline gave each. */
export async function loadShuffleSeries(): Promise<ShuffleSeries[]> {
  return Promise.all(
    SHUFFLE_PICKS.map(async (pick): Promise<ShuffleSeries> => {
      const e = evidence(await rawCase(pick.caseId), pick.evidenceId);
      return {
        id: `${pick.caseId}/${pick.evidenceId}`,
        name: pick.name,
        what: pick.what,
        caseId: pick.caseId,
        years: e.series.map((s) => Number(s.t.slice(0, 4))),
        values: e.series.map((s) => s.v),
        blockLength: e.stats.block_length,
        p: e.stats.p_value,
        strength: e.stats.verdict_strength,
      };
    }),
  );
}

const NIGHT_CASE = "chennai-night-heat";

/** The Chennai satellite points: where they are, what MODIS calls the ground, and each one's night trend. */
export async function loadMapPoints(): Promise<MapPoint[]> {
  const c = await rawCase(NIGHT_CASE);
  const references = new Set(c.reference?.points ?? []);
  return (c.land_cover?.points ?? []).map((p): MapPoint => {
    const night = c.evidence.find((e) => e.point?.id === p.point.id && e.id.startsWith("night_lst_"));
    return {
      id: p.point.id,
      name: p.point.name,
      lat: p.point.lat,
      lon: p.point.lon,
      role: p.role ?? "",
      class2001: p.class_2001?.name ?? "not classified",
      class2024: p.class_2024?.name ?? "not classified",
      passesRule: p.passes_reference_rule,
      isReference: references.has(p.point.id),
      nightTrend: night
        ? { slope: night.stats.slope_per_decade, units: night.stats.units_per_decade, p: night.stats.p_value, strength: night.stats.verdict_strength }
        : null,
    };
  });
}
