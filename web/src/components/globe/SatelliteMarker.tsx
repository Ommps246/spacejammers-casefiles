"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Group } from "three";

import { trackPoint } from "./GroundTrack";

// At landing zoom a satellite model is a smudge (and not to scale anyway), so Terra is a small glowing
// gold marker riding its dotted ground track. The 3D model (Satellite.tsx) is kept for a close-up.
const CORE = { radius: 0.011, color: "#f2d27a" };
const GLOW = [
  { radius: 0.02, opacity: 0.45 },
  { radius: 0.036, opacity: 0.18 },
] as const;
const GOLD = "#c9a24a";

// Illustrative motion along the stylised descending pass (GroundTrack.tsx), not an orbit propagation.
const TRACK = { from: 82, to: -82 }; // degrees of latitude the pass spans
const PASS_SECONDS = 40; // one north-to-south pass across the visible track

type Props = {
  /** Latitude to start from (and stay at when not orbiting). */
  lat: number;
  radius: number;
  /** Move along the ground track; off under prefers-reduced-motion. */
  orbiting: boolean;
};

export function SatelliteMarker({ lat, radius, orbiting }: Props) {
  const ref = useRef<Group>(null);
  const t = useRef((TRACK.from - lat) / (TRACK.from - TRACK.to)); // 0..1 along the pass

  useFrame((_, delta) => {
    if (!orbiting || !ref.current) return;
    t.current = (t.current + delta / PASS_SECONDS) % 1;
    const nowLat = TRACK.from - t.current * (TRACK.from - TRACK.to);
    ref.current.position.set(...trackPoint(nowLat, radius));
  });

  return (
    <Billboard ref={ref} position={[...trackPoint(lat, radius)]}>
      {GLOW.map((g) => (
        <mesh key={g.radius} renderOrder={1}>
          <circleGeometry args={[g.radius, 40]} />
          <meshBasicMaterial
            color={GOLD}
            transparent
            opacity={g.opacity}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh renderOrder={2}>
        <circleGeometry args={[CORE.radius, 32]} />
        <meshBasicMaterial color={CORE.color} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}
