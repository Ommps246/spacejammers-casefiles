"use client";
// Summary dot plot (Observable Plot): one row per point (or, for heat, the region), x = its own trend per
// decade (each exhibit's Sen's slope; for greenness, browning sits left of zero), sorted by value.
// City/region = gold, farmland controls = neutral grey, urban edge = hollow gold; points that didn't pass
// the multiple-test check are faded. An optional reference (the whole planet) is a dashed line, never a dot.
// No error bars: the case file has none. Colours checked with the dataviz validator on the dark surface
// (gold vs #7c7c82: CVD ΔE 17.4, normal-vision ΔE 18.9, both ≥ 3:1 contrast).
import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";

import type { DotKind, PointDot } from "@/lib/case-sections";

type Reference = { name: string; value: number; label: string };

type Props = {
  dots: PointDot[];
  caption: string;
  axisLabel: string;
  unit: string;
  eyebrow: string;
  reference?: Reference;
  /** Compact use inside another card (landing page): no card surface, caption kept for screen readers only. */
  bare?: boolean;
};

const GOLD = "#c9a24a";
const NEUTRAL = "#7c7c82";
const REFERENCE_INK = "#dfe7f5"; // the reference-series colour used by the evidence charts
const INK = "rgba(235,235,245,0.66)";
const HALO = "#13161f"; // the card's surface over the page background
const ROW_HEIGHT = 34;
const NARROW_ROW_HEIGHT = 50; // name above the dot on phones
const NARROW_BELOW = 560; // px of chart width: below this, names move above each row
const MARGIN_LEFT = 190;
const NARROW_MARGIN_LEFT = 16;
const MARGIN_RIGHT = 64;
const MARGIN_TOP = 8;
const REFERENCE_MARGIN_TOP = 28; // room for the reference line's label
const MARGIN_BOTTOM = 36;
const NARROW_MARGIN_BOTTOM = 44;
const NARROW_INSET_BOTTOM = 18; // keeps the last row clear of the x-axis tick labels on phones
const MIN_WIDTH = 320;
const TICKS = 5;
const NARROW_TICKS = 3;
const X_PAD = 0.16; // share of the data range added beyond the outermost marks, for their labels
const FADED_OPACITY = 0.4;
const FADED_NOTE = "Faded = didn’t pass the multiple-test check";

const KIND_WORDS: Record<DotKind, string> = {
  city: "City",
  edge: "Urban edge",
  control: "Farmland control",
  region: "This region",
};
const fillOf = (d: PointDot) => (d.kind === "edge" ? "none" : d.kind === "control" ? NEUTRAL : GOLD);
const strokeOf = (d: PointDot) => (d.kind === "control" ? NEUTRAL : GOLD);
const opacityOf = (d: PointDot) => (d.faded ? FADED_OPACITY : 1);

function heightFor(rows: number, narrow: boolean, hasReference: boolean): number {
  const top = hasReference ? REFERENCE_MARGIN_TOP : MARGIN_TOP;
  return narrow
    ? rows * NARROW_ROW_HEIGHT + top + NARROW_MARGIN_BOTTOM + NARROW_INSET_BOTTOM
    : rows * ROW_HEIGHT + top + MARGIN_BOTTOM;
}

function valueMarks(dots: PointDot[]) {
  // Beside each dot on wide charts: right of positive values, left of negative ones.
  return [
    Plot.text(
      dots.filter((d) => d.slope >= 0),
      { x: "slope", y: "name", text: "label", dx: 14, textAnchor: "start", fill: INK, fillOpacity: opacityOf },
    ),
    Plot.text(
      dots.filter((d) => d.slope < 0),
      { x: "slope", y: "name", text: "label", dx: -14, textAnchor: "end", fill: INK, fillOpacity: opacityOf },
    ),
  ];
}

function nameMarks(dots: PointDot[]) {
  // Phones: the point's name and value above its row, so nothing is clipped at the edges.
  return [
    Plot.text(dots, {
      y: "name",
      text: (d: PointDot) => `${d.name}  ${d.label}`,
      stroke: HALO, // keeps the name readable where it crosses the zero line and grid
      strokeWidth: 4,
      paintOrder: "stroke",
      frameAnchor: "left",
      dx: 6,
      dy: -16,
      textAnchor: "start",
      fill: INK,
    }),
  ];
}

function referenceMarks(reference: Reference | undefined) {
  if (!reference) return [];
  return [
    Plot.ruleX([reference.value], { stroke: REFERENCE_INK, strokeOpacity: 0.7, strokeDasharray: "4,4" }),
    Plot.text([reference], {
      x: "value",
      text: (r: Reference) => `${r.name} ${r.label}`,
      frameAnchor: "top",
      dy: -18,
      fill: REFERENCE_INK,
    }),
  ];
}

function render(dots: PointDot[], width: number, unit: string, reference?: Reference): SVGSVGElement | HTMLElement {
  const values = [...dots.map((d) => d.slope), ...(reference ? [reference.value] : [])];
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const pad = (hi - lo) * X_PAD;
  const narrow = width < NARROW_BELOW;
  const ticks = narrow ? NARROW_TICKS : TICKS;
  const names = dots.map((d) => d.name);
  return Plot.plot({
    width,
    height: heightFor(dots.length, narrow, reference !== undefined),
    marginLeft: narrow ? NARROW_MARGIN_LEFT : MARGIN_LEFT,
    marginRight: MARGIN_RIGHT,
    marginTop: reference ? REFERENCE_MARGIN_TOP : MARGIN_TOP,
    marginBottom: narrow ? NARROW_MARGIN_BOTTOM : MARGIN_BOTTOM,
    insetBottom: narrow ? NARROW_INSET_BOTTOM : 0,
    style: { background: "transparent", color: INK, fontSize: "13px", fontFamily: "inherit" },
    x: { domain: [lo < 0 ? lo - pad : 0, hi > 0 ? hi + pad : 0], label: null, ticks },
    y: narrow
      ? { domain: names, axis: null, padding: 0.2, align: 1 }
      : { domain: names, label: null, tickSize: 0, tickPadding: 12 },
    marks: [
      ...(narrow ? nameMarks(dots) : []),
      Plot.gridX({ stroke: "#fff", strokeOpacity: 0.06, ticks }),
      Plot.ruleX([0], { stroke: "#fff", strokeOpacity: 0.35 }),
      ...referenceMarks(reference),
      Plot.ruleY(dots, { y: "name", x1: 0, x2: "slope", stroke: "#fff", strokeOpacity: 0.08 }),
      Plot.dot(dots, {
        x: "slope",
        y: "name",
        r: 6,
        fill: fillOf,
        stroke: strokeOf,
        strokeWidth: 2,
        fillOpacity: opacityOf,
        strokeOpacity: opacityOf,
      }),
      ...(narrow ? [] : valueMarks(dots)),
      Plot.tip(
        dots,
        Plot.pointerY({
          x: "slope",
          y: "name",
          title: (d: PointDot) =>
            `${d.name}\n${KIND_WORDS[d.kind]}\n${d.label} ${unit}\n` +
            (d.passes ? "Passed the multiple-test check" : "Didn’t pass the multiple-test check"),
        }),
      ),
    ],
  });
}

const SWATCHES: Record<DotKind, React.CSSProperties> = {
  city: { background: GOLD, border: `2px solid ${GOLD}` },
  region: { background: GOLD, border: `2px solid ${GOLD}` },
  edge: { background: "transparent", border: `2px solid ${GOLD}` },
  control: { background: NEUTRAL, border: `2px solid ${NEUTRAL}` },
};
const LEGEND_ORDER: DotKind[] = ["region", "city", "edge", "control"];

function LegendItem({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-2">
      {swatch}
      {children}
    </li>
  );
}

/** Only what's on this chart: the kinds present, the reference line if any, and the faded note if any. */
function Legend({ dots, reference }: { dots: PointDot[]; reference?: Reference }) {
  const kinds = LEGEND_ORDER.filter((k) => dots.some((d) => d.kind === k));
  const dot = (style: React.CSSProperties) => (
    <span aria-hidden="true" className="inline-block size-3 rounded-full" style={style} />
  );
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[13px] text-secondary">
      {kinds.map((k) => (
        <LegendItem key={k} swatch={dot(SWATCHES[k])}>
          {KIND_WORDS[k]}
        </LegendItem>
      ))}
      {reference && (
        <LegendItem
          swatch={<span aria-hidden="true" className="inline-block h-3 border-l-2 border-dashed border-reference" />}
        >
          {reference.name} (reference line, not a point)
        </LegendItem>
      )}
      {dots.some((d) => d.faded) && (
        <LegendItem swatch={dot({ ...SWATCHES.control, opacity: FADED_OPACITY })}>{FADED_NOTE}</LegendItem>
      )}
    </ul>
  );
}

export function PointDotPlot({ dots, caption, axisLabel, unit, eyebrow, reference, bare = false }: Props) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const draw = () => el.replaceChildren(render(dots, Math.max(MIN_WIDTH, el.clientWidth), unit, reference));
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(el);
    return () => {
      observer.disconnect();
      el.replaceChildren();
    };
  }, [dots, unit, reference]);

  return (
    <figure className={bare ? "m-0 flex min-w-0 flex-col gap-3" : "glass-card m-0 flex flex-col gap-4 p-6 lg:p-8"}>
      <figcaption className={bare ? "sr-only" : "flex flex-col gap-2"}>
        <span className="meta text-gold">{eyebrow}</span>
        <span className="text-[22px] leading-[1.25] font-[650] tracking-[-0.015em]">{caption}</span>
      </figcaption>
      <Legend dots={dots} reference={reference} />
      <div className="flex min-w-0 flex-col gap-1">
        <div
          ref={box}
          aria-hidden="true"
          style={{ minHeight: heightFor(dots.length, false, reference !== undefined) }}
          className="min-w-0"
        />
        <p className="m-0 text-[13px] text-secondary" aria-hidden="true">
          {axisLabel}
        </p>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Point</th>
            <th scope="col">Type</th>
            <th scope="col">{axisLabel}</th>
            <th scope="col">Multiple-test check</th>
          </tr>
        </thead>
        <tbody>
          {dots.map((d) => (
            <tr key={d.id}>
              <td>{d.name}</td>
              <td>{KIND_WORDS[d.kind]}</td>
              <td>{d.label}</td>
              <td>{d.passes ? "Passed" : "Didn’t pass"}</td>
            </tr>
          ))}
          {reference && (
            <tr>
              <td>{reference.name}</td>
              <td>Reference line</td>
              <td>{reference.label}</td>
              <td>Not part of the multiple-test check</td>
            </tr>
          )}
        </tbody>
      </table>
    </figure>
  );
}
