"use client";
// Section 3, made visible: the moving-block bootstrap on three real yearly records. Shuffling whole blocks
// keeps each record's year-to-year stickiness and destroys only its trend. The counts below are this
// browser's own live shuffles; the verdict beside them is the pipeline's (1,000 shuffles, fixed seed).
import Link from "next/link";
import { useMemo, useState } from "react";

import { formatP } from "@/lib/format";
import { blockResample, mannKendallS, type ShuffleSeries } from "@/lib/method-demos";

import { StrengthLabel } from "../ui/StrengthLabel";

type Frame = { w: number; h: number; r: number; font: number };
const WIDE: Frame = { w: 720, h: 220, r: 5.5, font: 11 };
const COMPACT: Frame = { w: 380, h: 210, r: 3.8, font: 12 }; // phones: same data, bigger type
const PAD = { left: 12, right: 12, top: 16, bottom: 26 };
const BATCH = 200;

type Tally = { tried: number; asStrong: number };
const EMPTY: Tally = { tried: 0, asStrong: 0 };

// Early years are blue, late years are gold: in the real record the colours run in order.
function yearColor(t: number): string {
  const from = [108, 160, 255];
  const to = [226, 199, 126];
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * t));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

function Chart({ frame: F, s, order, className }: { frame: Frame; s: ShuffleSeries; order: number[] | null; className: string }) {
  const W = F.w;
  const H = F.h;
  const n = s.values.length;
  const lo = Math.min(...s.values);
  const hi = Math.max(...s.values);
  const x = (i: number) => PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => H - PAD.bottom - ((v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);

  const shown = order ?? s.values.map((_, i) => i);
  const path = shown.map((src, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.values[src]).toFixed(1)}`).join(" ");
  return (
      <svg viewBox={`0 0 ${W} ${H}`} className={`h-auto w-full ${className}`} role="img" aria-label={order ? `${s.name}: a shuffled version of the record` : `${s.name}: the real record`}>
        <path d={path} fill="none" stroke="rgb(255 255 255 / 0.22)" strokeWidth="1.5" />
        {shown.map((src, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={0}
            r={n > 30 ? F.r : F.r + 1.5}
            fill={yearColor(src / (n - 1))}
            style={{ transform: `translateY(${y(s.values[src]).toFixed(1)}px)`, transition: "transform 320ms var(--ease-case)" }}
            className="motion-reduce:!transition-none"
          />
        ))}
        <text x={PAD.left} y={H - 6} fontSize={F.font} fill="rgb(235 235 245 / 0.6)" fontFamily="var(--font-mono)">
          {order ? "position 1" : s.years[0]}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize={F.font} fill="rgb(235 235 245 / 0.6)" fontFamily="var(--font-mono)">
          {order ? `position ${n}` : s.years[n - 1]}
        </text>
      </svg>
  );
}

export function ShuffleDemo({ series }: { series: ShuffleSeries[] }) {
  const [which, setWhich] = useState(0);
  const [order, setOrder] = useState<number[] | null>(null);
  const [tally, setTally] = useState<Tally>(EMPTY);
  const s = series[which];
  const n = s.values.length;
  const realS = useMemo(() => Math.abs(mannKendallS(s.values)), [s]);

  const pick = (i: number) => {
    setWhich(i);
    setOrder(null);
    setTally(EMPTY);
  };
  const shuffle = (times: number) => {
    let last: number[] = [];
    let asStrong = 0;
    for (let k = 0; k < times; k++) {
      last = blockResample(n, s.blockLength);
      if (Math.abs(mannKendallS(last.map((i) => s.values[i]))) >= realS) asStrong++;
    }
    setOrder(last);
    setTally((t) => ({ tried: t.tried + times, asStrong: t.asStrong + asStrong }));
  };
  const reset = () => {
    setOrder(null);
    setTally(EMPTY);
  };

  const button = "min-h-11 rounded-full border px-4 text-[14px] font-semibold tracking-[-0.01em] transition-transform duration-150 active:scale-[0.97]";

  return (
    <figure className="glass-card m-0 flex flex-col gap-4 p-4 lg:p-6">
      <figcaption className="flex flex-col gap-1.5">
        <span className="meta text-gold">Try it · shuffle the blocks</span>
        <span className="text-[18px] font-semibold tracking-[-0.01em]">Could this pattern be luck?</span>
        <span className="text-[14px] leading-[1.55] text-secondary">
          Pick a real record, then shuffle it in blocks of {s.blockLength} years. If the shuffled versions almost
          never look as trend-like as the real one, the trend is hard to blame on chance.
        </span>
      </figcaption>

      <div role="tablist" aria-label="Record to shuffle" className="flex flex-wrap gap-2">
        {series.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={i === which}
            onClick={() => pick(i)}
            className={`${button} ${i === which ? "border-gold bg-gold/15 text-gold-pale" : "border-hairline bg-white/4 text-secondary hover:text-label"}`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[13px] leading-[1.5] text-secondary">
          {s.what}, {s.years[0]}–{s.years[n - 1]}.{" "}
          <span className="text-label">{order ? "Shuffled: the years are out of order." : "The real record, in order."}</span>
        </span>
        <Chart frame={WIDE} s={s} order={order} className="hidden sm:block" />
        <Chart frame={COMPACT} s={s} order={order} className="sm:hidden" />
        <div className="flex items-center gap-2 text-[12px] text-tertiary">
          <span>Dot colour = the year it really was:</span>
          <span>early</span>
          <span className="h-1.5 w-20 rounded-full" style={{ background: `linear-gradient(90deg, ${yearColor(0)}, ${yearColor(1)})` }} />
          <span>late</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => shuffle(1)} className={`${button} border-gold bg-gold text-space-1`}>
          Shuffle once
        </button>
        <button type="button" onClick={() => shuffle(BATCH)} className={`${button} border-hairline bg-white/6 text-label`}>
          Shuffle {BATCH} times
        </button>
        <button type="button" onClick={reset} disabled={!order} className={`${button} border-hairline text-secondary disabled:opacity-40`}>
          Show the real record
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-tile border border-hairline bg-white/3 p-4" aria-live="polite">
          <span className="meta text-tertiary">Your shuffles (live demo)</span>
          <p className="m-0 mt-2 text-[15px] leading-[1.5] text-label">
            {tally.tried === 0 ? (
              "None yet. Press a shuffle button."
            ) : (
              <>
                <span className="font-mono text-[22px] font-bold">{tally.asStrong}</span> of{" "}
                <span className="font-mono">{tally.tried}</span> looked at least as trend-like as the real record.
              </>
            )}
          </p>
        </div>
        <div className="rounded-tile border border-hairline bg-white/3 p-4">
          <span className="meta text-tertiary">The pipeline’s result (1,000 shuffles)</span>
          <p className="m-0 mt-2 flex flex-wrap items-center gap-2.5 text-[15px] text-label">
            <span className="font-mono">{formatP(s.p)}</span>
            <StrengthLabel kind={s.strength} />
            <Link href={`/case/${s.caseId}`} className="text-[14px] font-semibold text-gold-soft hover:underline">
              See the case →
            </Link>
          </p>
        </div>
      </div>
      <p className="m-0 text-[12px] leading-[1.5] text-tertiary">
        The demo’s counts change every time, because your shuffles are random. The verdicts on this site never do:
        they come from the pipeline’s fixed set of 1,000 shuffles, and from the check in section 7.
      </p>
    </figure>
  );
}
