"use client";

import { useTexture } from "@react-three/drei";
import type { Ref } from "react";
import { SRGBColorSpace, type Mesh, type Texture } from "three";

// NASA Blue Marble (via three-globe's example asset), stored locally so the demo works offline.
const BLUE_MARBLE = "/textures/earth-blue-marble.webp"; // 4096×2048, WebP q80 (642 KB; the .jpg is the 1.4 MB source)

type Props = { ref?: Ref<Mesh> };

function prepare(texture: Texture): void {
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
}

export function Earth({ ref }: Props) {
  const map = useTexture(BLUE_MARBLE, prepare);
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 128, 64]} />
      <meshStandardMaterial map={map} roughness={0.95} metalness={0} />
    </mesh>
  );
}

useTexture.preload(BLUE_MARBLE);
