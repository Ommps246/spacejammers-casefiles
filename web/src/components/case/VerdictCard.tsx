// Verdict card: Inconclusive is styled as a finding: solid border, full meter, plain explanation.
import type { Strength } from "@/lib/case-data";

import { StrengthLabel, StrengthMeter } from "../ui/StrengthLabel";

const EDGE: Record<Strength, string> = {
  strong: "border-strong/32!",
  moderate: "border-moderate/32!",
  inconclusive: "border-inconclusive/38!",
};

type Props = { strength: Strength; title: string; body: string };

export function VerdictCard({ strength, title, body }: Props) {
  return (
    <div className={`glass-card flex flex-col gap-3.5 p-6 ${EDGE[strength]}`}>
      <div className="flex items-center justify-between">
        <StrengthLabel kind={strength} size="md" />
        <StrengthMeter kind={strength} />
      </div>
      <span className="text-[20px] leading-tight font-[650] tracking-[-0.015em]">{title}</span>
      <span className="text-[14px] leading-[1.55] text-secondary">{body}</span>
    </div>
  );
}
