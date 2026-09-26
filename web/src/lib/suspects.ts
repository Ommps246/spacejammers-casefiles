/**
 * "Other suspects" (cross_examination in the case JSON) and the case's count line. The lag and r come
 * from the case file (lag = months between the driver, e.g. rain, and the response, e.g. temperature;
 * pipeline/stats.py lagged_correlation); the finding is the guard-checked narration.
 */
import type { CaseFile } from "./case-data";
import { plural } from "./format";
import type { Narration } from "./narration";

const R_DECIMALS = 2;
const MINUS = "−";

export type SuspectRow = {
  name: string;
  question: string;
  lag: string;
  r: string;
  n: number;
  finding: string | null;
};

function lagWords(lag: number): string {
  return lag === 0 ? "same month" : `${plural(lag, "month")} later`;
}

/** Signed r to 2 decimals with a typographic minus (−0.21), matching the narration. */
function formatR(r: number): string {
  const text = Math.abs(r).toFixed(R_DECIMALS);
  if (Number(text) === 0) return text;
  return r < 0 ? `${MINUS}${text}` : `+${text}`;
}

/** One row per suspect with a best lag; the finding is matched to the narration by suspect name. */
export function suspectRows(c: CaseFile, narration: Narration | null): SuspectRow[] {
  return c.cross_examination.flatMap((s) => {
    if (!s.best) return [];
    const finding = narration?.suspects.find((n) => n.suspect === s.suspect)?.finding ?? null;
    return [
      { name: s.suspect, question: s.question, lag: lagWords(s.best.lag), r: formatR(s.best.r), n: s.best.n, finding },
    ];
  });
}

/** "4 exhibits · 1 other suspect checked · 1 objection on the record" (as on the case mockup); zero parts drop out. */
export function caseCountsLine(c: CaseFile, narration: Narration | null): string {
  const suspects = suspectRows(c, narration).length;
  const objections = narration?.devils_advocate ? 1 : 0;
  return [
    plural(c.evidence.length, "exhibit"),
    suspects > 0 ? `${plural(suspects, "other suspect")} checked` : null,
    objections > 0 ? `${plural(objections, "objection")} on the record` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}
