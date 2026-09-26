// Terra vs Aqua: the same night temperature seen by two satellites. Flagged rows are where they agree
// on the direction but not on the size of the trend. Below 560 px each point is a stacked card.
import type { CaseFlag } from "@/lib/case-data";
import { plural } from "@/lib/format";
import { shortPointName, type AgreementRow } from "@/lib/case-sections";

import { DetectorIcon } from "../ui/icons";

type Props = { rows: AgreementRow[]; flags: CaseFlag[]; span: string };

const FLAGGED_ROW = "bg-moderate/8";

function Check({ row }: { row: AgreementRow }) {
  if (row.flagged) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-moderate-soft">
        <DetectorIcon size={13} color="#ffb020" />
        Sizes differ
      </span>
    );
  }
  return <span className="text-[13px] text-secondary">{row.sameDirection ? "Agree" : "Directions differ"}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="meta text-tertiary">{label}</dt>
      <dd className="m-0 text-[15px] text-label tabular-nums">{value}</dd>
    </div>
  );
}

function Cards({ rows }: { rows: AgreementRow[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 min-[560px]:hidden">
      {rows.map((r) => (
        <li
          key={r.id}
          className={`flex flex-col gap-3 rounded-tile border border-hairline px-4 py-3 ${r.flagged ? FLAGGED_ROW : ""}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[15px] font-medium text-label">{shortPointName(r.name)}</span>
            <Check row={r} />
          </div>
          <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2">
            <Stat label="Terra, °C / decade" value={r.terra} />
            <Stat label="Aqua, °C / decade" value={r.aqua} />
            <Stat label="Months compared" value={String(r.months)} />
            <Stat label="Years" value={r.years} />
            <Stat label="Monthly match (r)" value={r.correlation} />
          </dl>
        </li>
      ))}
    </ul>
  );
}

function Table({ rows }: { rows: AgreementRow[] }) {
  return (
    <div className="hidden overflow-x-auto min-[560px]:block">
      <table className="w-full border-collapse text-left text-[14px] tabular-nums">
        <thead>
          <tr className="meta text-tertiary">
            <th className="py-2 pr-4 pl-3 font-normal">Point</th>
            <th className="py-2 pr-4 text-right font-normal">Terra, °C / decade</th>
            <th className="py-2 pr-4 text-right font-normal">Aqua, °C / decade</th>
            <th className="py-2 pr-4 text-right font-normal">Months</th>
            <th className="py-2 pr-4 text-right font-normal">Monthly match (r)</th>
            <th className="py-2 pr-4 font-normal">Years</th>
            <th className="py-2 font-normal">Check</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={`border-t border-hairline ${r.flagged ? FLAGGED_ROW : ""}`}>
              <td className="py-3 pr-4 pl-3 font-medium text-label">{r.name}</td>
              <td className="py-3 pr-4 text-right text-label">{r.terra}</td>
              <td className="py-3 pr-4 text-right text-label">{r.aqua}</td>
              <td className="py-3 pr-4 text-right text-secondary">{r.months}</td>
              <td className="py-3 pr-4 text-right text-secondary">{r.correlation}</td>
              <td className="py-3 pr-4 text-secondary">{r.years}</td>
              <td className="py-3">
                <Check row={r} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AgreementBlock({ rows, flags, span }: Props) {
  const agree = rows.filter((r) => r.sameDirection).length;
  return (
    <section className="glass-card flex flex-col gap-5 p-6 lg:p-8" aria-labelledby="agreement-title">
      <div className="flex flex-col gap-2">
        <span className="meta text-gold">Cross-check · two satellites</span>
        <h3 id="agreement-title" className="m-0 text-title-3">
          Do Terra and Aqua agree?
        </h3>
        <p className="m-0 text-[14px] leading-[1.5] text-tertiary">
          Uses only months both satellites observed ({span}), so the rates differ from the exhibits above, which use
          Terra’s full record.
        </p>
        <p className="m-0 max-w-[680px] text-body text-secondary">
          Two NASA satellites pass over at different times of night. They agree on the direction at {agree} of{" "}
          {plural(rows.length, "point")}. Where they disagree on the size, the trend is flagged: read its number with
          caution.
        </p>
      </div>
      <Cards rows={rows} />
      <Table rows={rows} />
      {flags.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {flags.map((f) => (
            <li
              key={f.point}
              className="rounded-flag border border-moderate/22 bg-moderate/8 px-3.5 py-2.5 text-[14px] leading-[1.5] text-moderate-soft"
            >
              {f.note}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
