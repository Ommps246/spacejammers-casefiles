"use client";
// "When do they look?": a 24-hour dial of the four design-orbit crossing times quoted on this page
// (Terra 10:30 a.m., Aqua 1:30 p.m., and each about 12 hours later on the night side). Scrub the time
// to see which satellite looked last and which looks next. Day and night halves are a sketch, not sunrise times.
import { useState } from "react";

import { clockLabel, durationLabel, hoursUntil } from "@/lib/method-demos";

type Pass = { id: string; satellite: "Terra" | "Aqua"; hour: number; side: "day" | "night" };

// Design-orbit local times, from the NASA pages cited on the cards below (lib/witnesses.ts).
const PASSES: readonly Pass[] = [
  { id: "aqua-night", satellite: "Aqua", hour: 1.5, side: "night" },
  { id: "terra-day", satellite: "Terra", hour: 10.5, side: "day" },
  { id: "aqua-day", satellite: "Aqua", hour: 13.5, side: "day" },
  { id: "terra-night", satellite: "Terra", hour: 22.5, side: "night" },
];
const COLOR = { Terra: "var(--color-gold)", Aqua: "#6ca0ff" } as const;

const SIZE = 320;
const C = SIZE / 2;
const R = 104;
const STEP = 0.25;

// Midnight at the bottom, noon at the top, clockwise.
function at(hour: number, radius: number): { x: number; y: number } {
  const a = (hour / 24) * 2 * Math.PI;
  return { x: C - Math.sin(a) * radius, y: C + Math.cos(a) * radius };
}

export function OverpassClock() {
  const [hour, setHour] = useState(21);
  const now = PASSES.find((p) => p.hour === hour);
  const others = PASSES.filter((p) => p.hour !== hour);
  const next = [...others].sort((a, b) => hoursUntil(hour, a.hour) - hoursUntil(hour, b.hour))[0];
  const last = [...others].sort((a, b) => hoursUntil(a.hour, hour) - hoursUntil(b.hour, hour))[0];
  const hand = at(hour, R - 14);
  const dayStart = at(6, R);
  const dayEnd = at(18, R);

  return (
    <section className="glass-card flex flex-col gap-5 p-5 lg:p-6" aria-labelledby="overpass-title">
      <div className="flex max-w-[640px] flex-col gap-1.5">
        <span className="meta text-gold">Try it · when do they look?</span>
        <h2 id="overpass-title" className="m-0 text-title-3">
          Four looks a day, at four different hours
        </h2>
        <p className="m-0 text-[15px] leading-[1.55] text-secondary">
          Each satellite passes once in daylight and once at night. Drag the slider through a day. The night-heat
          case uses the two night passes: Terra’s late in the evening and Aqua’s a few hours after.
        </p>
      </div>

      <div className="grid items-center gap-6 md:grid-cols-[320px_minmax(0,1fr)]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block h-auto w-full max-w-[320px]" role="img" aria-label={`24-hour dial showing ${clockLabel(hour)} and the four satellite passes`}>
          <circle cx={C} cy={C} r={R} fill="rgb(11 16 32 / 0.9)" stroke="rgb(255 255 255 / 0.12)" />
          <path d={`M${dayStart.x},${dayStart.y} A${R},${R} 0 0 1 ${dayEnd.x},${dayEnd.y} Z`} fill="rgb(226 199 126 / 0.09)" />
          <text x={C} y={C - 52} textAnchor="middle" fontSize="11" fill="rgb(226 199 126 / 0.8)" fontFamily="var(--font-mono)">DAY</text>
          <text x={C} y={C + 60} textAnchor="middle" fontSize="11" fill="rgb(108 160 255 / 0.8)" fontFamily="var(--font-mono)">NIGHT</text>
          {[0, 6, 12, 18].map((h) => {
            const p = at(h, R + (h % 12 === 0 ? 16 : 8));
            return (
              <text key={h} x={p.x} y={p.y + 4} textAnchor={h === 6 ? "end" : h === 18 ? "start" : "middle"} fontSize="11" fill="rgb(235 235 245 / 0.6)" fontFamily="var(--font-mono)">
                {h === 0 ? "midnight" : h === 12 ? "noon" : clockLabel(h).replace(":00", "")}
              </text>
            );
          })}
          {Array.from({ length: 24 }, (_, h) => {
            const a = at(h, R);
            const b = at(h, R - (h % 6 === 0 ? 9 : 5));
            return <line key={h} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgb(255 255 255 / 0.28)" />;
          })}
          <line x1={C} y1={C} x2={hand.x} y2={hand.y} stroke="#f5f5f7" strokeWidth="2" strokeLinecap="round" />
          <circle cx={C} cy={C} r="4" fill="#f5f5f7" />
          {PASSES.map((p) => {
            const pos = at(p.hour, R);
            const on = p.id === next.id || p.id === now?.id;
            return (
              <g key={p.id} role="button" tabIndex={0} aria-label={`${p.satellite}, ${p.side} pass, about ${clockLabel(p.hour)}`} className="cursor-pointer outline-none" onClick={() => setHour(p.hour)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setHour(p.hour)}>
                <circle cx={pos.x} cy={pos.y} r="20" fill="transparent" />
                {on && <circle cx={pos.x} cy={pos.y} r="13" fill="none" stroke={COLOR[p.satellite]} strokeOpacity="0.6" />}
                <circle cx={pos.x} cy={pos.y} r="8" fill={COLOR[p.satellite]} stroke="rgb(5 7 13)" strokeWidth="2" />
                <text x={pos.x} y={pos.y + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#05070d">
                  {p.satellite[0]}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="meta text-tertiary">Local time</span>
            <span className="font-mono text-[32px] leading-none font-bold tracking-[-0.03em]">{clockLabel(hour)}</span>
            <input
              type="range"
              min={0}
              max={24 - STEP}
              step={STEP}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              aria-valuetext={clockLabel(hour)}
              className="h-11 w-full cursor-pointer accent-gold"
            />
          </label>
          <div className="flex flex-col gap-2.5 text-[15px] leading-[1.5]" aria-live="polite">
            {now ? (
              <p className="m-0 text-label">
                <strong style={{ color: COLOR[now.satellite] }}>{now.satellite}</strong> is passing now: its {now.side} look.
              </p>
            ) : (
              <p className="m-0 text-label">
                Last look: <strong style={{ color: COLOR[last.satellite] }}>{last.satellite}</strong>, {durationLabel(hoursUntil(last.hour, hour))} ago ({last.side} pass, about {clockLabel(last.hour)}).
              </p>
            )}
            <p className="m-0 text-secondary">
              Next look: <strong style={{ color: COLOR[next.satellite] }}>{next.satellite}</strong>
{" "}
              in {durationLabel(hoursUntil(hour, next.hour))} ({next.side} pass, about {clockLabel(next.hour)}).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PASSES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setHour(p.hour)}
                className={`min-h-11 rounded-full border px-3.5 text-[13px] font-semibold transition-transform duration-150 active:scale-[0.97] ${
                  p.hour === hour ? "border-gold bg-gold/15 text-gold-pale" : "border-hairline bg-white/4 text-secondary hover:text-label"
                }`}
              >
                {p.satellite} · {p.side}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="m-0 text-[12px] leading-[1.5] text-tertiary">
        These are the design-orbit times at the equator, from the NASA pages cited below. Both satellites have drifted
        since (see “Since then” on each card), and the day and night halves of the dial are a sketch, not sunrise times.
      </p>
    </section>
  );
}
