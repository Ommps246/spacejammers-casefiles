// Other suspects (design/Case-Desktop.dc.html): signals checked against the trend by lagged correlation.
// The "Correlation, not causation" tag is always shown: these numbers say two things move together, never why.
import { plural } from "@/lib/format";
import type { SuspectRow } from "@/lib/suspects";

const NO_FINDING = "No plain-English finding written for this suspect yet.";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="meta text-tertiary">{label}</dt>
      <dd className="m-0 text-[15px] text-label tabular-nums">{value}</dd>
    </div>
  );
}

function SuspectCard({ row, index }: { row: SuspectRow; index: number }) {
  return (
    <article className="glass-card flex flex-col gap-3.5 p-6 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="meta text-gold">Suspect {index + 1} · checked</span>
        <span className="rounded-full border border-hairline bg-white/6 px-2.5 py-1 text-[12px] font-semibold text-secondary">
          Correlation, not causation
        </span>
      </div>
      <h3 className="m-0 text-[22px] leading-[1.2] font-[650] tracking-[-0.015em]">{row.name}</h3>
      <p className="m-0 text-body text-secondary">{row.question}</p>
      <dl className="m-0 flex flex-wrap gap-x-8 gap-y-2">
        <Stat label="Best match" value={row.lag} />
        <Stat label="Correlation (r)" value={row.r} />
        <Stat label="Compared" value={plural(row.n, "month")} />
      </dl>
      <p className="m-0 text-[16px] leading-[1.55] text-label">{row.finding ?? NO_FINDING}</p>
    </article>
  );
}

export function SuspectsSection({ rows }: { rows: SuspectRow[] }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="suspects-title">
      <div className="flex flex-col gap-2">
        <span className="meta text-gold">Other suspects · {plural(rows.length, "suspect")} checked</span>
        <h2 id="suspects-title" className="m-0 text-title-2">
          What else could explain it?
        </h2>
        <p className="m-0 max-w-[680px] text-body text-secondary">
          We line each suspect up with the trend month by month. A match shows the two move together, not that one
          causes the other.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row, i) => (
          <SuspectCard key={row.name} row={row} index={i} />
        ))}
      </div>
    </section>
  );
}
