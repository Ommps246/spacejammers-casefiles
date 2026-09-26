import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { parseCaseFile } from "./case-data";
import { parseNarration } from "./narration";
import { caseCountsLine, suspectRows } from "./suspects";

const DATA = join(__dirname, "../../../data");
const load = (id: string) => parseCaseFile(JSON.parse(readFileSync(join(DATA, "cases", `${id}.json`), "utf8")));
const narration = (id: string) =>
  parseNarration(JSON.parse(readFileSync(join(DATA, "narration", `${id}.json`), "utf8")));
const MINUS = "−";

describe("suspectRows", () => {
  test("Chennai heat: rainfall, same month, r from the JSON, finding from the narration", () => {
    expect(suspectRows(load("chennai-heat"), narration("chennai-heat"))).toEqual([
      {
        name: "Rainfall variability",
        question: "Do drier months explain the warm anomalies?",
        lag: "same month",
        r: `${MINUS}0.21`,
        n: 540,
        finding: narration("chennai-heat").suspects[0].finding,
      },
    ]);
  });

  test("Nilgiris heat: r = −0.38", () => {
    expect(suspectRows(load("nilgiris-heat"), narration("nilgiris-heat"))[0].r).toBe(`${MINUS}0.38`);
  });

  test("a lag of k months reads as 'k months later' (one month: singular)", () => {
    const heat = load("chennai-heat");
    const shifted = {
      ...heat,
      cross_examination: heat.cross_examination.map((s) => ({ ...s, best: s.best && { ...s.best, lag: 1 } })),
    };
    expect(suspectRows(shifted, null)[0]).toMatchObject({ lag: "1 month later", finding: null });
  });

  test("cases without cross-examination have no suspects", () => {
    expect(suspectRows(load("chennai-rain"), narration("chennai-rain"))).toEqual([]);
  });
});

describe("caseCountsLine", () => {
  test("as on the mockup, pluralized", () => {
    expect(caseCountsLine(load("chennai-heat"), narration("chennai-heat"))).toBe(
      "4 exhibits · 1 other suspect checked · 1 objection on the record",
    );
    expect(caseCountsLine(load("nilgiris-greenery"), narration("nilgiris-greenery"))).toBe(
      "1 exhibit · 1 objection on the record",
    );
    expect(caseCountsLine(load("chennai-rain"), null)).toBe("3 exhibits");
  });
});
