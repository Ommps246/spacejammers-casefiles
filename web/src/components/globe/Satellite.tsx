"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { useMemo } from "react";
import { Box3 } from "three";

import { fitToSize } from "@/lib/fit-model";
import type { Vec3 } from "@/lib/geo";

// Models are meshopt-compressed (decoder bundled). Draco is off so drei never fetches its
// decoder from a CDN: the demo must work offline.
const USE_DRACO = false;

export const SATELLITE_MODELS = {
  terra: "/models/terra.opt.glb",
  aqua: "/models/aqua.opt.glb",
} as const;

type Props = {
  model: keyof typeof SATELLITE_MODELS;
  /** Longest side in scene units (the globe's radius is 1). */
  size: number;
} & ThreeElements["group"];

/**
 * A NASA satellite model, centred on its bounding box and scaled to `size`. For close-ups only (the
 * intro sequence, still to be built): at landing zoom the scene draws SatelliteMarker instead, and this
 * module (with its preload) is not imported, so the model isn't downloaded on the landing page.
 */
export function Satellite({ model, size, ...groupProps }: Props) {
  const { scene } = useGLTF(SATELLITE_MODELS[model], USE_DRACO);

  const { object, fit } = useMemo(() => {
    const object = scene.clone(true);
    const box = new Box3().setFromObject(object);
    const bounds = { min: box.min.toArray() as Vec3, max: box.max.toArray() as Vec3 };
    return { object, fit: fitToSize(bounds, size) };
  }, [scene, size]);

  return (
    <group {...groupProps}>
      <group scale={fit.scale}>
        <group position={fit.offset}>
          <primitive object={object} />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload(SATELLITE_MODELS.terra, USE_DRACO);
