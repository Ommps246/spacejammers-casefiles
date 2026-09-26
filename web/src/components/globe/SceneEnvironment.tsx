"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 * Reflections for the satellites' metal (gold foil at metalness 0.9 renders black without one).
 * RoomEnvironment is generated in code, so unlike drei's <Environment preset> nothing is
 * downloaded and the demo stays offline. Brightness is set on the Canvas (scene.environmentIntensity).
 */
export function SceneEnvironment() {
  const gl = useThree((state) => state.gl);

  const target = useMemo(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const result = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    return result;
  }, [gl]);

  useEffect(() => () => target.dispose(), [target]);

  return <primitive attach="environment" object={target.texture} />;
}
