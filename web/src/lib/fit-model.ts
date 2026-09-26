import type { Vec3 } from "./geo";

export type Bounds = { min: Vec3; max: Vec3 };
export type Fit = { scale: number; offset: Vec3 };

/**
 * NASA models come in wildly different units with off-centre pivots (Terra spans ~26,000 units,
 * Aqua ~430). Returns the uniform scale that makes the longest side `targetSize`, and the offset
 * that moves the bounding-box centre to the origin (apply the offset first, then the scale).
 */
export function fitToSize({ min, max }: Bounds, targetSize: number): Fit {
  const size = max.map((v, i) => v - min[i]);
  const longest = Math.max(...size);
  if (!(longest > 0) || !Number.isFinite(longest)) {
    throw new RangeError("model has an empty or invalid bounding box");
  }
  if (!(targetSize > 0)) throw new RangeError(`target size must be positive, got ${targetSize}`);
  const offset = min.map((v, i) => -(v + max[i]) / 2) as unknown as Vec3;
  return { scale: targetSize / longest, offset };
}
