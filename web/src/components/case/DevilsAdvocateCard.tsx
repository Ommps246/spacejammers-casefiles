// Devil's Advocate card: muted red edge; enters from the right as an objection (Components).
import { ObjectionIcon } from "../ui/icons";

type Props = { objection: string; note?: string; className?: string };

export function DevilsAdvocateCard({ objection, note, className = "" }: Props) {
  return (
    <aside className={`objection-card flex flex-col gap-3.5 p-7 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-objection-soft">
          <ObjectionIcon />
          Devil’s Advocate
        </span>
        <span className="meta text-objection-soft">Objection</span>
      </div>
      <p className="m-0 text-[20px] leading-normal font-medium tracking-[-0.01em] text-label">{objection}</p>
      {note && <p className="m-0 text-[14px] leading-[1.55] text-secondary">{note}</p>}
    </aside>
  );
}
