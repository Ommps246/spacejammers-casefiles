"use client";

import { Billboard } from "@react-three/drei";
import { AdditiveBlending } from "three";

import type { Vec3 } from "@/lib/geo";

// At landing zoom a satellite model is a smudge (and not to scale anyway), so Terra is a small glowing
// gold marker riding its dotted ground track. The 3D model (Satellite.tsx) is kept for a close-up.
const CORE = { radius: 0.011, color: "#f2d27a" };
const GLOW = [
  { radius: 0.02, opacity: 0.45 },
  { radius: 0.036, opacity: 0.18 },
] as const;
const GOLD = "#c9a24a";

export function SatelliteMarker({ position }: { position: Vec3 }) {
  return (
    <Billboard position={[...position]}>
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
