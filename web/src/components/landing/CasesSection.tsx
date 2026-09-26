// "Open cases": a stat strip (every number counted from the case files) above the case grid.
import { plural } from "@/lib/format";
import type { LandingStats } from "@/lib/landing";

import { CaseCard, type CaseCardData } from "../case/CaseCard";

type Stat = { value: number; label: string; note: string };

function stats(s: LandingStats): Stat[] {
  return [
    { value: s.cases, label: "Cases", note: "each with an honest verdict" },
    { value: s.datasets, label: "NASA datasets", note: "satellite, weather and planet-wide records" },
    {
      value: s.places,
      label: "Places checked",
      note: `${plural(s.satellitePoints, "satellite pixel")} + ${plural(s.gridPoints, "weather-grid point")}`,
    },
    { value: s.years, label: "Years of data", note: `${s.firstYear}–${s.lastYear}` },
  ];
}

function StatStrip({ data }: { data: LandingStats }) {
  return (
    <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-hairline bg-hairline lg:grid-cols-4">
      {stats(data).map((s) => (
        <div key={s.label} className="flex flex-col gap-1 bg-space-1/90 px-5 py-4 lg:px-6 lg:py-5">
          <dt className="meta order-2 text-gold">{s.label}</dt>
          <dd className="order-1 m-0 text-[36px] leading-none font-bold tracking-[-0.03em] tabular-nums lg:text-[44px]">
            {s.value}
          </dd>
          <dd className="order-3 m-0 text-[13px] leading-[1.4] text-secondary">{s.note}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CasesSection({ cards, stats: data }: { cards: CaseCardData[]; stats: LandingStats }) {
  return (
    <section id="cases" className="flex scroll-mt-4 flex-col gap-5 px-5 pt-4 lg:gap-8 lg:px-[120px] lg:pt-10">
      <div className="flex flex-col gap-2.5">
        <span className="meta text-gold">Open cases</span>
        <h2 className="m-0 text-[26px] leading-[1.15] font-bold tracking-[-0.025em] lg:text-[32px]">
          Every case, with its verdict
        </h2>
      </div>
      <StatStrip data={data} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {cards.map((card) => (
          <CaseCard key={card.id} data={card} className="lg:min-h-[260px]" />
        ))}
      </div>
    </section>
  );
}
