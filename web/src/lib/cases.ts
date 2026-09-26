import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type CaseSummary = {
  case_id: string;
  question: string;
  region: string;
  topic: string;
};

const INDEX_FILE = join(process.cwd(), "public", "data", "cases", "index.json");

/** Case list written by the pipeline (copied into public/data by scripts/copy-data.mjs). */
export async function loadCaseIndex(): Promise<CaseSummary[]> {
  const parsed: unknown = JSON.parse(await readFile(INDEX_FILE, "utf8"));
  if (!Array.isArray(parsed) || !parsed.every(isCaseSummary)) {
    throw new Error(`${INDEX_FILE} does not match the expected case list shape`);
  }
  return parsed;
}

function isCaseSummary(x: unknown): x is CaseSummary {
  if (typeof x !== "object" || x === null) return false;
  const fields = x as Record<string, unknown>;
  return ["case_id", "question", "region", "topic"].every((k) => typeof fields[k] === "string");
}
