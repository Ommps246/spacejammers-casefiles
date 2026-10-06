"use client";
// One satellite model, rotatable and zoomable. The 3D chunk and the model load only when the viewer
// scrolls into view (IntersectionObserver), so the page's first paint stays light.
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const ModelScene = dynamic(() => import("./ModelScene").then((m) => m.ModelScene), { ssr: false });

const PRELOAD_MARGIN = "200px"; // start loading just before the viewer reaches the screen

const CONTROL =
  "min-h-11 rounded-full border border-hairline bg-space-0/70 px-3.5 text-[13px] font-semibold text-label backdrop-blur-md transition-transform duration-150 active:scale-[0.97]";

type Props = { model: string; name: string };

export function ModelViewer({ model, name }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [resetCount, setResetCount] = useState(0);

  // Start the turntable once the model is in, unless the visitor asked for reduced motion.
  const onReady = useCallback(() => {
    setReady(true);
    setSpinning(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

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
      role="group"
      aria-label={`3D model of NASA's ${name} satellite. Drag to rotate and scroll to zoom; on touch, use two fingers.`}
      className="relative aspect-square w-full touch-pan-y overflow-hidden rounded-card border border-hairline bg-space-0/60"
    >
      {!ready && (
        <span className="meta absolute inset-0 flex items-center justify-center text-tertiary">
          {inView ? `Loading ${name}…` : name}
        </span>
      )}
      {inView && (
        <ModelScene
          model={model}
          onReady={onReady}
          spinning={spinning}
          onInteract={() => setSpinning(false)}
          resetCount={resetCount}
        />
      )}
      {ready && (
        <div className="absolute right-2.5 bottom-2.5 flex gap-1.5">
          <button type="button" onClick={() => setSpinning((s) => !s)} aria-pressed={spinning} className={CONTROL}>
            {spinning ? "Pause" : "Spin"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSpinning(false);
              setResetCount((c) => c + 1);
            }}
            className={CONTROL}
          >
            Reset view
          </button>
        </div>
      )}
    </div>
  );
}
