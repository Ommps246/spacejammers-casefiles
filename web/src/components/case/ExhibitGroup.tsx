"use client";
// A group of exhibits. Collapsible groups are decided by CSS alone, so first paint is right at every width:
// at ≥ 768 px (md) the body always shows and the toggle is hidden; below it the body starts collapsed,
// with a real <button aria-expanded> to open it and the exhibits' verdict badges shown while closed.
// No JavaScript runs on load; state only changes when the reader presses the button.
import { useId, useState } from "react";

import type { EvidenceGroup } from "@/lib/case-sections";

import { StrengthLabel } from "../ui/StrengthLabel";

type Props = { group: EvidenceGroup; children: React.ReactNode };

function Heading({ group, id }: { group: EvidenceGroup; id?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 id={id} className="m-0 text-[22px] font-[650] tracking-[-0.015em]">
        {group.title}
      </h3>
      <p className="m-0 text-[15px] text-secondary">{group.hint}</p>
    </div>
  );
}

function Badges({ group }: { group: EvidenceGroup }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0 md:hidden" aria-label="Verdict per exhibit">
      {group.badges.map((b) => (
        <li
          key={b.id}
          className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white/4 py-1 pr-1 pl-3"
        >
          <span className="text-[13px] text-label">{b.name}</span>
          <StrengthLabel kind={b.strength} signal={b.signal} />
        </li>
      ))}
    </ul>
  );
}

export function ExhibitGroup({ group, children }: Props) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const headingId = useId();

  if (!group.collapsible) {
    return (
      <div className="flex flex-col gap-4">
        {group.key !== "all" && <Heading group={group} />}
        {children}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby={headingId}>
      <div className="flex items-start justify-between gap-4">
        <Heading group={group} id={headingId} />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-white/6 px-3.5 text-[13px] font-medium text-gold-soft md:hidden"
        >
          {open ? "Hide" : `Show ${group.views.length}`}
          <span aria-hidden="true" className={open ? "rotate-180" : ""}>
            ▾
          </span>
        </button>
      </div>
      {!open && <Badges group={group} />}
      <div id={bodyId} className={`${open ? "block" : "hidden"} md:block`}>
        {children}
      </div>
    </section>
  );
}
