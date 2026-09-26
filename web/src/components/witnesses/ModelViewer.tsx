"use client";
// One satellite model, rotatable and zoomable. The 3D chunk and the model load only when the viewer
// scrolls into view (IntersectionObserver), so the page's first paint stays light.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ModelScene = dynamic(() => import("./ModelScene").then((m) => m.ModelScene), { ssr: false });

const PRELOAD_MARGIN = "200px"; // start loading just before the viewer reaches the screen

type Props = { model: string; name: string };

export function ModelViewer({ model, name }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={box}
      role="img"
      aria-label={`3D model of NASA's ${name} satellite. Drag to rotate and scroll to zoom; on touch, use two fingers.`}
      className="relative aspect-square w-full touch-pan-y overflow-hidden rounded-card border border-hairline bg-space-0/60"
    >
      {!ready && (
        <span className="meta absolute inset-0 flex items-center justify-center text-tertiary">
          {inView ? `Loading ${name}…` : name}
        </span>
      )}
      {inView && <ModelScene model={model} onReady={() => setReady(true)} />}
    </div>
  );
}
