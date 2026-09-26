import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { parseCaseFile } from "./case-data";
import {
  agreementRows,
  agreementSpan,
  dotPlotCaption,
  farmlandGapSentence,
  floodCheck,
  groupEvidence,
  landCoverRows,
  oneToWatch,
  pointDots,
  referenceComparison,
  shortPointName,
  strengthTally,
} from "./case-sections";
import { buildEvidenceViews, caseVerdict } from "./evidence-view";

// The real pipeline output (data/cases), as in evidence-view.test.ts.
const load = (id: string) =>
  parseCaseFile(JSON.parse(readFileSync(join(__dirname, "../../../data/cases", `${id}.json`), "utf8")));

const night = load("chennai-night-heat");
const greenery = load("chennai-greenery");
const views = buildEvidenceViews(night);
const byId = Object.fromEntries(views.map((v) => [v.id, v]));
const MINUS = "−";

describe("night-heat evidence views", () => {
  test("city-minus-countryside gaps are leads, not inconclusive", () => {
    const gaps = views.filter((v) => v.id.startsWith("uhi_"));
    expect(gaps).toHaveLength(4);
    for (const g of gaps) {
      expect(g.strength).toBe("lead");
      expect(g.meta).toMatch(/a lead to follow, not a finding$/);
    }
  });

  test("Chengalpattu carries the urban-edge tag linking to the reference rule", () => {
    expect(byId.night_lst_chengalpattu_edge.badge).toEqual({
      text: "Urban edge, not used as a control",
      href: "/methods#s8",
    });
    expect(byId.night_lst_chennai_core.badge).toBeUndefined();
  });

  test("satellite exhibits cite MODIS, weather exhibits still cite POWER", () => {
    expect(byId.night_lst_chennai_core.source).toBe("modis");
    expect(buildEvidenceViews(load("chennai-heat"))[0].source).toBe("power");
  });
});

describe("groupEvidence", () => {
  test("city points (with the urban edge), then countryside controls, then the gaps", () => {
    const groups = groupEvidence(night, views);
    expect(groups.map((g) => g.key)).toEqual(["city", "countryside", "gap"]);
    expect(groups[0].views.map((v) => v.id)).toEqual([
      "night_lst_chennai_core",
      "night_lst_chennai_omr",
      "night_lst_chennai_tambaram",
      "night_lst_chennai_avadi",
      "night_lst_chengalpattu_edge",
    ]);
    expect(groups[1].views.map((v) => v.id)).toEqual([
      "night_lst_rural_kanchipuram_west",
      "night_lst_rural_uthiramerur_south",
      "night_lst_rural_uthukottai_north",
    ]);
    expect(groups[2].views.every((v) => v.id.startsWith("uhi_"))).toBe(true);
  });

  test("a case without roles is one plain group", () => {
    const heat = load("chennai-heat");
    const groups = groupEvidence(heat, buildEvidenceViews(heat));
    expect(groups).toHaveLength(1);
    expect(groups[0].views).toHaveLength(heat.evidence.length);
  });
});

describe("landCoverRows", () => {
  test("OMR changed from Cropland to Urban/built-up; nothing else changed", () => {
    const rows = landCoverRows(night);
    const omr = rows.find((r) => r.id === "chennai_omr");
    expect(omr).toMatchObject({ from: "Cropland", to: "Urban/built-up", changed: true });
    expect(rows.filter((r) => r.changed).map((r) => r.id)).toEqual(["chennai_omr"]);
    expect(rows).toHaveLength(8);
  });

  test("a case without a land-cover block has no rows", () => {
    expect(landCoverRows(load("chennai-heat"))).toEqual([]);
  });
});

describe("agreementRows", () => {
  test("the three flagged points are marked, with both slopes formatted from the JSON", () => {
    const rows = agreementRows(night);
    expect(rows.filter((r) => r.flagged).map((r) => r.id)).toEqual([
      "chennai_avadi",
      "rural_kanchipuram_west",
      "rural_uthukottai_north",
    ]);
    const avadi = rows.find((r) => r.id === "chennai_avadi");
    expect(avadi).toMatchObject({
      terra: "+0.613",
      aqua: "+0.356",
      years: "2003–2025",
      months: 208,
      sameDirection: true,
    });
  });
});

describe("oneToWatch", () => {
  test("links OMR's three signals: land cover changed, greenery down, largest gap", () => {
    const watch = oneToWatch(night, greenery);
    expect(watch).not.toBeNull();
    expect(watch?.pointId).toBe("chennai_omr");
    expect(watch?.landCover).toEqual({ from: "Cropland", to: "Urban/built-up" });
    expect(watch?.greenery).toEqual({ value: `${MINUS}0.040`, strength: "moderate", falling: true });
    expect(watch?.gap).toEqual({ value: "+0.252", unit: "°C per decade", largest: true, signal: "inconclusive" });
  });

  test("no callout without the greenery case", () => {
    expect(oneToWatch(night, null)).toBeNull();
  });
});

describe("pointDots", () => {
  test("one row per point, sorted by night-warming rate, with each point's role", () => {
    const dots = pointDots(night);
    expect(dots).toHaveLength(8);
    expect(dots.map((d) => d.slope)).toEqual([...dots.map((d) => d.slope)].sort((a, b) => b - a));
    expect(dots[0]).toMatchObject({ id: "chengalpattu_edge", kind: "edge", name: "Chengalpattu", label: "+0.797" });
    expect(
      dots
        .filter((d) => d.kind === "control")
        .map((d) => d.id)
        .sort(),
    ).toEqual(["rural_kanchipuram_west", "rural_uthiramerur_south", "rural_uthukottai_north"]);
    expect(dots.filter((d) => d.kind === "city")).toHaveLength(4);
  });

  test("slopes are the exhibits' own Sen's slopes, not the Terra/Aqua overlap rates", () => {
    const omr = pointDots(night).find((d) => d.id === "chennai_omr");
    const exhibit = night.evidence.find((e) => e.id === "night_lst_chennai_omr");
    expect(exhibit?.kind === "trend" && exhibit.stats.slope_per_decade).toBe(omr?.slope);
  });

  test("cases without point roles have no dots", () => {
    expect(pointDots(load("chennai-heat"))).toEqual([]);
  });
});

describe("agreementSpan", () => {
  test("the overlap years come from the Terra/Aqua check", () => {
    expect(agreementSpan(night)).toBe("2003–2025");
    expect(agreementSpan(load("chennai-heat"))).toBeNull();
  });
});

describe("shortPointName", () => {
  test("drops the bracketed description", () => {
    expect(shortPointName("Kanchipuram west farmland (countryside control)")).toBe("Kanchipuram west farmland");
    expect(shortPointName("Ooty")).toBe("Ooty");
  });
});

describe("collapsible groups", () => {
  test("countryside and gaps collapse and carry each exhibit's verdict badge; the city group doesn't", () => {
    const groups = groupEvidence(night, views);
    expect(groups.map((g) => g.collapsible)).toEqual([false, true, true]);
    expect(groups[1].badges).toEqual([
      { id: "night_lst_rural_kanchipuram_west", name: "Kanchipuram west farmland", strength: "moderate" },
      { id: "night_lst_rural_uthiramerur_south", name: "Uthiramerur south farmland", strength: "moderate" },
      { id: "night_lst_rural_uthukottai_north", name: "Uthukottai north farmland", strength: "moderate" },
    ]);
    expect(groups[2].badges.every((b) => b.strength === "lead" && b.signal === "inconclusive")).toBe(true);
  });
});

describe("dot plot caption and fading", () => {
  test("both counts come from the case file", () => {
    const dots = pointDots(night);
    expect(dotPlotCaption(dots, "night-heat")).toBe(
      "All 8 spots show night warming; all 8 pass the multiple-test check.",
    );
  });

  test("inconclusive points are faded: none at night, three in greenery", () => {
    expect(pointDots(night).filter((d) => d.faded)).toEqual([]);
    expect(
      pointDots(greenery)
        .filter((d) => d.faded)
        .map((d) => d.id)
        .sort(),
    ).toEqual(["chennai_core", "chennai_tambaram", "rural_uthiramerur_south"]);
  });

  test("the wording follows the data, not the other way round", () => {
    const dot = (slope: number, passes: boolean) =>
      ({ id: String(slope), name: "x", kind: "city", slope, label: "", passes, faded: !passes }) as const;
    expect(dotPlotCaption([dot(0.2, true), dot(-0.1, false), dot(0.3, true)], "night-heat")).toBe(
      "2 of 3 spots show night warming; 2 of 3 pass the multiple-test check.",
    );
    expect(dotPlotCaption([dot(0.2, true), dot(0.1, true)], "night-heat")).toBe(
      "All 2 spots show night warming; all 2 pass the multiple-test check.",
    );
  });
});

describe("greenery case", () => {
  const gviews = buildEvidenceViews(greenery);

  test("same grouping as night heat: city (with edge), countryside, gaps as leads", () => {
    const groups = groupEvidence(greenery, gviews);
    expect(groups.map((g) => g.key)).toEqual(["city", "countryside", "gap"]);
    expect(groups[1].views.map((v) => v.id)).toEqual([
      "ndvi_rural_kanchipuram_west",
      "ndvi_rural_uthiramerur_south",
      "ndvi_rural_uthukottai_north",
    ]);
    expect(groups[2].views.every((v) => v.strength === "lead")).toBe(true);
    expect(groups[2].hint).toMatch(/green/);
  });

  test("dots: browning left of zero, greening right, caption counts from the JSON", () => {
    const dots = pointDots(greenery);
    expect(dots).toHaveLength(8);
    expect(
      dots
        .filter((d) => d.slope < 0)
        .map((d) => d.id)
        .sort(),
    ).toEqual(["chennai_core", "chennai_omr", "chennai_tambaram"]);
    expect(dotPlotCaption(dots, "greenery")).toBe(
      "5 of 8 pass the check: 4 greening, 1 browning; 3 show no clear change.",
    );
    expect(dots.find((d) => d.id === "chennai_omr")?.label).toBe(`${MINUS}0.040`); // NDVI: 3 decimals
  });

  test("no 'unexpected direction' callout: per-point exhibits are expected to differ in sign", () => {
    expect(gviews.filter((v) => v.unexpectedDirection)).toEqual([]);
  });

  test("gap exhibits get their own axis label", () => {
    expect(gviews.find((v) => v.id === "ndvi_gap_chennai_omr")?.chart.axisLabel).toBe("greenness, city minus farmland");
  });

  test("One to watch works from the greenery side too", () => {
    expect(oneToWatch(night, greenery)?.pointId).toBe("chennai_omr");
  });
});

describe("headline strength comes from the data", () => {
  test("the strength at least half the points reach, leads and references aside", () => {
    expect(caseVerdict(night)).toBe("strong"); // 5 strong, 3 moderate
    expect(caseVerdict(greenery)).toBe("moderate"); // 1 strong, 4 moderate, 3 inconclusive
    expect(caseVerdict(load("chennai-heat"))).toBe("inconclusive");
  });

  test("the tally behind it", () => {
    expect(strengthTally(greenery)).toBe("Strong 1 · Moderate 4 · Inconclusive 3, of 8 points");
    expect(strengthTally(night)).toBe("Strong 5 · Moderate 3, of 8 points");
    expect(strengthTally(load("chennai-heat"))).toBe("Inconclusive 2, of 2 tests");
  });
});

describe("lead badges carry the signal strength", () => {
  test("greenery gaps: strong, strong, strong, no clear signal", () => {
    const signals = buildEvidenceViews(greenery)
      .filter((v) => v.id.startsWith("ndvi_gap_"))
      .map((v) => [v.id, v.strength, v.leadSignal]);
    expect(signals).toEqual([
      ["ndvi_gap_chennai_core", "lead", "strong"],
      ["ndvi_gap_chennai_omr", "lead", "strong"],
      ["ndvi_gap_chennai_tambaram", "lead", "strong"],
      ["ndvi_gap_chennai_avadi", "lead", "inconclusive"],
    ]);
  });

  test("a change-point lead reads its signal from the Pettitt p-value (0.17 in Chennai: no clear signal)", () => {
    const shift = buildEvidenceViews(load("chennai-heat")).find((v) => v.id === "temp_shift");
    expect(shift?.leadSignal).toBe("inconclusive");
    const nilgiris = buildEvidenceViews(load("nilgiris-heat")).find((v) => v.id === "temp_shift");
    expect(nilgiris?.leadSignal).toBe("moderate"); // p = 0.041
  });
});

describe("farmlandGapSentence", () => {
  test("greenery: counts city spots falling behind greening farmland", () => {
    expect(farmlandGapSentence(greenery)).toBe(
      "Against greening farmland, 3 of 4 city spots are falling behind (a lead: farmland greening can be " +
        "irrigation or extra crops, not trees).",
    );
  });

  test("only for the greenery case", () => {
    expect(farmlandGapSentence(night)).toBeNull();
  });
});

describe("referenceComparison (heat cases)", () => {
  test("the region is a dot; the whole planet is a reference line, not a dot", () => {
    const heat = load("chennai-heat");
    const planet = heat.evidence.find((e) => e.id === "global_context");
    const cmp = referenceComparison(heat);
    expect(cmp?.dots.map((d) => [d.name, d.kind, d.label, d.faded])).toEqual([["Chennai", "region", "+0.065", true]]);
    expect(cmp?.reference).toEqual({
      name: "Whole planet",
      value: planet?.kind === "trend" ? planet.stats.slope_per_decade : NaN,
      label: "+0.211",
    });
    expect(cmp?.caption).toBe(
      "Chennai: +0.065 °C per decade (didn’t pass the check); the whole planet: +0.211 (strong).",
    );
  });

  test("Nilgiris passes; rain and greenery have no planet line", () => {
    expect(referenceComparison(load("nilgiris-heat"))?.caption).toBe(
      "Nilgiris: +0.118 °C per decade (moderate); the whole planet: +0.211 (strong).",
    );
    expect(referenceComparison(load("chennai-rain"))).toBeNull();
    expect(referenceComparison(greenery)).toBeNull();
  });
});

describe("floodCheck", () => {
  test("Chennai rain: the 2015 floods rank #1 of 45 years, so the check passed", () => {
    expect(floodCheck(load("chennai-rain"))).toEqual({
      question: "Does the data show the Nov–Dec 2015 Chennai floods?",
      passed: true,
      rank: 1,
      years: 45,
      mm: "1267.9",
    });
  });

  test("no check, no card", () => {
    expect(floodCheck(load("nilgiris-rain"))).toBeNull();
  });
});

describe("counts read correctly at one", () => {
  const dot = (id: string, slope: number, passes: boolean) =>
    ({ id, name: id, kind: "city", slope, label: "", passes, faded: !passes }) as const;

  test("greenery caption with a single passing point and a single unclear one", () => {
    expect(dotPlotCaption([dot("a", 0.1, true), dot("b", 0.01, false)], "greenery")).toBe(
      "1 of 2 passes the check: 1 greening, 0 browning; 1 shows no clear change.",
    );
  });

  test("night caption with one warming spot", () => {
    expect(dotPlotCaption([dot("a", 0.1, true), dot("b", -0.1, false)], "night-heat")).toBe(
      "1 of 2 spots shows night warming; 1 of 2 passes the multiple-test check.",
    );
  });
});
