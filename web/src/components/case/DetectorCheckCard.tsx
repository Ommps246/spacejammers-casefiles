// Detector check: before trusting a case, the data must "see" an event everyone remembers.
// Gold outline, not a verdict colour: it says whether the instrument works, not what the trend is.
import type { FloodCheck } from "@/lib/case-sections";

import { plural } from "@/lib/format";

import { DetectorIcon } from "../ui/icons";

export function DetectorCheckCard({ check }: { check: FloodCheck }) {
  const status = check.passed ? "passed" : "not passed";
  return (
    <aside
      className="flex flex-col gap-3 rounded-card border border-gold/50 bg-gold/5 p-6 lg:p-8"
      aria-label={`Detector check ${status}`}
    >
      <span className="meta inline-flex items-center gap-2 text-gold">
        <DetectorIcon size={14} />
        Detector check · {status}
      </span>
      <p className="m-0 text-[22px] leading-[1.25] font-[650] tracking-[-0.015em]">{check.question}</p>
      <p className="m-0 max-w-[720px] text-body text-secondary">
        {check.passed ? "Yes: " : "Not clearly: "}
        in this data, November–December 2015 ranks <span className="text-label tabular-nums">
          #{check.rank}
        </span> of <span className="tabular-nums">{plural(check.years, "year")}</span> for rain in those two months (
        <span className="tabular-nums">{check.mm}</span> mm). A check on the instrument, not a verdict on the trend.
      </p>
    </aside>
  );
}
