"use client";
// Hover and keyboard details for the dot plot, replacing Observable Plot's built-in tip (white box, one text
// colour, no keyboard support). One invisible, focusable row button per point sits over the chart; hovering or
// focusing it shows a dark tooltip. Placement never covers the hovered row's label: on wide charts the label is
// left of the plot and the tooltip goes right of the dot (and its value label), or below the dot when that
// doesn't fit; on phones the label sits above the dot, so the tooltip always goes below.
import { useId, useState } from "react";

import type { DotKind, PointDot } from "@/lib/case-sections";

/** Where each point's row and dot are drawn, in px within the chart (read from the plot's own scales). */
export type RowGeometry = { id: string; cx: number; cy: number; top: number; height: number; labelEnd: number };

type Props = {
  dots: PointDot[];
  rows: RowGeometry[];
  width: number;
  narrow: boolean;
  unit: string;
  kindWords: Record<DotKind, string>;
};

const TIP_WIDTH = 224;
const GAP = 10;
const BELOW_OFFSET = 14; // clears the dot (radius 6 + stroke)

type Placement = { left: number; top: number; centerY: boolean };

function place(row: RowGeometry, width: number, narrow: boolean): Placement {
  const clampLeft = (x: number) => Math.max(0, Math.min(x, width - TIP_WIDTH));
  const right = row.labelEnd + GAP;
  if (!narrow && right + TIP_WIDTH <= width) return { left: right, top: row.cy, centerY: true };
  return { left: clampLeft(row.cx - TIP_WIDTH / 2), top: row.cy + BELOW_OFFSET, centerY: false };
}

function checkWords(d: PointDot): string {
  return d.passes ? "Passed the multiple-test check" : "Didn’t pass the multiple-test check";
}

export function DotHover({ dots, rows, width, narrow, unit, kindWords }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const tipId = useId();
  const byId = new Map(dots.map((d) => [d.id, d]));
  const row = rows.find((r) => r.id === active);
  const dot = active ? byId.get(active) : undefined;
  const spot = row ? place(row, width, narrow) : null;

  return (
    <>
      {rows.map((r) => {
        const d = byId.get(r.id);
        if (!d) return null;
        return (
          <button
            key={r.id}
            type="button"
            aria-label={`${d.name}: ${d.label} ${unit}. ${kindWords[d.kind]}. ${checkWords(d)}.`}
            aria-describedby={active === r.id ? tipId : undefined}
            onPointerEnter={() => setActive(r.id)}
            onPointerLeave={() => setActive((a) => (a === r.id ? null : a))}
            onFocus={() => setActive(r.id)}
            onBlur={() => setActive((a) => (a === r.id ? null : a))}
            onKeyDown={(e) => {
              if (e.key === "Escape") setActive(null);
            }}
            className="absolute left-0 cursor-default rounded-[6px] bg-transparent outline-none focus-visible:ring-1 focus-visible:ring-gold/60"
            style={{ top: r.top, height: r.height, width }}
          />
        );
      })}
      {dot && spot && (
        <div
          id={tipId}
          role="tooltip"
          className="pointer-events-none absolute z-10 flex flex-col gap-0.5 rounded-[8px] border border-hairline px-3 py-2 text-[12.5px] leading-[1.4] text-[#e5e7eb] shadow-[0_8px_24px_rgb(0_0_0/0.45)]"
          style={{
            left: spot.left,
            top: spot.top,
            width: TIP_WIDTH,
            transform: spot.centerY ? "translateY(-50%)" : undefined,
            background: "rgb(11 16 32 / 0.95)",
          }}
        >
          <span className="text-[13px] font-semibold">{dot.name}</span>
          <span className="font-semibold text-gold tabular-nums">
            {dot.label} {unit}
          </span>
          <span className="text-[#e5e7eb]/70">
            {kindWords[dot.kind]} · {checkWords(dot)}
          </span>
        </div>
      )}
    </>
  );
}
