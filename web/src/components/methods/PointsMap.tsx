"use client";
// Section 8, made visible: where the Chennai satellite points sit, what MODIS calls the ground at each one,
// and which three are allowed to be the countryside reference. A sketch map: positions are true, the coast isn't drawn.
import { useState } from "react";

import { formatP, formatTrend } from "@/lib/format";
import { kmOffset, type MapPoint } from "@/lib/method-demos";

import { StrengthLabel } from "../ui/StrengthLabel";

const SIZE = 400;
const PAD = 44;
const RINGS_KM = [25, 50, 75] as const;
const CITY_CENTRE = "chennai_core";

type Kind = "reference" | "city" | "edge";
const kindOf = (p: MapPoint): Kind => (p.isReference ? "reference" : p.role === "city" ? "city" : "edge");
const COLOR: Record<Kind, string> = {
  reference: "var(--color-strong)",
  city: "var(--color-gold)",
  edge: "var(--color-inconclusive-soft)",
};
const KIND_WORDS: Record<Kind, string> = {
  reference: "Farmland reference",
  city: "City point",
  edge: "Urban edge (failed the rule)",
};

function Marker({ kind, on }: { kind: Kind; on: boolean }) {
  const stroke = on ? "#fff" : "rgb(5 7 13 / 0.9)";
  if (kind === "reference") return <rect x={-7} y={-7} width={14} height={14} rx={3} fill={COLOR[kind]} stroke={stroke} strokeWidth={2} />;
  if (kind === "edge") return <path d="M0,-9 L8.5,7 L-8.5,7 Z" fill={COLOR[kind]} stroke={stroke} strokeWidth={2} />;
  return <circle r={7.5} fill={COLOR[kind]} stroke={stroke} strokeWidth={2} />;
}

export function PointsMap({ points }: { points: MapPoint[] }) {
  const centre = points.find((p) => p.id === CITY_CENTRE) ?? points[0];
  const [picked, setPicked] = useState(centre.id);
  const active = points.find((p) => p.id === picked) ?? centre;

  const placed = points.map((p) => ({ p, km: kmOffset(centre, p) }));
  const east = placed.map((q) => q.km.east);
  const north = placed.map((q) => q.km.north);
  const span = Math.max(Math.max(...east) - Math.min(...east), Math.max(...north) - Math.min(...north));
  const scale = (SIZE - 2 * PAD) / span;
  const midE = (Math.max(...east) + Math.min(...east)) / 2;
  const midN = (Math.max(...north) + Math.min(...north)) / 2;
  const x = (e: number) => SIZE / 2 + (e - midE) * scale;
  const y = (n: number) => SIZE / 2 - (n - midN) * scale;

  return (
    <figure className="glass-card m-0 flex flex-col gap-4 p-4 lg:p-6">
      <figcaption className="flex flex-col gap-1.5">
        <span className="meta text-gold">Try it · the eight Chennai points</span>
        <span className="text-[18px] font-semibold tracking-[-0.01em]">Which spots may stand in for “countryside”?</span>
        <span className="text-[14px] leading-[1.55] text-secondary">
          Tap a point. Only spots the satellite classed as cropland in both 2001 and 2024 can be a reference, and a
          city point never can.
        </span>
      </figcaption>

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block h-auto w-full rounded-tile border border-hairline bg-space-0/60" role="group" aria-label="Sketch map of the eight Chennai satellite points">
          {RINGS_KM.map((km) => (
            <g key={km}>
              <circle cx={x(0)} cy={y(0)} r={km * scale} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeDasharray="3 5" />
              <text x={x(0)} y={y(0) + km * scale - 5} textAnchor="middle" fontSize="13" fill="rgb(235 235 245 / 0.5)" fontFamily="var(--font-mono)">
                {km} km
              </text>
            </g>
          ))}
          <text x={SIZE - 10} y={22} textAnchor="end" fontSize="13" fill="rgb(235 235 245 / 0.6)" fontFamily="var(--font-mono)">
            N ↑
          </text>
          <text x={SIZE - 10} y={SIZE - 12} textAnchor="end" fontSize="13" fill="rgb(108 160 255 / 0.8)">
            Bay of Bengal →
          </text>
          {placed.map(({ p, km }) => {
            const on = p.id === active.id;
            return (
              <g
                key={p.id}
                transform={`translate(${x(km.east)} ${y(km.north)})`}
                role="button"
                tabIndex={0}
                aria-label={`${p.name}: ${KIND_WORDS[kindOf(p)]}`}
                aria-pressed={on}
                className="cursor-pointer outline-none"
                onClick={() => setPicked(p.id)}
                onFocus={() => setPicked(p.id)}
                onPointerEnter={(e) => e.pointerType === "mouse" && setPicked(p.id)}
              >
                <circle r={26} fill="transparent" />
                {on && <circle r={15} fill="none" stroke="rgb(255 255 255 / 0.5)" />}
                <Marker kind={kindOf(p)} on={on} />
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col gap-3" aria-live="polite">
          <div className="flex flex-col gap-1">
            <span className="meta" style={{ color: COLOR[kindOf(active)] }}>
              {KIND_WORDS[kindOf(active)]}
            </span>
            <span className="text-[17px] font-semibold tracking-[-0.01em]">{active.name}</span>
          </div>
          <dl className="m-0 flex flex-col gap-2.5 text-[14px] leading-[1.5]">
            <div className="border-t border-hairline pt-2.5">
              <dt className="meta text-tertiary">Ground, 2001 → 2024</dt>
              <dd className="m-0 text-label">
                {active.class2001} → {active.class2024}
              </dd>
            </div>
            <div className="border-t border-hairline pt-2.5">
              <dt className="meta text-tertiary">Can it be a reference?</dt>
              <dd className="m-0 text-label">
                {active.isReference
                  ? "Yes: cropland in both years, and far from the city."
                  : active.passesRule
                    ? "No: cropland in both years, but it’s a city point."
                    : "No: not cropland in both years."}
              </dd>
            </div>
            {active.nightTrend && (
              <div className="border-t border-hairline pt-2.5">
                <dt className="meta text-tertiary">Its own night trend</dt>
                <dd className="m-0 flex flex-wrap items-center gap-2 text-label">
                  <span className="font-mono">
                    {formatTrend(active.nightTrend.slope, active.nightTrend.units)} {active.nightTrend.units}
                  </span>
                  <StrengthLabel kind={active.nightTrend.strength} />
                  <span className="font-mono text-[12px] text-secondary">{formatP(active.nightTrend.p)}</span>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-secondary">
        {(["city", "reference", "edge"] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-2">
            <svg width="18" height="18" viewBox="-10 -10 20 20" aria-hidden="true">
              <Marker kind={k} on={false} />
            </svg>
            {KIND_WORDS[k]}
          </span>
        ))}
      </div>
      <p className="m-0 text-[12px] leading-[1.5] text-tertiary">
        Sketch map: the positions and distances are real, with rings measured from the Chennai core point. The coast
        and roads aren’t drawn.
      </p>
    </figure>
  );
}
