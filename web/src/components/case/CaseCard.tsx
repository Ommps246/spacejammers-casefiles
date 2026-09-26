// Case card: folder tab · question · verdict · optional tag (Components · Case card).
import Link from "next/link";

import type { Strength } from "@/lib/case-data";
import type { CardTag } from "@/lib/landing";

import { ArrowRightIcon, DetectorIcon } from "../ui/icons";
import { StrengthLabel } from "../ui/StrengthLabel";

const TOPICS: Record<string, string> = {
  heat: "Temperature",
  rain: "Rainfall",
  greenery: "Greenery",
  "night-heat": "Night heat",
};

export type CaseCardData = {
  id: string;
  number: number;
  topic: string;
  region: string;
  question: string;
  strength: Strength;
  tag: CardTag | null;
};

// Minimum height, not height: a tag must never push the footer out of the card.
// Callers pass it (sheet 260 px, landing 300 px on desktop; phones size to content).
const CARD = "glass-card relative flex flex-col gap-4 p-5 lg:p-6";

type CardProps = { data: CaseCardData; className?: string };

export function CaseCard({ data, className = "lg:min-h-[260px]" }: CardProps) {
  const number = String(data.number).padStart(2, "0");
  return (
    <Link
      href={`/case/${data.id}`}
      className={`${CARD} ${className} text-label transition-colors hover:border-gold/40`}
    >
      <div className="absolute top-[-1px] left-5 h-1.5 w-16 rounded-b-[6px] bg-gold/55" />
      <div className="flex items-center justify-between">
        <span className="meta text-tertiary">
          Case {number} · {TOPICS[data.topic] ?? data.topic}
        </span>
        <span className="text-[12px] text-secondary">{data.region}</span>
      </div>
      <span className="text-[20px] leading-tight font-[650] tracking-[-0.018em] lg:text-[22px]">{data.question}</span>
      {data.tag && (
        <div className="flex items-center gap-2 self-start rounded-full border border-gold/40 bg-gold/8 px-3 py-1.5 text-[13px] font-semibold text-gold-soft">
          {data.tag.kind === "detector" && <DetectorIcon size={14} />}
          <span>{data.tag.text}</span>
        </div>
      )}
      <div className="grow" />
      <div className="flex items-center justify-between gap-2">
        <StrengthLabel kind={data.strength} />
        <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-gold-soft">
          Open case
          <ArrowRightIcon />
        </span>
      </div>
    </Link>
  );
}
