import { describe, expect, test } from "vitest";

import { fitToSize } from "./fit-model";

describe("fitToSize", () => {
  test("scales Terra's ~26,000-unit extent so its longest side is the target", () => {
    // Bounds measured from terra.opt.glb.
    const fit = fitToSize({ min: [-6811, -4436, -5027], max: [6811, 5840, 21027] }, 0.12);
    expect(fit.scale * 26054).toBeCloseTo(0.12, 9);
  });

  test("gives Terra and Aqua the same on-screen size despite a 60x difference in units", () => {
    const terra = fitToSize({ min: [-6811, -4436, -5027], max: [6811, 5840, 21027] }, 1);
    const aqua = fitToSize({ min: [-45.4, -119.6, -397.8], max: [78.7, 110, 36.4] }, 1);
    expect(terra.scale * 26054).toBeCloseTo(aqua.scale * 434.2, 6);
  });

  test("moves an off-centre bounding box to the origin", () => {
    const fit = fitToSize({ min: [10, 20, 30], max: [14, 22, 40] }, 1);
    expect(fit.offset).toEqual([-12, -21, -35]);
  });

  test("rejects empty bounds and non-positive targets", () => {
    expect(() => fitToSize({ min: [0, 0, 0], max: [0, 0, 0] }, 1)).toThrow(RangeError);
    expect(() => fitToSize({ min: [0, 0, 0], max: [1, 1, 1] }, 0)).toThrow(RangeError);
  });
});
