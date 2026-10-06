"use client";
// The canvas for one satellite model (loaded lazily by ModelViewer). It turns slowly until the first drag
// (never under prefers-reduced-motion). Rotate by drag; zoom is clamped so the
// model never fills the view or shrinks to a dot. On touch, one finger scrolls the page; two fingers orbit.
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { TOUCH } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { Satellite, SATELLITE_MODELS } from "../globe/Satellite";
import { SceneEnvironment } from "../globe/SceneEnvironment";

const MODEL_SIZE = 2; // longest side in scene units
const ZOOM = { min: 2.2, max: 7 };
const CAMERA = { position: [3.2, 1.6, 3.2] as [number, number, number], fov: 35 };

type ModelKey = keyof typeof SATELLITE_MODELS;
const MODEL_KEYS = Object.fromEntries(
  Object.entries(SATELLITE_MODELS).map(([key, path]) => [path, key as ModelKey]),
) as Record<string, ModelKey>;

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady));
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

const SPIN_SPEED = 0.8; // OrbitControls units: one turn in about 75 seconds

type Props = {
  model: string;
  onReady: () => void;
  /** Slow turntable spin; the viewer turns it off on the first drag. */
  spinning: boolean;
  onInteract: () => void;
  /** Bump to put the camera back where it started. */
  resetCount: number;
};

export function ModelScene({ model, onReady, spinning, onInteract, resetCount }: Props) {
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    if (resetCount > 0) controls.current?.reset();
  }, [resetCount]);
  const key = MODEL_KEYS[model];
  if (!key) return null;
  return (
    <Canvas dpr={[1, 2]} camera={{ position: CAMERA.position, fov: CAMERA.fov }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 5, 3]} intensity={2.2} />
      <SceneEnvironment />
      <Suspense fallback={null}>
        <Satellite model={key} size={MODEL_SIZE} />
        <Ready onReady={onReady} />
      </Suspense>
      <OrbitControls
        ref={controls}
        autoRotate={spinning}
        autoRotateSpeed={SPIN_SPEED}
        onStart={onInteract}
        makeDefault
        enablePan={false}
        enableDamping
        minDistance={ZOOM.min}
        maxDistance={ZOOM.max}
        touches={{ ONE: undefined, TWO: TOUCH.DOLLY_ROTATE }}
      />
    </Canvas>
  );
}
