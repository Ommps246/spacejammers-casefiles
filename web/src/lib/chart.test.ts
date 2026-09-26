import { describe, expect, test } from "vitest";

import { linearScale, median, niceTicks, senIntercept, yearTicks } from "./chart";

describe("senIntercept", () => {
  test("recovers the intercept of points on a line", () => {
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 2 + 0.5 * x }));
    expect(senIntercept(points, 0.5)).toBeCloseTo(2, 12);
  });

  test("ignores a single outlier (median, not mean)", () => {
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 1 + x }));
    const withOutlier = points.map((p) => (p.x === 2 ? { ...p, y: 100 } : p));
    expect(senIntercept(withOutlier, 1)).toBeCloseTo(1, 12);
  });
});

describe("median", () => {
  test("handles odd and even lengths", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("niceTicks", () => {
  test("gives round steps that cover the data and include zero", () => {
    const t = niceTicks(-0.55, 0.9, 3);
    expect(t.values).toContain(0);
    expect(t.min).toBeLessThanOrEqual(-0.55);
    expect(t.max).toBeGreaterThanOrEqual(0.9);
    expect(t.decimals).toBe(1);
  });

  test("works for whole-number counts", () => {
    expect(niceTicks(0, 7, 3)).toMatchObject({ min: 0, max: 8, decimals: 0 });
  });
});

describe("linearScale and yearTicks", () => {
  test("maps domain to range, including an inverted y range", () => {
    const y = linearScale([0, 1], [100, 0]);
    expect(y(0)).toBe(100);
    expect(y(0.25)).toBe(75);
  });

  test("labels first, last and a round middle year", () => {
    expect(yearTicks(1981, 2025)).toEqual([1981, 2000, 2025]);
  });
});
