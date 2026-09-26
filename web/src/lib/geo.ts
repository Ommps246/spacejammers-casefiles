/**
 * Latitude/longitude on the globe, matching three.js SphereGeometry's UV layout for an
 * equirectangular texture (u = 0 at longitude -180°, v = 0 at the north pole):
 *   lon 0° -> +X, lon 90°E -> -Z, north pole -> +Y.
 */
export type Vec3 = readonly [x: number, y: number, z: number];

const DEG = Math.PI / 180;

export function latLonToVector3(lat: number, lon: number, radius = 1): Vec3 {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError(`latitude out of range: ${lat}`);
  if (!Number.isFinite(lon)) throw new RangeError(`longitude is not a number: ${lon}`);
  const phi = (lon + 180) * DEG; // around the axis, from the texture's left edge
  const theta = (90 - lat) * DEG; // down from the north pole
  return [
    -radius * Math.sin(theta) * Math.cos(phi),
    radius * Math.cos(theta),
    radius * Math.sin(theta) * Math.sin(phi),
  ];
}
