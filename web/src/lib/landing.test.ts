import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { parseCaseFile } from "./case-data";
import { cardTag, GRID_CASES, FEATURED_CASE, landingStats } from "./landing";

const load = (id: string) =>
  parseCaseFile(JSON.parse(readFileSync(join(__dirname, "../../../data/cases", `${id}.json`), "utf8")));

const shown = [FEATURED_CASE, ...GRID_CASES].map(load);

describe("landing cases", () => {
  test("night heat is featured; six more in the grid; no Pulicat", () => {
    expect(FEATURED_CASE).toBe("chennai-night-heat");
    expect(GRID_CASES).toEqual([
      "chennai-greenery",
      "chennai-heat",
      "chennai-rain",
      "nilgiris-heat",
      "nilgiris-greenery",
      "nilgiris-rain",
    ]);
  });
});

describe("landingStats", () => {
  test("every number is counted from the case files shown", () => {
    expect(landingStats(shown)).toEqual({
      cases: 7,
      datasets: 6, // POWER, GISTEMP, MOD11A2, MYD11A2, MOD13Q1, MCD12Q1
      places: 11,
      satellitePoints: 9, // 8 around Chennai + Ooty
      gridPoints: 2, // the NASA POWER weather-grid points for Chennai and Nilgiris
      firstYear: 1981,
      lastYear: 2025,
      years: 45,
    });
  });
});

describe("cardTag", () => {
  test("Chennai rain: the detector check passed", () => {
    expect(cardTag(load("chennai-rain"), shown)).toEqual({ kind: "detector", text: "Detector check · passed" });
  });

  test("Chennai greenery: One to watch, named from the land-cover change", () => {
    expect(cardTag(load("chennai-greenery"), shown)).toEqual({ kind: "watch", text: "One to watch: OMR IT corridor" });
  });

  test("no tag where nothing applies", () => {
    for (const id of ["chennai-heat", "nilgiris-heat", "nilgiris-greenery", "nilgiris-rain"]) {
      expect(cardTag(load(id), shown)).toBeNull();
    }
  });
});
