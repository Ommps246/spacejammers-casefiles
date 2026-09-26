import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { parseCaseFile } from "./case-data";
import { buildEvidenceViews, caseVerdict } from "./evidence-view";

// The real pipeline output: these tests pin the numbers the approved mockups show.
const load = (id: string) =>
  parseCaseFile(JSON.parse(readFileSync(join(__dirname, "../../../data/cases", `${id}.json`), "utf8")));

const heat = load("chennai-heat");
const views = buildEvidenceViews(heat);
const byId = Object.fromEntries(views.map((v) => [v.id, v]));
const MINUS = "−";

describe("Chennai heat, as in the mockup", () => {
  test("labels three exhibits and one reference", () => {
    expect(views.map((v) => v.tag)).toEqual(["Exhibit A", "Exhibit B", "Exhibit C", "Reference"]);
  });

  test("Exhibit A: +0.065 °C per decade, p = 0.041, did not survive the multiple-test check", () => {
    expect(byId.temp_trend.stat).toEqual({ value: "+0.065", unit: "°C per decade" });
    expect(byId.temp_trend.meta).toBe("1981–2025 · p = 0.041 · did not survive the multiple-test check");
    expect(byId.temp_trend.strength).toBe("inconclusive");
  });

  test("Exhibit B: −1.54 days per decade, flagged as the unexpected direction", () => {
    expect(byId.hot_days.stat).toEqual({ value: `${MINUS}1.54`, unit: "days per decade" });
    expect(byId.hot_days.unexpectedDirection).toBe(true);
    expect(byId.hot_days.chart.legend).toBe(`Sen’s slope  ${MINUS}1.54 days / decade`);
  });

  test("Exhibit C: +0.21 °C after 1997, a lead at p = 0.17", () => {
    expect(byId.temp_shift.stat).toEqual({ value: "+0.21", unit: "°C after 1997" });
    expect(byId.temp_shift.strength).toBe("lead");
    expect(byId.temp_shift.meta).toBe("p = 0.17 · a lead to follow, not a finding");
  });

  test("the step drawn from the yearly series matches the pipeline's shift", () => {
    const after = byId.temp_shift.chart.points.filter((p) => p.x >= 1997);
    const mean = after.reduce((s, p) => s + p.y, 0) / after.length;
    const line = byId.temp_shift.chart.line;
    expect(line.kind).toBe("step");
    if (line.kind === "step") expect(mean).toBeCloseTo(line.after, 2);
  });

  test("Reference: the planet at +0.211 °C per decade, strong, p < 0.001", () => {
    expect(byId.global_context.isReference).toBe(true);
    expect(byId.global_context.stat.value).toBe("+0.211");
    expect(byId.global_context.meta).toBe("1981–2025 · p < 0.001");
    expect(byId.global_context.strength).toBe("strong");
    expect(byId.global_context.source).toBe("gistemp");
  });

  test("the case verdict ignores the planet-wide reference", () => {
    expect(caseVerdict(heat)).toBe("inconclusive");
  });

  test("plots every yearly point of the real series", () => {
    expect(byId.temp_trend.chart.points).toHaveLength(45);
  });
});

describe("unexpected-direction callout", () => {
  test("never on a zero slope, and never on the exhibit it's compared against", () => {
    const rain = buildEvidenceViews(load("chennai-rain"));
    expect(rain.filter((v) => v.unexpectedDirection).map((v) => v.id)).toEqual([]);
  });

  test("still flags Chennai's hot days going the other way from its warming", () => {
    expect(byId.hot_days.unexpectedDirection).toBe(true);
  });
});

describe("chart axis signs", () => {
  test("counts and totals get plain ticks; departures, differences and steps get signed ones", () => {
    const signed = (id: string, views: ReturnType<typeof buildEvidenceViews>) =>
      views.find((v) => v.id === id)?.chart.signedTicks;
    const rain = buildEvidenceViews(load("chennai-rain"));
    expect(["heavy_days", "max_day", "total"].map((id) => signed(id, rain))).toEqual([false, false, false]);
    expect(signed("hot_days", views)).toBe(false);
    expect(["temp_trend", "temp_shift", "global_context"].map((id) => signed(id, views))).toEqual([true, true, true]);
    const green = buildEvidenceViews(load("chennai-greenery"));
    expect(signed("ndvi_chennai_omr", green)).toBe(true); // yearly departures from the spot's usual greenness
    expect(signed("ndvi_gap_chennai_omr", green)).toBe(true);
  });
});
