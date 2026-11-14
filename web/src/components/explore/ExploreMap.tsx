"use client";
// "Where is it changing?": every place measured for the chosen variable, on a sketch map. Up and down
// triangles are clear rises and falls (they passed the multiple-test check); circles are no clear trend.
// Colour is the strength. Places far from Chennai (the Nilgiris) sit in an inset with their distance.
// The land shape is Natural Earth (public domain), drawn on the same scale as the places.
import { CHENNAI_LAND } from "@/lib/coast";
import { kmOffset } from "@/lib/method-demos";
import type { ExploreRow } from "@/lib/explore";

const W = 400;
const H = 250;
const INSET = 96; // width of the far-away inset
const PAD = 28;
const CHENNAI = { lat: 13.04, lon: 80.23 }; // Chennai core pixel
const NEAR_KM = 150;

const COLOR: Record<ExploreRow["strength"], string> = {
  strong: "var(--color-strong)",
  moderate: "var(--color-moderate)",
  inconclusive: "var(--color-inconclusive)",
};

type Placed = { r: ExploreRow; x: number; y: number };

function Marker({ r, on }: { r: ExploreRow; on: boolean }) {
  const fill = COLOR[r.strength];
  const stroke = on ? "#fff" : "rgb(5 7 13 / 0.9)";
  const s = 9;
  if (r.trend === "increasing") return <path d={`M0,${-s} L${s},${s * 0.75} L${-s},${s * 0.75} Z`} fill={fill} stroke={stroke} strokeWidth={2} />;
  if (r.trend === "decreasing") return <path d={`M0,${s} L${s},${-s * 0.75} L${-s},${-s * 0.75} Z`} fill={fill} stroke={stroke} strokeWidth={2} />;
  return <circle r={6.5} fill="rgb(11 16 32)" stroke={on ? "#fff" : fill} strokeWidth={2.5} />;
}

export function ExploreMap({ rows, picked, onPick }: { rows: ExploreRow[]; picked: string; onPick: (key: string) => void }) {
  const located = rows.filter((r): r is ExploreRow & { lat: number; lon: number } => r.lat !== undefined && r.lon !== undefined);
  const near = located.filter((r) => Math.hypot(kmOffset(CHENNAI, r).east, kmOffset(CHENNAI, r).north) < NEAR_KM);
  const far = located.filter((r) => !near.includes(r));
  const x0 = far.length ? INSET + 16 : 0;

  // Fit the Chennai-area places into the main panel, keeping true distances (one scale both ways).
  const km = near.map((r) => ({ r, ...kmOffset(CHENNAI, r) }));
  const spanE = Math.max(30, ...km.map((p) => p.east)) - Math.min(-30, ...km.map((p) => p.east));
  const spanN = Math.max(30, ...km.map((p) => p.north)) - Math.min(-30, ...km.map((p) => p.north));
  const scale = Math.min((W - x0 - 2 * PAD) / spanE, (H - 2 * PAD) / spanN);
  const midE = (Math.max(30, ...km.map((p) => p.east)) + Math.min(-30, ...km.map((p) => p.east))) / 2;
  const midN = (Math.max(30, ...km.map((p) => p.north)) + Math.min(-30, ...km.map((p) => p.north))) / 2;
  const cx = x0 + (W - x0) / 2;
  const placed: Placed[] = [
    ...km.map((p) => ({ r: p.r, x: cx + (p.east - midE) * scale, y: H / 2 - (p.north - midN) * scale })),
    ...far.map((r, i) => ({ r, x: INSET / 2, y: H / 2 + (i - (far.length - 1) / 2) * 34 })),
  ];
  const farKm = far.length ? Math.round(Math.hypot(kmOffset(CHENNAI, far[0]).east, kmOffset(CHENNAI, far[0]).north) / 10) * 10 : 0;
  const bar = 25 * scale;
  const land = CHENNAI_LAND.map(([lon, lat], i) => {
    const k = kmOffset(CHENNAI, { lat, lon });
    return `${i ? "L" : "M"}${(cx + (k.east - midE) * scale).toFixed(1)},${(H / 2 - (k.north - midN) * scale).toFixed(1)}`;
  }).join(" ") + " Z";
  const active = placed.find((p) => p.r.key === picked);

  return (
    <figure className="m-0 flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-tile border border-hairline bg-space-0/60" role="group" aria-label="Map of where this variable is rising, falling or showing no clear trend">
        <defs>
          <clipPath id="explore-main">
            <rect x={x0} y={0} width={W - x0} height={H} />
          </clipPath>
        </defs>
        <rect x={x0} y={0} width={W - x0} height={H} fill="rgb(16 34 66 / 0.55)" />
        <path d={land} clipPath="url(#explore-main)" fill="rgb(38 44 52)" stroke="rgb(140 170 210 / 0.35)" strokeWidth="1" />
        {far.length > 0 && (
          <g>
            <line x1={INSET} x2={INSET} y1={12} y2={H - 12} stroke="rgb(255 255 255 / 0.18)" strokeDasharray="3 4" />
            <text x={INSET / 2} y={22} textAnchor="middle" fontSize="11" fill="rgb(235 235 245 / 0.6)">{far[0].place}</text>
            <text x={INSET / 2} y={H - 14} textAnchor="middle" fontSize="10" fill="rgb(235 235 245 / 0.5)">≈{farKm} km away</text>
          </g>
        )}
        <text x={W - 10} y={20} textAnchor="end" fontSize="10" fill="rgb(235 235 245 / 0.55)" fontFamily="var(--font-mono)">N ↑</text>
        <text x={W - 10} y={H - 12} textAnchor="end" fontSize="10.5" fill="rgb(108 160 255 / 0.85)">Bay of Bengal →</text>
        {near.length > 1 && (
          <g>
            <line x1={x0 + 14} x2={x0 + 14 + bar} y1={H - 16} y2={H - 16} stroke="rgb(235 235 245 / 0.5)" strokeWidth="1.5" />
            <text x={x0 + 14} y={H - 22} fontSize="10" fill="rgb(235 235 245 / 0.55)" fontFamily="var(--font-mono)">25 km</text>
          </g>
        )}
        {placed.map(({ r, x, y }) => {
          const on = r.key === picked;
          return (
            <g
              key={r.key}
              transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
              role="button"
              tabIndex={0}
              aria-label={`${r.place}: ${r.trend}, ${r.strength}`}
              aria-pressed={on}
              className="cursor-pointer outline-none"
              onClick={() => onPick(r.key)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPick(r.key)}
            >
              <circle r={18} fill="transparent" />
              {on && <circle r={15} fill="none" stroke="rgb(255 255 255 / 0.45)" />}
              <Marker r={r} on={on} />
            </g>
          );
        })}
        {active && (
          <text
            x={Math.min(Math.max(active.x, 60), W - 60)}
            y={active.y > 40 ? active.y - 20 : active.y + 30}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="#f5f5f7"
            stroke="rgb(5 7 13)"
            strokeWidth="3"
            paintOrder="stroke"
          >
            {active.r.place}
          </text>
        )}
      </svg>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="-10 -10 20 20" aria-hidden="true"><path d="M0,-9 L9,6.75 L-9,6.75 Z" fill="currentColor" /></svg>
          rising
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="-10 -10 20 20" aria-hidden="true"><path d="M0,9 L9,-6.75 L-9,-6.75 Z" fill="currentColor" /></svg>
          falling
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="-10 -10 20 20" aria-hidden="true"><circle r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" /></svg>
          no clear trend
        </span>
        <span>Land and coast: Natural Earth. Positions and distances are real.</span>
      </figcaption>
    </figure>
  );
}
