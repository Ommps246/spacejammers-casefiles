"use client";
// Section 7, made visible: all 40 trend tests in the frozen family, lined up from the smallest p-value to
// the largest, against the Benjamini-Hochberg bar. Every dot is a real test; tap one to see which.
import Link from "next/link";
import { useMemo, useState } from "react";

import { formatP } from "@/lib/format";
import { bhBar, bhCutoff, rankTests, type FdrTest, type RankedTest } from "@/lib/method-demos";

import { StrengthLabel } from "../ui/StrengthLabel";

type Frame = { w: number; h: number; left: number; font: number; r: number };
const WIDE: Frame = { w: 720, h: 300, left: 52, font: 11, r: 5 };
const COMPACT: Frame = { w: 380, h: 300, left: 44, font: 12, r: 3.6 }; // phones: same data, bigger type
const PAD = { right: 14, top: 14, bottom: 34 };
const P_FLOOR = 0.0008; // just under the bootstrap's smallest p-value (0.001)
const Y_TICKS = [0.001, 0.01, 0.05, 0.5] as const;

const STEP_BUTTON =
  "min-h-11 rounded-full border border-hairline bg-white/6 px-4 text-[14px] font-semibold text-label transition-transform duration-150 active:scale-[0.97] disabled:opacity-40";

const FILL: Record<FdrTest["strength"], string> = {
  strong: "var(--color-strong)",
  moderate: "var(--color-moderate)",
  inconclusive: "var(--color-inconclusive)",
};

type ChartProps = {
  frame: Frame;
  ranked: RankedTest[];
  cutoff: number;
  picked: number | null;
  onPick: (rank: number) => void;
  className: string;
};

function Chart({ frame: F, ranked, cutoff, picked, onPick, className }: ChartProps) {
  const m = ranked.length;
  const W = F.w;
  const H = F.h;
  const P = { ...PAD, left: F.left };
  const x = (rank: number) => P.left + ((rank - 0.5) / m) * (W - P.left - P.right);
  const y = (p: number) => {
    const t = Math.log10(Math.max(p, P_FLOOR) / P_FLOOR) / Math.log10(1 / P_FLOOR);
    return H - P.bottom - t * (H - P.top - P.bottom);
  };
  const bar = ranked.map((t) => `${x(t.rank)},${y(t.bar)}`).join(" ");
  const edge = cutoff > 0 ? (x(cutoff) + x(Math.min(cutoff + 1, m))) / 2 : P.left;
  return (
        <svg viewBox={`0 0 ${W} ${H}`} className={`h-auto w-full ${className}`} role="group" aria-label={`${m} trend tests ranked by p-value against the Benjamini-Hochberg bar`}>
          <rect x={P.left} y={P.top} width={edge - P.left} height={H - P.top - P.bottom} fill="rgb(52 199 89 / 0.06)" />
          {Y_TICKS.map((p) => (
            <g key={p}>
              <line x1={P.left} x2={W - P.right} y1={y(p)} y2={y(p)} stroke="rgb(255 255 255 / 0.07)" />
              <text x={P.left - 8} y={y(p) + 4} textAnchor="end" fontSize={F.font} fill="rgb(235 235 245 / 0.6)" fontFamily="var(--font-mono)">
                {p}
              </text>
            </g>
          ))}
{W >= WIDE.w && (
            <text x={12} y={P.top + 4} fontSize={F.font} fill="rgb(235 235 245 / 0.6)" fontFamily="var(--font-mono)" transform={`rotate(-90 12 ${P.top + 4})`} textAnchor="end">
            p-value (chance)
          </text>
          )}
          <polyline points={bar} fill="none" stroke="var(--color-gold)" strokeWidth="2" />
          <text x={x(m) - 4} y={y(bhBar(m, m)) - 8} textAnchor="end" fontSize={F.font} fill="var(--color-gold-soft)">
            the bar
          </text>
          {cutoff > 0 && cutoff < m && (
            <line x1={edge} x2={edge} y1={P.top} y2={H - P.bottom} stroke="rgb(255 255 255 / 0.45)" strokeDasharray="4 4" />
          )}
          <text x={P.left + 6} y={H - P.bottom + 20} fontSize={F.font} fill="var(--color-strong)">
            ← pass ({cutoff})
          </text>
          <text x={W - P.right} y={H - P.bottom + 20} textAnchor="end" fontSize={F.font} fill="rgb(235 235 245 / 0.6)">
            no clear trend ({m - cutoff}) →
          </text>
          {ranked.map((t) => {
            const on = picked === t.rank;
            return (
              <g
                key={`${t.caseId}/${t.evidenceId}`}
                role="button"
                tabIndex={0}
                aria-label={`${t.label}: ${formatP(t.p)}, ${t.strength}`}
                aria-pressed={on}
                className="cursor-pointer outline-none [&:focus-visible>circle:last-child]:stroke-white"
                onPointerEnter={(e) => e.pointerType === "mouse" && onPick(t.rank)}
                onClick={() => onPick(t.rank)}
                onFocus={() => onPick(t.rank)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") onPick(Math.min(m, t.rank + 1));
                  if (e.key === "ArrowLeft") onPick(Math.max(1, t.rank - 1));
                }}
              >
                <rect x={x(t.rank) - (W - P.left - P.right) / m / 2} y={P.top} width={(W - P.left - P.right) / m} height={H - P.top - P.bottom} fill="transparent" />
                {on && <line x1={x(t.rank)} x2={x(t.rank)} y1={P.top} y2={H - P.bottom} stroke="rgb(255 255 255 / 0.25)" />}
                <circle
                  cx={x(t.rank)}
                  cy={y(t.p)}
                  r={on ? F.r + 2 : F.r}
                  fill={t.survives ? FILL[t.strength] : "transparent"}
                  stroke={on ? "#fff" : FILL[t.strength]}
                  strokeWidth={on ? 2 : 1.5}
                />
              </g>
            );
          })}
        </svg>
  );
}

export function FdrLadder({ tests }: { tests: FdrTest[] }) {
  const ranked = useMemo(() => rankTests(tests), [tests]);
  const m = ranked.length;
  const cutoff = bhCutoff(ranked);
  const [picked, setPicked] = useState<number | null>(null);
  const active = picked === null ? null : ranked[picked - 1];

  const counts = {
    strong: ranked.filter((t) => t.strength === "strong").length,
    moderate: ranked.filter((t) => t.strength === "moderate").length,
    inconclusive: ranked.filter((t) => t.strength === "inconclusive").length,
  };

  return (
    <figure className="glass-card m-0 flex flex-col gap-4 p-4 lg:p-6">
      <figcaption className="flex flex-col gap-1.5">
        <span className="meta text-gold">Try it · every test we ran</span>
        <span className="text-[18px] font-semibold tracking-[-0.01em]">
          {m} tests, lined up from the surest to the least sure
        </span>
        <span className="text-[14px] leading-[1.55] text-secondary">
          Each dot is one trend test. Lower means less likely to be chance. The gold line is the bar, and it gets
          stricter the more tests you run. The dashed line sits at the last dot under the bar: the {cutoff} tests to its left pass, and the other{" "}
          {m - cutoff} are reported as “no clear trend”.
        </span>
      </figcaption>

      <Chart frame={WIDE} ranked={ranked} cutoff={cutoff} picked={picked} onPick={setPicked} className="hidden sm:block" />
      <Chart frame={COMPACT} ranked={ranked} cutoff={cutoff} picked={picked} onPick={setPicked} className="sm:hidden" />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-secondary">
        <span className="inline-flex items-center gap-2"><StrengthLabel kind="strong" /> {counts.strong}</span>
        <span className="inline-flex items-center gap-2"><StrengthLabel kind="moderate" /> {counts.moderate}</span>
        <span className="inline-flex items-center gap-2"><StrengthLabel kind="inconclusive" /> {counts.inconclusive}</span>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setPicked(Math.max(1, (picked ?? 2) - 1))} disabled={picked === 1} className={STEP_BUTTON}>
          ← Surer
        </button>
        <button type="button" onClick={() => setPicked(Math.min(m, (picked ?? 0) + 1))} disabled={picked === m} className={STEP_BUTTON}>
          Less sure →
        </button>
      </div>

      <div className="min-h-[108px] rounded-tile border border-hairline bg-white/3 p-4" aria-live="polite">
        {active ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="meta text-tertiary">Test {active.rank} of {m} · {active.caseLabel}</span>
              <StrengthLabel kind={active.strength} />
            </div>
            <span className="text-[16px] font-semibold tracking-[-0.01em]">{active.label}</span>
            <span className="text-[14px] leading-[1.55] text-secondary">
              <span className="font-mono text-label">{formatP(active.p)}</span>
              {active.survives ? " · passes the bar." : " · doesn’t pass, so the site says “no clear trend”."}
              {active.lead && " On its case page this one is still shown as a lead, not a finding."}{" "}
              <Link href={`/case/${active.caseId}`} className="font-semibold text-gold-soft hover:underline">
                Open the {active.caseLabel} case →
              </Link>
            </span>
          </div>
        ) : (
          <span className="text-[14px] leading-[1.55] text-secondary">
            Tap or hover a dot to see which test it is, or step through them with the buttons.
          </span>
        )}
      </div>
    </figure>
  );
}
