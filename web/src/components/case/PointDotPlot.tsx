"use client";
// Summary dot plot (Observable Plot): one row per point (or, for heat, the region), x = its own trend per
// decade (each exhibit's Sen's slope; for greenness, browning sits left of zero), sorted by value.
// City/region = gold, farmland controls = neutral grey, urban edge = hollow gold; points that didn't pass
// the multiple-test check are faded. An optional reference (the whole planet) is a dashed line, never a dot.
// No error bars: the case file has none. Colours checked with the dataviz validator on the dark surface
// (gold vs #7c7c82: CVD ΔE 17.4, normal-vision ΔE 18.9, both ≥ 3:1 contrast). Hover and keyboard details
// come from DotHover (Plot's own tip was a white box with no keyboard support).
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "react";

import type { DotKind, PointDot } from "@/lib/case-sections";

import { DotHover, type RowGeometry } from "./DotHover";

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
const MARGIN_RIGHT = 12;
const NARROW_MARGIN_RIGHT = 16;
const MARGIN_TOP = 8;
const REFERENCE_MARGIN_TOP = 28; // room for the reference line's label
const MARGIN_BOTTOM = 36;
const NARROW_MARGIN_BOTTOM = 44;
const NARROW_INSET_BOTTOM = 18; // keeps the last row clear of the x-axis tick labels on phones
const MIN_WIDTH = 320;
const TICKS = 5;
const NARROW_TICKS = 3;
const LABEL_DX = 14; // value label offset from the dot centre
const LABEL_ROOM = 6; // breathing room after the widest value label
const DOT_ROOM = 10; // dot radius + stroke, so the outermost dot is never cut
const FONT = "13px";
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

/** Text width in px in the chart's own font, so the space kept for labels is measured, not guessed. */
function textWidth(text: string, fontFamily: string): number {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * 8;
  ctx.font = `${FONT} ${fontFamily}`;
  return ctx.measureText(text).width;
}

type Insets = { left: number; right: number };

/**
 * Room to keep inside the frame, beyond the outermost values: the widest value label on each side (wide
 * charts), half the reference label when the reference is the outermost value, and a dot's radius.
 */
function labelInsets(dots: PointDot[], narrow: boolean, fontFamily: string, reference?: Reference): Insets {
  const widest = (ds: PointDot[]) => Math.max(0, ...ds.map((d) => textWidth(d.label, fontFamily)));
  const valueRoom = (ds: PointDot[]) => (narrow || ds.length === 0 ? DOT_ROOM : LABEL_DX + widest(ds) + LABEL_ROOM);
  const refHalf = reference ? textWidth(`${reference.name} ${reference.label}`, fontFamily) / 2 + LABEL_ROOM : 0;
  const maxDot = Math.max(0, ...dots.map((d) => d.slope));
  const refIsRightmost = reference !== undefined && reference.value >= maxDot;
  return {
    left: valueRoom(dots.filter((d) => d.slope < 0)),
    right: Math.max(valueRoom(dots.filter((d) => d.slope >= 0)), refIsRightmost ? refHalf : 0),
  };
}

type Rendered = { svg: SVGSVGElement | HTMLElement; rows: RowGeometry[] };

function render(dots: PointDot[], width: number, fontFamily: string, reference?: Reference): Rendered {
  const values = [...dots.map((d) => d.slope), ...(reference ? [reference.value] : [])];
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const narrow = width < NARROW_BELOW;
  const ticks = narrow ? NARROW_TICKS : TICKS;
  const names = dots.map((d) => d.name);
  const inset = labelInsets(dots, narrow, fontFamily, reference);
  const svg = Plot.plot({
    width,
    height: heightFor(dots.length, narrow, reference !== undefined),
    marginLeft: narrow ? NARROW_MARGIN_LEFT : MARGIN_LEFT,
    marginRight: narrow ? NARROW_MARGIN_RIGHT : MARGIN_RIGHT,
    marginTop: reference ? REFERENCE_MARGIN_TOP : MARGIN_TOP,
    marginBottom: narrow ? NARROW_MARGIN_BOTTOM : MARGIN_BOTTOM,
    insetBottom: narrow ? NARROW_INSET_BOTTOM : 0,
    style: { background: "transparent", color: INK, fontSize: FONT, fontFamily: "inherit" },
    x: { domain: [lo, hi], nice: true, label: null, ticks, insetLeft: inset.left, insetRight: inset.right },
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
    ],
  });
  return { svg, rows: rowGeometry(svg, dots, narrow, fontFamily) };
}

/** Each row's band and dot position, from the plot's own scales, for the hover layer. */
function rowGeometry(svg: SVGSVGElement | HTMLElement, dots: PointDot[], narrow: boolean, fontFamily: string) {
  const plot = svg as unknown as { scale(name: "x" | "y"): Plot.Scale | undefined };
  const x = plot.scale("x");
  const y = plot.scale("y");
  if (!x || !y) return [];
  const band = y.step ?? y.bandwidth ?? ROW_HEIGHT;
  return dots.map((d) => {
    const cx: number = x.apply(d.slope);
    const cy: number = y.apply(d.name) + (y.bandwidth ?? 0) / 2;
    const labelEnd = !narrow && d.slope >= 0 ? cx + LABEL_DX + textWidth(d.label, fontFamily) : cx + DOT_ROOM;
    return { id: d.id, cx, cy, top: cy - band / 2, height: band, labelEnd };
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

type Layout = { rows: RowGeometry[]; width: number; narrow: boolean };

export function PointDotPlot({ dots, caption, axisLabel, unit, eyebrow, reference, bare = false }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const draw = () => {
      const width = Math.max(MIN_WIDTH, el.clientWidth);
      const { svg, rows } = render(dots, width, getComputedStyle(el).fontFamily, reference);
      el.replaceChildren(svg);
      setLayout({ rows, width, narrow: width < NARROW_BELOW });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(el);
    return () => {
      observer.disconnect();
      el.replaceChildren();
    };
  }, [dots, reference]);

  return (
    <figure className={bare ? "m-0 flex min-w-0 flex-col gap-3" : "glass-card m-0 flex flex-col gap-4 p-6 lg:p-8"}>
      <figcaption className={bare ? "sr-only" : "flex flex-col gap-2"}>
        <span className="meta text-gold">{eyebrow}</span>
        <span className="text-[22px] leading-[1.25] font-[650] tracking-[-0.015em]">{caption}</span>
      </figcaption>
      <Legend dots={dots} reference={reference} />
      <div className="flex min-w-0 flex-col gap-1">
        <div className="relative min-w-0">
          <div
            ref={box}
            aria-hidden="true"
            style={{ minHeight: heightFor(dots.length, false, reference !== undefined) }}
            className="min-w-0"
          />
          {layout && (
            <DotHover
              dots={dots}
              rows={layout.rows}
              width={layout.width}
              narrow={layout.narrow}
              unit={unit}
              kindWords={KIND_WORDS}
            />
          )}
        </div>
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
