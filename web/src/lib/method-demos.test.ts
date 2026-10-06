import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  bhCutoff,
  blockResample,
  clockLabel,
  durationLabel,
  hoursUntil,
  kmOffset,
  mannKendallS,
  rankTests,
  type FdrTest,
} from "./method-demos";

const DATA = join(__dirname, "..", "..", "..", "data");
const readJson = (...path: string[]) => JSON.parse(readFileSync(join(DATA, ...path), "utf8"));

/** The frozen family with each test's numbers, read the way the /methods page reads them. */
function family(): FdrTest[] {
  const list: { case_id: string; evidence_id: string }[] = readJson("fdr_family.json");
  return list.map(({ case_id, evidence_id }) => {
    const e = readJson("cases", `${case_id}.json`).evidence.find((x: { id: string }) => x.id === evidence_id);
    return {
      caseId: case_id,
      evidenceId: evidence_id,
      label: e.label,
      caseLabel: case_id,
      p: e.stats.p_value,
      strength: e.stats.verdict_strength,
      survives: e.stats.survives_fdr,
      lead: Boolean(e.lead),
    };
  });
}

describe("the false-discovery chart", () => {
  test("the chart's pass line agrees with the pipeline's own survives_fdr flags", () => {
    const ranked = rankTests(family());
    const cutoff = bhCutoff(ranked);
    expect(ranked.length).toBe(40);
    expect(ranked.filter((t) => t.survives).length).toBe(cutoff);
    for (const t of ranked) expect(t.survives).toBe(t.rank <= cutoff);
  });

  test("a test above its own bar still passes when a later one is under the bar (step-up rule)", () => {
    const make = (p: number): FdrTest => ({ caseId: "c", evidenceId: String(p), label: "", caseLabel: "", p, strength: "moderate", survives: true, lead: false });
    const ranked = rankTests([0.03, 0.04, 0.001].map(make)); // bars: 0.0167, 0.0333, 0.05
    expect(ranked.map((t) => t.p)).toEqual([0.001, 0.03, 0.04]);
    expect(bhCutoff(ranked)).toBe(3);
    expect(bhCutoff(rankTests([0.2, 0.6].map(make)))).toBe(0);
  });
});

describe("the shuffle demo", () => {
  test("Mann-Kendall S counts rising pairs minus falling pairs", () => {
    expect(mannKendallS([1, 2, 3, 4])).toBe(6);
    expect(mannKendallS([4, 3, 2, 1])).toBe(-6);
    expect(mannKendallS([1, 1, 1])).toBe(0);
  });

  test("a resample is whole blocks of consecutive years, cut to the original length", () => {
    const picks = [0, 0.99, 0.5];
    let i = 0;
    const order = blockResample(10, 4, () => picks[i++]);
    expect(order).toEqual([0, 1, 2, 3, 6, 7, 8, 9, 3, 4]);
    expect(() => blockResample(5, 6)).toThrow(RangeError);
  });
});

describe("the map and the dial", () => {
  test("offsets are in km, east and north of the origin", () => {
    const off = kmOffset({ lat: 13, lon: 80 }, { lat: 14, lon: 79 });
    expect(off.north).toBeCloseTo(111.2, 1);
    expect(off.east).toBeCloseTo(-108.35, 1);
  });

  test("clock arithmetic wraps past midnight", () => {
    expect(hoursUntil(22.5, 1.5)).toBe(3);
    expect(hoursUntil(10.5, 10.5)).toBe(0);
    expect(clockLabel(13.5)).toBe("1:30 p.m.");
    expect(clockLabel(0)).toBe("12:00 a.m.");
    expect(clockLabel(22.25)).toBe("10:15 p.m.");
    expect(durationLabel(0.75)).toBe("45 min");
    expect(durationLabel(2.5)).toBe("2 h 30 min");
    expect(durationLabel(3)).toBe("3 h");
  });
});
