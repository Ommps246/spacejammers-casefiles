// Land cover in 2001 vs 2024, one row per satellite point. A changed class is the one gold row.
// Below 560 px the table becomes stacked cards (no sideways scrolling); only one layout is ever displayed.
import Link from "next/link";

import type { LandCover } from "@/lib/case-data";
import { shortPointName, type LandCoverRow } from "@/lib/case-sections";

type Props = {
  landCover: LandCover;
  rows: LandCoverRow[];
  related?: { href: string; label: string };
};

const ROLE_WORDS: Record<string, string> = {
  city: "City",
  "urban edge": "Urban edge",
  "countryside control": "Countryside control",
};

const roleWord = (role: string | null) => (role ? (ROLE_WORDS[role] ?? role) : "–");
const CHANGED_ROW = "bg-gold/10 shadow-[inset_3px_0_0_var(--color-gold)]";

function ClassCell({ name, changed }: { name: string; changed: boolean }) {
  return <span className={changed ? "font-semibold text-gold-soft" : "text-label"}>{name}</span>;
}

function Arrow({ changed }: { changed: boolean }) {
  return (
    <span className={changed ? "text-gold" : "text-tertiary"} aria-label="to">
      →
    </span>
  );
}

function Cards({ rows }: { rows: LandCoverRow[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 min-[560px]:hidden">
      {rows.map((r) => (
        <li
          key={r.id}
          className={`flex flex-col gap-1.5 rounded-tile border border-hairline px-4 py-3 ${r.changed ? CHANGED_ROW : ""}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-[15px] font-medium text-label">{shortPointName(r.name)}</span>
            <span className="text-[13px] text-secondary">{roleWord(r.role)}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[14px]">
            <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
              <span className="meta text-tertiary">2001</span>
              <ClassCell name={r.from} changed={r.changed} />
              <Arrow changed={r.changed} />
            </span>
            <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
              <span className="meta text-tertiary">2024</span>
              <ClassCell name={r.to} changed={r.changed} />
              {r.changed && <span className="meta text-gold">Changed</span>}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Table({ rows }: { rows: LandCoverRow[] }) {
  return (
    <div className="hidden overflow-x-auto min-[560px]:block">
      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="meta text-tertiary">
            <th className="py-2 pr-4 pl-3 font-normal">Point</th>
            <th className="py-2 pr-4 font-normal">Role</th>
            <th className="py-2 pr-4 font-normal">2001</th>
            <th className="py-2 pr-4 font-normal" aria-hidden="true" />
            <th className="py-2 font-normal">2024</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={`border-t border-hairline ${r.changed ? CHANGED_ROW : ""}`}>
              <td className="py-3 pr-4 pl-3 font-medium text-label">{r.name}</td>
              <td className="py-3 pr-4 text-secondary">{roleWord(r.role)}</td>
              <td className="py-3 pr-4">
                <ClassCell name={r.from} changed={r.changed} />
              </td>
              <td className="py-3 pr-4" aria-hidden="true">
                <Arrow changed={r.changed} />
              </td>
              <td className="py-3">
                <ClassCell name={r.to} changed={r.changed} />
                {r.changed && <span className="meta ml-2 text-gold">Changed</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LandCoverBlock({ landCover, rows, related }: Props) {
  return (
    <section className="glass-card flex flex-col gap-5 p-6 lg:p-8" aria-labelledby="land-cover-title">
      <div className="flex flex-col gap-2">
        <span className="meta text-gold">{landCover.source_note}</span>
        <h3 id="land-cover-title" className="m-0 text-title-3">
          {landCover.label}
        </h3>
        <p className="m-0 max-w-[640px] text-body text-secondary">{landCover.plain}.</p>
      </div>
      <Cards rows={rows} />
      <Table rows={rows} />
      {related && (
        <Link href={related.href} className="self-start text-[14px] font-medium text-gold-soft hover:underline">
          {related.label} →
        </Link>
      )}
    </section>
  );
}
