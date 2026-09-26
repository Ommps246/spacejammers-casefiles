"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { ACESFilmicToneMapping, NeutralToneMapping, type Mesh, type ToneMapping } from "three";

import { latLonToVector3 } from "@/lib/geo";
import { useTabVisible } from "@/lib/use-tab-visible";

import { Atmosphere } from "./Atmosphere";
import { readDevView } from "./dev-view";
import { Earth } from "./Earth";
import { GroundTrack } from "./GroundTrack";
import { Pin } from "./Pin";
import { CASE_PLACES, TEST_PLACES, type Place } from "./places";
import { SatelliteMarker } from "./SatelliteMarker";
import { SceneEnvironment } from "./SceneEnvironment";

const TONE_MAPPINGS: Record<"aces" | "neutral", ToneMapping> = {
  aces: ACESFilmicToneMapping,
  neutral: NeutralToneMapping,
};
const TONE_MAPPING: keyof typeof TONE_MAPPINGS = "neutral"; // holds the navy better (step 2 check)

// Hero framing (Landing mockup): the disc fills 357/380 of the square box, centred just south-west
// of Chennai. tan(asin(1/d)) = 0.94 · tan(fov/2)  =>  d ≈ 3.52 for a 35° field of view.
const CAMERA_FOV = 35;
const HERO_DISTANCE = 3.52;
export const HERO_CAMERA = latLonToVector3(9, 76, HERO_DISTANCE);
const SUN_DIRECTION = latLonToVector3(8, 55, 10); // sub-solar point west of India: India in daylight
const ENVIRONMENT_INTENSITY = 0.25;

// Terra, at landing zoom: a glowing marker on its ground track over central India (landing mockup).
// The 3D model (Satellite.tsx) is for a close-up only; it isn't loaded here.
const TERRA_LAT = 22;
const TERRA_MARKER_RADIUS = 1.006; // just above the dotted track, so the marker sits on it

// Explore mode (OrbitControls): the Earth's radius is 1 and the hero camera sits at 3.52.
// Zoom limits: never inside the Earth; zoomed fully out, the disc keeps ~83% of its hero size
// (tan(asin(1/d)) at 1.2× the hero distance), so it still fills the hero instead of shrinking to a ball.
const ZOOM = { min: 1.6, max: HERO_DISTANCE * 1.2 };
const DAMPING = 0.08;
const ROTATE_SPEED = 0.5;
const AUTO_ROTATE_SPEED = 0.35; // slow: about three minutes per turn

const CASE_PIN = "#c9a24a";
const TEST_PIN = "#ff4fd8";

/** Fires once the suspended content (texture, model) has mounted and a frame has been drawn. */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    if (!onReady) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady));
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

type Props = {
  onReady?: () => void;
  /** Mount OrbitControls (on touch devices only after "Tap to explore", so page scroll is never captured). */
  controls?: boolean;
  /** Wheel/pinch zoom: on once the visitor has engaged with the globe. */
  zoom?: boolean;
  /** Slow spin until the first interaction; always off under prefers-reduced-motion. */
  autoRotate?: boolean;
  /** Terra moves along its track; off under prefers-reduced-motion. */
  motion?: boolean;
  onInteract?: () => void;
  onOpenPlace?: (place: Place) => void;
};

export function GlobeScene({
  onReady,
  controls = false,
  zoom = false,
  autoRotate = false,
  motion = false,
  onInteract,
  onOpenPlace,
}: Props) {
  const isVisible = useTabVisible();
  const dev = useMemo(() => readDevView(window.location.search), []);
  const earthRef = useRef<Mesh>(null);

  useEffect(() => {
    if (!dev?.inspect) return;
    document.body.dataset.globeInspect = "";
    return () => {
      delete document.body.dataset.globeInspect;
    };
  }, [dev]);

  const toneMapping = TONE_MAPPINGS[dev?.toneMapping ?? TONE_MAPPING];
  const cameraPosition = dev?.cameraPosition ?? HERO_CAMERA;
  const pins = [
    ...CASE_PLACES.map((place) => ({ place, color: CASE_PIN })),
    ...(dev?.showTestPins ? TEST_PLACES.map((place) => ({ place, color: TEST_PIN })) : []),
  ];

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={isVisible ? "always" : "never"}
      camera={{ position: [...cameraPosition], fov: CAMERA_FOV, near: 0.01, far: 200 }}
      gl={{ antialias: true, alpha: true, toneMapping }}
      scene={{ environmentIntensity: ENVIRONMENT_INTENSITY }}
    >
      <ambientLight intensity={0.06} />
      <directionalLight position={[...SUN_DIRECTION]} intensity={2.6} />
      <SceneEnvironment />
      <Suspense fallback={null}>
        <Earth ref={earthRef} />
        <Atmosphere />
        <GroundTrack />
        {pins.map(({ place, color }) => (
          <Pin key={place.id} place={place} color={color} occluders={[earthRef]} onOpen={onOpenPlace} />
        ))}
        <SatelliteMarker lat={TERRA_LAT} radius={TERRA_MARKER_RADIUS} orbiting={motion} />
        <ReadySignal onReady={onReady} />
      </Suspense>
      {controls && (
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={zoom}
          enableDamping
          dampingFactor={DAMPING}
          rotateSpeed={ROTATE_SPEED}
          minDistance={ZOOM.min}
          maxDistance={ZOOM.max}
          autoRotate={autoRotate}
          autoRotateSpeed={AUTO_ROTATE_SPEED}
          onStart={onInteract}
        />
      )}
    </Canvas>
  );
}
