"use client";

import { Html } from "@react-three/drei";
import { useMemo, type RefObject } from "react";
import { Quaternion, Vector3, type Object3D } from "three";

import { latLonToVector3 } from "@/lib/geo";

import type { Place } from "./places";

type Props = {
  place: Place;
  color?: string;
  /** Objects that hide the label when they are between it and the camera (the Earth). */
  occluders?: RefObject<Object3D | null>[];
};

const Z_AXIS = new Vector3(0, 0, 1);
const SURFACE_LIFT = 1.0015; // just above the ground, so the marker never z-fights the texture
const RING = { inner: 0.0105, outer: 0.0165 };
const LABEL_GAP_PX = 12;

/** Flat map marker lying on the surface at the exact lat/lon: gold ring, dark centre, plain label. */
export function Pin({ place, color = "#c9a24a", occluders }: Props) {
  const { position, quaternion } = useMemo(() => {
    const normal = new Vector3(...latLonToVector3(place.lat, place.lon, 1));
    return {
      position: normal.clone().multiplyScalar(SURFACE_LIFT),
      quaternion: new Quaternion().setFromUnitVectors(Z_AXIS, normal), // ring faces outward
    };
  }, [place.lat, place.lon]);

  const labelShift =
    place.labelSide === "right"
      ? `translate(${LABEL_GAP_PX}px, -50%)`
      : `translate(calc(-100% - ${LABEL_GAP_PX}px), -50%)`;

  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <circleGeometry args={[RING.inner, 32]} />
        <meshBasicMaterial color="#0b1020" toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[RING.inner, RING.outer, 48]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <Html
        // drei's type predates React 19's nullable useRef(null); drei skips refs that are still empty.
        occlude={occluders as RefObject<Object3D>[] | undefined}
        zIndexRange={[20, 10]}
        style={{ transform: labelShift, pointerEvents: "none" }}
      >
        <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em] text-label [text-shadow:0_1px_6px_rgb(0_0_0/0.7)]">
          {place.name}
        </span>
      </Html>
    </group>
  );
}
