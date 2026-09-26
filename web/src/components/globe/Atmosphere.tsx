"use client";

import { useMemo } from "react";
import { AdditiveBlending, BackSide, Color } from "three";

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

// Inner rim: brightest where the surface turns away from the camera (the limb), zero face-on.
const rimFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float rim = 1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
    float glow = pow(rim, 4.0) * uIntensity;
    gl_FragColor = vec4(uColor * glow, glow);
  }
`;

// Outer halo, drawn on the back faces of a slightly larger shell: full strength at Earth's edge,
// fading to nothing at the shell's edge (uEdge = cos of the angle where the Earth's limb sits).
const haloFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uEdge;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float d = -dot(normalize(vNormal), normalize(vViewDir));
    float glow = pow(clamp(d / uEdge, 0.0, 1.0), 2.0) * uIntensity;
    gl_FragColor = vec4(uColor * glow, glow);
  }
`;

const HALO_SCALE = 1.06; // mockup: halo radius 378.6 vs globe 357.2

type Props = { color?: string; rimIntensity?: number; haloIntensity?: number };

/** Subtle blue atmosphere: a thin inner rim plus a soft halo just outside the limb. No bloom pass. */
export function Atmosphere({ color = "#6fa8ff", rimIntensity = 0.7, haloIntensity = 0.5 }: Props) {
  const rim = useMemo(
    () => ({ uColor: { value: new Color(color) }, uIntensity: { value: rimIntensity } }),
    [color, rimIntensity],
  );
  const halo = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uIntensity: { value: haloIntensity },
      uEdge: { value: Math.sqrt(1 - 1 / (HALO_SCALE * HALO_SCALE)) },
    }),
    [color, haloIntensity],
  );

  return (
    <>
      <mesh scale={1.02} raycast={() => null}>
        <sphereGeometry args={[1, 64, 32]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={rimFragment}
          uniforms={rim}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={HALO_SCALE} raycast={() => null}>
        <sphereGeometry args={[1, 64, 32]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={haloFragment}
          uniforms={halo}
          side={BackSide}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
