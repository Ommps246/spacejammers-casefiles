// Featured case, right under the hero: the narration's headline, the case's verdict from the JSON, and a
// compact version of its dot plot (same colours and fade rules as the case page). Below 560 px the card keeps
// only the headline, badge, counts line and CTA: the question and the plot are hidden.
import Link from "next/link";

import type { FeaturedCase as Featured } from "@/lib/case-cards";

import { PointDotPlot } from "../case/PointDotPlot";
import { ArrowRightIcon } from "../ui/icons";
import { StrengthLabel } from "../ui/StrengthLabel";

const TOPIC_WORDS: Record<string, string> = { "night-heat": "Night heat", greenery: "Greenery" };
const AXIS = { label: "Night warming, °C per decade →", unit: "°C per decade" };

export function FeaturedCase({ data }: { data: Featured }) {
  return (
    <section id="featured" className="px-5 lg:px-[120px]" aria-labelledby="featured-title">
      <article className="glass-card relative flex flex-col gap-8 p-6 lg:flex-row lg:items-center lg:gap-12 lg:p-10">
        <div className="absolute top-[-1px] left-6 h-1.5 w-20 rounded-b-[6px] bg-gold/70" />
        <div className="flex flex-col gap-4 lg:w-[42%] lg:shrink-0">
          <span className="meta text-gold">
            Featured case · Case 01 · {data.region} · {TOPIC_WORDS[data.topic] ?? data.topic}
          </span>
          <span className="hidden text-[15px] leading-normal text-secondary min-[560px]:inline">{data.question}</span>
          <h2
            id="featured-title"
            className="m-0 text-[28px] leading-[1.12] font-bold tracking-[-0.025em] lg:text-[36px] lg:leading-[1.1]"
          >
            {data.headline}
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <StrengthLabel kind={data.strength} size="md" />
            <span className="text-[14px] leading-[1.45] text-secondary">{data.caption}</span>
          </div>
          <Link
            href={`/case/${data.id}`}
            className="mt-1 inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-gold bg-gold px-5 text-[15px] font-semibold tracking-[-0.01em] text-space-1"
          >
            Open the case
            <ArrowRightIcon color="#0b1020" />
          </Link>
        </div>
        <div className="hidden min-w-0 grow min-[560px]:block">
          <PointDotPlot
            dots={data.dots}
            caption={data.caption}
            axisLabel={AXIS.label}
            unit={AXIS.unit}
            eyebrow="Every point"
            bare
          />
        </div>
      </article>
    </section>
  );
}
