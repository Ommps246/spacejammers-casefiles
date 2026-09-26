"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Component, useEffect, useState, type ReactNode } from "react";

import type { Place } from "./places";

// three.js + the scene are a separate chunk (~260 KB gzipped). Order of events:
//   1. the static poster (same framing) loads and paints: it is the page's largest paint;
//   2. the browser reports its first contentful paint;
//   3. the next idle moment requests the 3D chunk, which fades in over the poster when ready.
// Measured with Lighthouse: requesting it merely "on idle" started it before first paint.
const GlobeScene = dynamic(() => import("./GlobeScene").then((m) => m.GlobeScene), { ssr: false });

const POSTER = "/textures/globe-poster-marker.webp"; // Terra as a gold marker (was the 3D model)
const IDLE_TIMEOUT_MS = 1500; // load anyway if the browser never goes idle
const FALLBACK_DELAY_MS = 200; // Safari has no requestIdleCallback

/** Calls `run` once the page has had its first contentful paint and the browser is idle. */
function afterFirstPaintAndIdle(run: () => void): () => void {
  let idleId: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let observer: PerformanceObserver | undefined;

  const whenIdle = () => {
    if ("requestIdleCallback" in window) idleId = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
    else timer = setTimeout(run, FALLBACK_DELAY_MS);
  };

  const painted = performance.getEntriesByName("first-contentful-paint").length > 0;
  const canObserve = PerformanceObserver.supportedEntryTypes?.includes("paint");
  if (painted || !canObserve) {
    whenIdle();
  } else {
    observer = new PerformanceObserver((list) => {
      if (list.getEntriesByName("first-contentful-paint").length === 0) return;
      observer?.disconnect();
      whenIdle();
    });
    observer.observe({ type: "paint", buffered: true });
  }

  return () => {
    observer?.disconnect();
    if (idleId !== undefined) window.cancelIdleCallback(idleId);
    if (timer !== undefined) clearTimeout(timer);
  };
}

/** True when the browser can create a WebGL context; otherwise the poster stays as the globe. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

type Env = { webgl: boolean; touch: boolean; reducedMotion: boolean };

function readEnv(): Env {
  return {
    webgl: hasWebGL(),
    touch: window.matchMedia("(pointer: coarse)").matches,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

// The poster fades out once the live scene has drawn its first frame, then unmounts, so it can never show
// through the transparent canvas (zoomed out, it looked like a second, bigger Earth behind the model).
const POSTER_FADE_MS = 300;
const REDUCED_FADE_MS = 200;

/** If the 3D scene throws (a failed chunk or model load), drop it and keep the poster as the globe. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const PILL =
  "absolute bottom-6 left-1/2 z-20 min-h-11 -translate-x-1/2 rounded-full border px-4 text-[14px] font-semibold";

/** `className` sizes and places the square box; one instance serves every breakpoint (one WebGL context). */
type Props = { className: string; sizes: string; priority?: boolean };

export function HeroGlobe({ className, sizes, priority = false }: Props) {
  const router = useRouter();
  const [isPosterDone, setIsPosterDone] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [env, setEnv] = useState<Env | null>(null);
  // Explore state. Touch: nothing captures gestures until "Tap to explore". Desktop: drag works at once,
  // wheel-zoom only after the first press on the globe, so scrolling past it never zooms by accident.
  const [exploring, setExploring] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [posterGone, setPosterGone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isPosterDone) return;
    const found = readEnv();
    return afterFirstPaintAndIdle(() => {
      setEnv(found);
      if (found.webgl) setShouldLoad(true);
    });
  }, [isPosterDone]);

  // Scene ready: the poster fades out (derived below), then unmounts once the fade is over.
  const posterFading = isReady && !failed;
  const showPoster = failed || !posterGone;
  useEffect(() => {
    if (!posterFading) return;
    const id = setTimeout(() => setPosterGone(true), env?.reducedMotion ? REDUCED_FADE_MS : POSTER_FADE_MS);
    return () => clearTimeout(id);
  }, [posterFading, env?.reducedMotion]);

  const sceneFailed = () => {
    setFailed(true);
    setIsReady(false);
    setPosterGone(false);
  };

  const controls = env !== null && !failed && (!env.touch || exploring);
  const openPlace = (place: Place) => {
    if (place.caseId) router.push(`/case/${place.caseId}`);
  };

  // Poster loaded (or failed): either way the 3D scene may follow.
  const markPosterDone = () => requestAnimationFrame(() => setIsPosterDone(true));

  return (
    <div data-hero-globe className={className}>
      {showPoster && (
        <Image
          src={POSTER}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className={`object-contain transition-opacity duration-300 ease-case motion-reduce:duration-200 ${
            posterFading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={markPosterDone}
          onError={markPosterDone}
        />
      )}
      {shouldLoad && env && !failed && (
        <div
          className={`absolute inset-0 transition-opacity duration-300 ease-case motion-reduce:duration-200 ${
            isReady ? "opacity-100" : "opacity-0"
          }`}
          // Touch, before "Tap to explore": the canvas ignores gestures so the page scrolls through it.
          style={{ pointerEvents: controls ? "auto" : "none" }}
          onPointerDown={() => setEngaged(true)}
        >
          <SceneBoundary onError={sceneFailed}>
            <GlobeScene
              onReady={() => setIsReady(true)}
              controls={controls}
              zoom={engaged || exploring}
              autoRotate={!env.reducedMotion && !engaged}
              motion={!env.reducedMotion}
              onInteract={() => setEngaged(true)}
              onOpenPlace={openPlace}
            />
          </SceneBoundary>
        </div>
      )}
      {isReady && env?.touch && !exploring && (
        <button
          type="button"
          onClick={() => {
            setExploring(true);
            setEngaged(true);
          }}
          className={`${PILL} border-gold/60 bg-space-1/80 text-gold-soft backdrop-blur`}
        >
          Tap to explore
        </button>
      )}
      {isReady && env?.touch && exploring && (
        <button
          type="button"
          onClick={() => setExploring(false)}
          className={`${PILL} border-hairline bg-space-1/80 text-label backdrop-blur`}
        >
          Done exploring
        </button>
      )}
    </div>
  );
}
