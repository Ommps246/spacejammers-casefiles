// "One to watch": one point where three separate signals line up. A pointer for the reader, not a verdict.
import Link from "next/link";

import type { WatchCallout } from "@/lib/case-sections";

import { STRENGTH_WORDS, strengthWords } from "../ui/StrengthLabel";

// Each signal links to the case it comes from, when that isn't the page you're on.
type Props = {
  watch: WatchCallout;
  links: { greenery?: string; nightHeat?: string };
};

function CaseLink({ href, label }: { href?: string; label: string }) {
  if (!href) return null;
  return (
    <>
      {" "}
      <Link href={href} className="text-gold-soft hover:underline">
        {label} →
      </Link>
    </>
  );
}

function Signal({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-1 rounded-tile border border-hairline bg-white/4 px-4 py-3">
      <span className="meta text-tertiary">{label}</span>
      <span className="text-[15px] leading-[1.45] text-label">{children}</span>
    </li>
  );
}

export function OneToWatch({ watch, links }: Props) {
  const { landCover, greenery, gap } = watch;
  return (
    <aside className="flex flex-col gap-4 rounded-card border border-gold/38 bg-gold/6 p-6" aria-label="One to watch">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="meta text-gold">One to watch</span>
        <span className="text-[20px] leading-tight font-[650] tracking-[-0.015em]">{watch.pointName}</span>
      </div>
      <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
        <Signal label="1 · Land cover changed">
          {landCover.from} <span className="text-gold">→</span>{" "}
          <span className="font-semibold text-gold-soft">{landCover.to}</span>
        </Signal>
        <Signal label={`2 · Greenery ${greenery.falling ? "down" : "not down"}`}>
          <span className="tabular-nums">{greenery.value}</span> greenness index (NDVI) per decade ·{" "}
          {STRENGTH_WORDS[greenery.strength]}.
          <CaseLink href={links.greenery} label="Greenery case" />
        </Signal>
        <Signal label={gap.largest ? "3 · Largest city-minus-countryside gap" : "3 · City-minus-countryside gap"}>
          Night heat: <span className="tabular-nums">{gap.value}</span> {gap.unit} · {strengthWords("lead", gap.signal)}
          .
          <CaseLink href={links.nightHeat} label="Night-heat case" />
        </Signal>
      </ol>
      <p className="m-0 text-[13px] leading-[1.5] text-secondary">
        Three separate signals point at the same place. That’s a reason to look closer, not proof that one caused
        another.
      </p>
    </aside>
  );
}
