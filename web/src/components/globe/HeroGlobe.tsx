"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";

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

/** `className` sizes and places the square box; one instance serves every breakpoint (one WebGL context). */
type Props = { className: string; sizes: string; priority?: boolean };

export function HeroGlobe({ className, sizes, priority = false }: Props) {
  const [isPosterDone, setIsPosterDone] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isPosterDone) return;
    return afterFirstPaintAndIdle(() => setShouldLoad(true));
  }, [isPosterDone]);

  // Poster loaded (or failed): either way the 3D scene may follow.
  const markPosterDone = () => requestAnimationFrame(() => setIsPosterDone(true));

  return (
    <div data-hero-globe className={className}>
      <Image
        src={POSTER}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain"
        onLoad={markPosterDone}
        onError={markPosterDone}
      />
      {shouldLoad && (
        <div
          className={`absolute inset-0 transition-opacity duration-300 ease-case motion-reduce:duration-200 ${
            isReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <GlobeScene onReady={() => setIsReady(true)} />
        </div>
      )}
    </div>
  );
}
