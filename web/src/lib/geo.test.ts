import { describe, expect, test } from "vitest";

import { latLonToVector3 } from "./geo";

const close = (actual: readonly number[], expected: readonly number[]) =>
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 9));

describe("latLonToVector3", () => {
  test("puts the prime meridian on the equator at +X", () => {
    close(latLonToVector3(0, 0), [1, 0, 0]);
  });

  test("puts 90°E at -Z and 90°W at +Z (texture runs west to east around +Y)", () => {
    close(latLonToVector3(0, 90), [0, 0, -1]);
    close(latLonToVector3(0, -90), [0, 0, 1]);
  });

  test("puts the north pole at +Y and the south pole at -Y", () => {
    close(latLonToVector3(90, 123), [0, 1, 0]);
    close(latLonToVector3(-90, 0), [0, -1, 0]);
  });

  test("the date line from both sides is the same point, at -X", () => {
    close(latLonToVector3(0, 180), [-1, 0, 0]);
    close(latLonToVector3(0, -180), [-1, 0, 0]);
  });

  test("scales by radius and keeps Chennai in the northern, eastern (-Z) hemisphere", () => {
    const [x, y, z] = latLonToVector3(13.08, 80.27, 2);
    expect(Math.hypot(x, y, z)).toBeCloseTo(2, 9);
    expect(y).toBeGreaterThan(0);
    expect(z).toBeLessThan(0);
  });

  test("rejects latitudes off the globe", () => {
    expect(() => latLonToVector3(91, 0)).toThrow(RangeError);
    expect(() => latLonToVector3(Number.NaN, 0)).toThrow(RangeError);
  });
});
