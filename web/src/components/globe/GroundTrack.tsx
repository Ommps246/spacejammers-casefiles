"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";

import { latLonToVector3, type Vec3 } from "@/lib/geo";

// Stylised Terra descending pass over South India (landing mockup): north to south with the slight
// westward lean of a sun-synchronous orbit. Illustrative, not an orbit propagation.
const PASS = { lat: 12.3, lon: 78.4, leanDegPerDeg: 0.2 }; // passes between Chennai and the Nilgiris
const LAT_RANGE = { from: 82, to: -82, step: 1 };
const TRACK_RADIUS = 1.003;

export function trackPoint(lat: number, radius = TRACK_RADIUS): Vec3 {
  const lon = PASS.lon + PASS.leanDegPerDeg * (lat - PASS.lat);
  return latLonToVector3(lat, lon, radius);
}

export function GroundTrack() {
  const points = useMemo(() => {
    const out: Vec3[] = [];
    for (let lat = LAT_RANGE.from; lat >= LAT_RANGE.to; lat -= LAT_RANGE.step) out.push(trackPoint(lat));
    return out.map((p) => [...p] as [number, number, number]);
  }, []);

  return (
    <Line
      points={points}
      color="#c9a24a"
      transparent
      opacity={0.8} // the mockup's 55% was on a dark map; over the photo texture it vanished on land
      lineWidth={1.5}
      dashed
      dashSize={0.008}
      gapSize={0.014}
      toneMapped={false}
    />
  );
}
