"use client";

import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo, useState, type RefObject } from "react";
import { Quaternion, Vector3, type Object3D } from "three";

import { latLonToVector3 } from "@/lib/geo";

import type { Place } from "./places";

type Props = {
  place: Place;
  color?: string;
  /** Objects that hide the label when they are between it and the camera (the Earth). */
  occluders?: RefObject<Object3D | null>[];
  /** When set, the pin and its label open the place's case (the ring on click, the label as a button). */
  onOpen?: (place: Place) => void;
};

const Z_AXIS = new Vector3(0, 0, 1);
const SURFACE_LIFT = 1.0015; // just above the ground, so the marker never z-fights the texture
const RING = { inner: 0.0105, outer: 0.0165 };
const HOVER_SCALE = 1.35;
const LABEL_GAP_PX = 12;

/** Flat map marker lying on the surface at the exact lat/lon: gold ring, dark centre, plain label. */
export function Pin({ place, color = "#c9a24a", occluders, onOpen }: Props) {
  const [hovered, setHovered] = useState(false);
  const { position, quaternion } = useMemo(() => {
    const normal = new Vector3(...latLonToVector3(place.lat, place.lon, 1));
    return {
      position: normal.clone().multiplyScalar(SURFACE_LIFT),
      quaternion: new Quaternion().setFromUnitVectors(Z_AXIS, normal), // ring faces outward
    };
  }, [place.lat, place.lon]);

  const canOpen = Boolean(onOpen && place.caseId);
  const labelShift =
    place.labelSide === "right"
      ? `translate(${LABEL_GAP_PX}px, -50%)`
      : `translate(calc(-100% - ${LABEL_GAP_PX}px), -50%)`;

  const hover = (on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    if (!canOpen) return;
    e.stopPropagation();
    setHovered(on);
    document.body.style.cursor = on ? "pointer" : "";
  };
  const open = () => {
    if (canOpen) onOpen?.(place);
  };

  const text = (
    <>
      {place.name}
      {canOpen && hovered && <span className="font-medium text-gold-soft"> · Open the {place.caseLabel} →</span>}
    </>
  );
  const labelClass =
    "whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em] text-label [text-shadow:0_1px_6px_rgb(0_0_0/0.7)]";

  return (
    <group position={position} quaternion={quaternion}>
      <group
        scale={hovered ? HOVER_SCALE : 1}
        onPointerOver={hover(true)}
        onPointerOut={hover(false)}
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
      >
        <mesh>
          <circleGeometry args={[RING.inner, 32]} />
          <meshBasicMaterial color="#0b1020" toneMapped={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[RING.inner, RING.outer, 48]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
      <Html
        // drei's type predates React 19's nullable useRef(null); drei skips refs that are still empty.
        occlude={occluders as RefObject<Object3D>[] | undefined}
        zIndexRange={[20, 10]}
        style={{ transform: labelShift, pointerEvents: canOpen ? "auto" : "none" }}
      >
        {canOpen ? (
          <button
            type="button"
            onClick={open}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            aria-label={`${place.name}: open the ${place.caseLabel}`}
            className={`${labelClass} cursor-pointer rounded-md bg-transparent px-1 outline-none focus-visible:ring-1 focus-visible:ring-gold`}
          >
            {text}
          </button>
        ) : (
          <span className={labelClass}>{text}</span>
        )}
      </Html>
    </group>
  );
}
