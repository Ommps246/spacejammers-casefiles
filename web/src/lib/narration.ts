/**
 * data/narration/<id>.json (prompts/02-narration.md): plain-English copy written from the case file
 * and checked by pipeline/guard.py. Optional fields are the extra lines the case page mockup uses.
 */
export type Narration = {
  case_id: string;
  headline: string;
  summary: string;
  verdict: string;
  evidence_notes: Record<string, string>;
  suspects: { suspect: string; description: string; finding: string }[];
  devils_advocate: string;
  devils_advocate_note: string;
  can_say: string;
  what_data_cannot_tell_us: string;
  would_change_it: string;
  next_witness: string;
};

const TEXT_FIELDS = [
  "case_id",
  "headline",
  "summary",
  "verdict",
  "devils_advocate",
  "devils_advocate_note",
  "can_say",
  "what_data_cannot_tell_us",
  "would_change_it",
  "next_witness",
] as const;

type Json = Record<string, unknown>;
const isObject = (x: unknown): x is Json => typeof x === "object" && x !== null && !Array.isArray(x);

export function parseNarration(raw: unknown): Narration {
  if (!isObject(raw)) throw new Error("narration: must be an object");
  const text = Object.fromEntries(
    TEXT_FIELDS.map((k) => {
      if (typeof raw[k] !== "string") throw new Error(`narration: "${k}" must be a string`);
      return [k, raw[k]];
    }),
  ) as Pick<Narration, (typeof TEXT_FIELDS)[number]>;
  const notes = isObject(raw.evidence_notes) ? raw.evidence_notes : {};
  const suspects = Array.isArray(raw.suspects) ? raw.suspects.filter(isObject) : [];
  return {
    ...text,
    evidence_notes: Object.fromEntries(Object.entries(notes).filter(([, v]) => typeof v === "string")) as Record<
      string,
      string
    >,
    suspects: suspects.map((s) => ({
      suspect: String(s.suspect ?? ""),
      description: String(s.description ?? ""),
      finding: String(s.finding ?? ""),
    })),
  };
}
