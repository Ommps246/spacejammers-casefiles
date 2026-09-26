// Evidence card (design/Evidence-Variants.dc.html).
// A: words left, chart right (desktop case page). B: stat first, stacked (mobile; 2-up grids).
import Link from "next/link";

import type { EvidenceView } from "@/lib/evidence-view";

import { DetectorIcon } from "../ui/icons";
import { SourceChip } from "../ui/SourceChip";
import { BigStat, StatPill } from "../ui/StatPill";
import { StrengthLabel } from "../ui/StrengthLabel";

import { TrendChart } from "./TrendChart";

type Props = {
  view: EvidenceView;
  /** One plain sentence from the guard-checked narration; falls back to the pipeline's own label text. */
  note?: string;
  variant: "A" | "B";
  chartSize?: { width: number; height: number };
};

const UNEXPECTED = "Unexpected direction: worth a second look";

function Header({ view }: { view: EvidenceView }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`meta ${view.isReference ? "text-reference" : "text-gold"}`}>{view.tag}</span>
      <StrengthLabel kind={view.strength} signal={view.leadSignal} />
    </div>
  );
}

/** Role tag beside the title (e.g. the urban edge), linking to the method that explains it. */
function Badge({ badge }: { badge: NonNullable<EvidenceView["badge"]> }) {
  return (
    <Link
      href={badge.href}
      className="inline-flex items-center gap-1.5 self-start rounded-full border border-hairline bg-white/6 px-2.5 py-1 text-[12px] font-semibold text-secondary hover:border-gold/40 hover:text-label"
    >
      {badge.text}
      <span className="text-gold-soft">Why? →</span>
    </Link>
  );
}

function Callout() {
  return (
    <div className="inline-flex items-center gap-2 self-start rounded-flag border border-moderate/22 bg-moderate/8 px-3 py-1.5 text-[13px] text-moderate-soft">
      <DetectorIcon size={14} color="#ffb020" />
      {UNEXPECTED}
    </div>
  );
}

function Legend({ view }: { view: EvidenceView }) {
  const dash = view.isReference ? "border-dashed border-reference" : "border-solid border-gold";
  return (
    <div className="flex items-center gap-2 text-[11px] text-secondary tabular-nums">
      <span className={`w-3.5 border-t-2 ${dash}`} />
      <span className="whitespace-pre">{view.chart.legend}</span>
    </div>
  );
}

export function EvidenceCard({ view, note, variant, chartSize }: Props) {
  const surface = view.isReference ? "reference-card" : view.strength === "lead" ? "lead-card" : "glass-card";
  const tone = view.isReference ? "reference" : "label";
  const sentence = note ?? "";

  if (variant === "A") {
    const size = chartSize ?? { width: 460, height: 172 };
    return (
      <article className={`${surface} p-8`}>
        <div className="flex items-center gap-12">
          <div className="flex min-w-0 grow flex-col gap-3.5">
            <Header view={view} />
            <h3 className="m-0 text-title-3">{view.title}</h3>
            {view.badge && <Badge badge={view.badge} />}
            {sentence && <p className="m-0 max-w-[520px] text-body text-secondary">{sentence}</p>}
            {view.unexpectedDirection && <Callout />}
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <StatPill value={view.stat.value} unit={view.stat.unit} tone={tone} />
              <span className="meta text-tertiary">{view.meta}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2.5" style={{ width: size.width }}>
            <TrendChart chart={view.chart} width={size.width} height={size.height} reference={view.isReference} />
            <div className="flex items-center justify-between gap-2">
              <Legend view={view} />
              <SourceChip source={view.source} />
            </div>
          </div>
        </div>
      </article>
    );
  }

  const size = chartSize ?? { width: 582, height: 160 };
  return (
    <article className={`${surface} p-7`}>
      <div className="flex flex-col gap-3.5">
        <Header view={view} />
        <h3 className="m-0 text-[22px] leading-[1.2] font-[650] tracking-[-0.015em]">{view.title}</h3>
        {view.badge && <Badge badge={view.badge} />}
        <BigStat value={view.stat.value} unit={view.stat.unit} tone={tone} />
        {sentence && <p className="m-0 text-[16px] leading-[1.6] text-secondary">{sentence}</p>}
        {view.unexpectedDirection && <Callout />}
        <div className="mt-1">
          <TrendChart chart={view.chart} width={size.width} height={size.height} reference={view.isReference} />
        </div>
        <div className="flex flex-col gap-2.5">
          <Legend view={view} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="meta text-tertiary">{view.meta}</span>
            <SourceChip source={view.source} />
          </div>
        </div>
      </div>
    </article>
  );
}
