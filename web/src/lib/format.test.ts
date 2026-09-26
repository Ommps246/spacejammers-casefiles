import { describe, expect, test } from "vitest";

import { agree, formatP, formatSlope, formatStep, formatTick, formatTrend, formatYearSpan, plural } from "./format";

describe("formatSlope", () => {
  test("rounds to 3 significant figures and drops trailing zeros", () => {
    expect(formatSlope(0.06500431)).toBe("+0.065");
    expect(formatSlope(0.21128)).toBe("+0.211");
    expect(formatSlope(68.98)).toBe("+69");
  });

  test("uses a typographic minus for negative values", () => {
    expect(formatSlope(-1.5384615)).toBe("−1.54");
  });

  test("shows zero without a sign", () => {
    expect(formatSlope(0)).toBe("0");
  });
});

describe("formatStep", () => {
  test("keeps 2 decimals, like the pipeline's Pettitt sentence", () => {
    expect(formatStep(0.2085078)).toBe("+0.21");
    expect(formatStep(-0.4)).toBe("−0.40");
  });
});

describe("formatP", () => {
  test("gives 2 significant figures", () => {
    expect(formatP(0.04095904)).toBe("p = 0.041");
    expect(formatP(0.16841)).toBe("p = 0.17");
  });

  test("reports the bootstrap floor as p < 0.001", () => {
    expect(formatP(0.000999)).toBe("p < 0.001");
  });

  test("rejects values that are not p-values", () => {
    expect(() => formatP(1.2)).toThrow(RangeError);
    expect(() => formatP(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatYearSpan and formatTick", () => {
  test("formats a span of years with an en dash", () => {
    expect(formatYearSpan("1981-01-01", "2025-01-01")).toBe("1981–2025");
  });

  test("formats signed ticks and a bare zero", () => {
    expect(formatTick(0.5, 1)).toBe("+0.5");
    expect(formatTick(-4, 0)).toBe("−4");
    expect(formatTick(0, 1)).toBe("0");
  });
});

describe("formatTrend", () => {
  test("greenness (NDVI) trends always show 3 decimals", () => {
    expect(formatTrend(-0.04048, "NDVI per decade")).toBe("−0.040");
    expect(formatTrend(0.000404, "NDVI per decade")).toBe("+0.000");
    expect(formatTrend(0.0682, "NDVI per decade")).toBe("+0.068");
  });

  test("everything else keeps 3 significant figures", () => {
    expect(formatTrend(0.06504, "°C per decade")).toBe("+0.065");
    expect(formatTrend(-1.538, "days/yr per decade")).toBe("−1.54");
  });
});

describe("plural and agree", () => {
  test("one exhibit, many exhibits; irregular plurals when given", () => {
    expect(plural(1, "exhibit")).toBe("1 exhibit");
    expect(plural(4, "exhibit")).toBe("4 exhibits");
    expect(plural(0, "objection")).toBe("0 objections");
    expect(plural(1, "city spot")).toBe("1 city spot");
    expect(plural(2, "other suspect")).toBe("2 other suspects");
  });

  test("verbs agree with the count", () => {
    expect(agree(1, "passes", "pass")).toBe("passes");
    expect(agree(5, "passes", "pass")).toBe("pass");
  });
});

describe("formatTick signs", () => {
  test("change axes are signed; count and total axes are not", () => {
    expect(formatTick(0.5, 1)).toBe("+0.5");
    expect(formatTick(0.5, 1, false)).toBe("0.5");
    expect(formatTick(2000, 0, false)).toBe("2000");
    expect(formatTick(-4, 0, false)).toBe("−4"); // a negative still shows its minus
  });
});
