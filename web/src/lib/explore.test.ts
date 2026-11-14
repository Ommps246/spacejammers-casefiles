import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { parseCaseFile, type TrendEvidence } from "./case-data";
import { exploreVariables, tally } from "./explore";
import { FEATURED_CASE, GRID_CASES } from "./landing";

const load = (id: string) =>
  parseCaseFile(JSON.parse(readFileSync(join(__dirname, "../../../data/cases", `${id}.json`), "utf8")));
const cases = [FEATURED_CASE, ...GRID_CASES].map(load);
const variables = exploreVariables(cases);
const byId = (id: string) => variables.find((v) => v.id === id)!;

describe("explore", () => {
  test("every trend in the shown cases appears exactly once (the planet line once, not per case)", () => {
    const unique = new Set(
      cases.flatMap((c) =>
        c.evidence.flatMap((e) => (e.kind !== "trend" ? [] : [e.id === "global_context" ? "planet" : `${c.case_id}/${e.id}`])),
      ),
    );
    const rows = variables.flatMap((v) => v.rows);
    expect(rows.length).toBe(unique.size);
    expect(rows.filter((r) => r.reference)).toHaveLength(1);
  });

  test("numbers and verdicts are the case files' own", () => {
    const night = load("chennai-night-heat");
    const omr = night.evidence.find((e) => e.id === "night_lst_chennai_omr") as TrendEvidence;
    const row = byId("night-ground-heat").rows.find((r) => r.key === "chennai-night-heat/night_lst_chennai_omr")!;
    expect(row.slope).toBe(omr.stats.slope_per_decade);
    expect(row.p).toBe(omr.stats.p_value);
    expect(row.strength).toBe(omr.stats.verdict_strength);
    expect(row.place).toBe("OMR IT corridor");
  });

  test("greenness moves both ways across places, and the tally counts only passed trends", () => {
    const t = tally(byId("greenness").rows);
    expect(t.rising).toBeGreaterThan(0);
    expect(t.falling).toBeGreaterThan(0);
    const rows = byId("greenness").rows;
    expect(t.rising + t.falling + t.unclear).toBe(rows.length);
    for (const r of rows) if (r.strength === "inconclusive") expect(r.trend).toBe("no clear trend");
  });

  test("city-minus-countryside gaps are all leads; the planet is a reference, listed last", () => {
    for (const id of ["night-heat-gap", "greenness-gap"]) for (const r of byId(id).rows) expect(r.lead).toBe(true);
    const air = byId("air-temperature").rows;
    expect(air[air.length - 1].reference).toBe(true);
    expect(air[air.length - 1].place).toBe("Whole planet");
  });
});
