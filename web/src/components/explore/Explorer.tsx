"use client";
// "Pick a variable": choose what to look at, then where. The answer card says what is changing, where,
// how much and whether it's significant, in the case files' own numbers. The choice is kept in the URL
// hash (#greenness/chennai-greenery/ndvi_chennai_omr) so a view can be shared.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FAMILY_TITLES, tally, type ExploreRow, type ExploreVariable, type Family } from "@/lib/explore";
import { formatP, formatTrend, plural } from "@/lib/format";

import { TrendChart } from "../case/TrendChart";
import { StrengthLabel } from "../ui/StrengthLabel";

const CHIP = "min-h-11 rounded-full border px-4 text-[14px] font-semibold tracking-[-0.01em] transition-transform duration-150 active:scale-[0.97]";
const FAMILIES: readonly Family[] = ["weather", "satellite", "gap"];

const DOT: Record<ExploreRow["strength"], string> = {
  strong: "var(--color-strong)",
  moderate: "var(--color-moderate)",
  inconclusive: "var(--color-inconclusive)",
};

const UNIT_WORDS: Record<string, string> = {
  "°C per decade": "°C per decade",
  "days/yr per decade": "days a year, per decade",
  "mm/yr per decade": "mm a year, per decade",
  "mm/day per decade": "mm per decade",
  "NDVI per decade": "NDVI per decade",
};
const unitWords = (u: string) => UNIT_WORDS[u] ?? u;

function significance(r: ExploreRow): string {
  if (r.reference) return "Tested on its own as a reference line, outside our multiple-test check.";
  if (r.lead) {
    return r.survivesFdr
      ? "Passes the multiple-test check, but we treat it as a lead to follow, not a finding: a 500 m land-cover class can’t prove the farmland stayed farmland."
      : "Doesn’t pass the multiple-test check, so there’s no clear trend yet. A lead to follow, not a finding.";
  }
  return r.survivesFdr
    ? "Passes the check we run across all 40 tests at once, so it’s unlikely to be chance."
    : "Doesn’t pass the check we run across all 40 tests at once, so we call it no clear trend.";
}

function direction(r: ExploreRow): string {
  if (r.trend === "increasing") return "Rising";
  if (r.trend === "decreasing") return "Falling";
  return "No clear trend";
}

/** One row per place on a shared axis around zero, so opposite directions show at a glance. */
function PlaceList({ v, picked, onPick }: { v: ExploreVariable; picked: string; onPick: (key: string) => void }) {
  const max = Math.max(...v.rows.map((r) => Math.abs(r.slope))) || 1;
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label={`Places measured for ${v.name}`}>
      {v.rows.map((r) => {
        const on = r.key === picked;
        const pct = (Math.abs(r.slope) / max) * 50;
        return (
          <li key={r.key}>
            <button
              type="button"
              onClick={() => onPick(r.key)}
              aria-pressed={on}
              className={`grid min-h-12 w-full grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_auto] items-center gap-3 rounded-tile px-3 text-left transition-colors duration-150 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] ${
                on ? "bg-gold/12 ring-1 ring-gold/50" : "hover:bg-white/5"
              }`}
            >
              <span className="flex min-w-0 flex-col">
                <span className={`truncate text-[14px] font-semibold ${on ? "text-gold-pale" : "text-label"}`}>{r.place}</span>
                <span className="truncate text-[11px] text-tertiary">{r.where}</span>
              </span>
              <span className="relative h-5" aria-hidden="true">
                <span className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
                <span
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
                  style={{
                    background: DOT[r.strength],
                    opacity: r.strength === "inconclusive" ? 0.55 : 0.9,
                    width: `${Math.max(pct, 1)}%`,
                    left: r.slope >= 0 ? "50%" : `${50 - pct}%`,
                  }}
                />
              </span>
              <span className="w-[4.6rem] text-right font-mono text-[13px] text-label tabular-nums">
                {formatTrend(r.slope, r.unitsPerDecade)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Answer({ v, r }: { v: ExploreVariable; r: ExploreRow }) {
  const facts = [
    { q: "What is changing?", a: `${v.name}: ${direction(r).toLowerCase()}` },
    { q: "Where?", a: `${r.place} (${r.where}), ${r.span}` },
    { q: "How much?", a: `${formatTrend(r.slope, r.unitsPerDecade)} ${unitWords(r.unitsPerDecade)}` },
    { q: "Is it significant?", a: significance(r) },
  ];
  return (
    <section className="glass-card flex flex-col gap-5 p-5 lg:p-6" aria-live="polite" aria-labelledby="answer-title">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="meta text-gold">The answer</span>
        <StrengthLabel kind={r.lead ? "lead" : r.strength} signal={r.lead ? r.strength : undefined} />
        <span className="font-mono text-[12px] text-secondary">{formatP(r.p)}</span>
      </div>
      <h2 id="answer-title" className="m-0 scroll-mt-6 text-[22px] leading-[1.25] font-[650] tracking-[-0.02em] lg:text-[26px]">
        {r.place}: {direction(r).toLowerCase()}, {formatTrend(r.slope, r.unitsPerDecade)} {unitWords(r.unitsPerDecade)}
      </h2>
      <dl className="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.q} className="flex flex-col gap-1 border-t border-hairline pt-3">
            <dt className="meta text-tertiary">{f.q}</dt>
            <dd className="m-0 text-[15px] leading-[1.5] text-label">{f.a}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-tile border border-hairline bg-space-0/50 p-3">
        <div className="hidden sm:block">
          <TrendChart chart={r.chart} width={640} height={220} reference={r.reference} />
        </div>
        <div className="sm:hidden">
          <TrendChart chart={r.chart} width={340} height={220} reference={r.reference} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-secondary">
        <span>Gold line: the trend (Sen’s slope). Source: {v.source}.</span>
        <Link href={`/case/${r.caseId}`} className="inline-flex min-h-11 items-center font-semibold text-gold-soft hover:underline">
          Open the full case →
        </Link>
      </div>
    </section>
  );
}

function readHash(variables: readonly ExploreVariable[]): { v: number; key: string } | null {
  const [id, ...rest] = decodeURIComponent(window.location.hash.slice(1)).split("/");
  const vi = variables.findIndex((x) => x.id === id);
  if (vi < 0) return null;
  const key = rest.join("/");
  return { v: vi, key: variables[vi].rows.some((r) => r.key === key) ? key : variables[vi].rows[0].key };
}

export function Explorer({ variables }: { variables: ExploreVariable[] }) {
  const [vi, setVi] = useState(0);
  const [key, setKey] = useState(variables[0].rows[0].key);

  // Open the view named in the URL hash, on load and when someone pastes or follows another link.
  useEffect(() => {
    let frame = 0;
    const apply = () => {
      const fromHash = readHash(variables);
      if (!fromHash) return;
      frame = requestAnimationFrame(() => {
        setVi(fromHash.v);
        setKey(fromHash.key);
      });
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", apply);
    };
  }, [variables]);

  const v = variables[vi];
  const r = v.rows.find((x) => x.key === key) ?? v.rows[0];
  const t = useMemo(() => tally(v.rows), [v]);

  const choose = (nextVi: number, nextKey: string) => {
    setVi(nextVi);
    setKey(nextKey);
    window.history.replaceState(null, "", `#${variables[nextVi].id}/${nextKey}`);
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4" aria-labelledby="step-1">
        <h2 id="step-1" className="meta m-0 text-gold">1 · Pick a variable</h2>
        {FAMILIES.map((family) => {
          const inFamily = variables.map((x, i) => ({ x, i })).filter(({ x }) => x.family === family);
          if (!inFamily.length) return null;
          return (
            <div key={family} className="flex flex-col gap-2">
              <span className="text-[13px] text-tertiary">{FAMILY_TITLES[family]}</span>
              <div className="flex flex-wrap gap-2">
                {inFamily.map(({ x, i }) => (
                  <button
                    key={x.id}
                    type="button"
                    aria-pressed={i === vi}
                    onClick={() => choose(i, x.rows[0].key)}
                    className={`${CHIP} ${i === vi ? "border-gold bg-gold/15 text-gold-pale" : "border-hairline bg-white/4 text-secondary hover:text-label"}`}
                  >
                    {x.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="glass-card flex flex-col gap-4 p-4 lg:p-5" aria-labelledby="step-2">
          <div className="flex flex-col gap-1.5">
            <h2 id="step-2" className="meta m-0 text-gold">2 · Pick a place</h2>
            <p className="m-0 text-[17px] leading-[1.35] font-semibold tracking-[-0.01em] text-label">{v.question}</p>
            <p className="m-0 text-[13px] leading-[1.5] text-secondary">
              {v.family === "gap" ? "Leads: " : ""}
              {plural(t.rising, "place")} rising, {plural(t.falling, "place")} falling, {t.unclear} with no clear trend.
              {t.rising > 0 && t.falling > 0 && " The same variable moves in opposite directions in different places."}
            </p>
          </div>
          <div className="flex items-center justify-between px-3 text-[11px] text-tertiary">
            <span>Place</span>
            <span>← falling · rising →</span>
            <span>per decade</span>
          </div>
          <PlaceList
            v={v}
            picked={r.key}
            onPick={(k) => {
              choose(vi, k);
              // On narrow screens the answer sits below the list: bring it into view.
              if (window.innerWidth < 1024) {
                const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                document.getElementById("answer-title")?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
              }
            }}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 text-[12px] text-tertiary">
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-strong" /> strong</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-moderate" /> moderate</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-inconclusive" /> no clear trend</span>
          </div>
        </section>
        <Answer v={v} r={r} />
      </div>
    </div>
  );
}
