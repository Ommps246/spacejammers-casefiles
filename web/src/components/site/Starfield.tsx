// Page-level starfield like the mockups: tiny static SVG dots, no WebGL, no animation.
// A fixed-seed generator keeps the server and client renders identical.

type Star = { x: number; y: number; r: number; o: number };

const RADII = [0.5, 0.6, 0.7, 0.8, 1.0, 1.2];
const OPACITIES = [0.18, 0.25, 0.35, 0.5, 0.65];

function makeStars(count: number, seed: number): Star[] {
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296; // LCG: deterministic, good enough for dots
    return state / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: next() * 100,
    y: next() * 100,
    r: RADII[Math.floor(next() * RADII.length)],
    o: OPACITIES[Math.floor(next() * OPACITIES.length)],
  }));
}

const STARS = makeStars(220, 20260921);

export function Starfield() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      preserveAspectRatio="none"
    >
      {STARS.map((s, i) => (
        <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="#fff" fillOpacity={s.o} />
      ))}
    </svg>
  );
}
