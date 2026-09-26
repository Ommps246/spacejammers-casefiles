// Strength labels: icon + word + colour, never colour alone (Components · Strength labels).
import type { Strength } from "@/lib/case-data";
import type { StrengthKind } from "@/lib/evidence-view";

import { StrengthIcon } from "./icons";

export const STRENGTH_WORDS: Record<StrengthKind, string> = {
  strong: "Strong",
  moderate: "Moderate",
  inconclusive: "Inconclusive",
  lead: "Lead, not a finding",
};

const TONE: Record<StrengthKind, string> = {
  strong: "bg-strong/12 border-strong/32 text-strong",
  moderate: "bg-moderate/12 border-moderate/32 text-moderate",
  inconclusive: "bg-inconclusive/14 border-inconclusive/38 text-inconclusive-soft",
  lead: "bg-gold/10 border-gold/38 text-gold-soft",
};

// A lead with a known signal says how strong it is: "Lead · strong signal", "Lead · no clear signal".
const LEAD_SIGNAL_WORDS: Record<Strength, string> = {
  strong: "Lead · strong signal",
  moderate: "Lead · moderate signal",
  inconclusive: "Lead · no clear signal",
};

/** The label text: a lead's signal when it has one, otherwise the plain strength word. */
export function strengthWords(kind: StrengthKind, signal?: Strength): string {
  return kind === "lead" && signal ? LEAD_SIGNAL_WORDS[signal] : STRENGTH_WORDS[kind];
}

type Props = { kind: StrengthKind; size?: "sm" | "md"; signal?: Strength };

export function StrengthLabel({ kind, size = "sm", signal }: Props) {
  const box = size === "sm" ? "py-1 pr-[9px] pl-[7px] text-[12px]" : "py-[5px] pr-2.5 pl-2 text-[13px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold tracking-[-0.005em] ${box} ${TONE[kind]}`}
    >
      <StrengthIcon kind={kind} size={size === "sm" ? 13 : 14} />
      {strengthWords(kind, signal)}
    </span>
  );
}

const FILLED: Record<Exclude<StrengthKind, "lead">, number> = { strong: 3, moderate: 2, inconclusive: 1 };
const BAR: Record<Exclude<StrengthKind, "lead">, string> = {
  strong: "bg-strong",
  moderate: "bg-moderate",
  inconclusive: "bg-inconclusive",
};

/** Three-segment meter: strong 3/3, moderate 2/3, inconclusive 1/3. */
export function StrengthMeter({ kind }: { kind: Exclude<StrengthKind, "lead"> }) {
  const filled = FILLED[kind];
  return (
    <div className="flex w-[84px] gap-1" role="img" aria-label={`Strength ${filled} of 3`}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={`h-1 flex-1 rounded-[2px] ${i < filled ? BAR[kind] : "bg-white/10"}`} />
      ))}
    </div>
  );
}
