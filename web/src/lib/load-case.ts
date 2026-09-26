import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { parseCaseFile, type CaseFile } from "./case-data";
import { parseNarration, type Narration } from "./narration";

const DATA = join(process.cwd(), "public", "data");
const SAFE_ID = /^[a-z0-9-]+$/; // ids come from URLs: never let one reach the filesystem unchecked

function checkId(id: string): string {
  if (!SAFE_ID.test(id)) throw new Error(`invalid case id: ${JSON.stringify(id)}`);
  return id;
}

export async function loadCase(id: string): Promise<CaseFile> {
  const raw = await readFile(join(DATA, "cases", `${checkId(id)}.json`), "utf8");
  return parseCaseFile(JSON.parse(raw));
}

/** Narration is optional until prompt 02 has been run for a case; returns null if it isn't written yet. */
export async function loadNarration(id: string): Promise<Narration | null> {
  try {
    const raw = await readFile(join(DATA, "narration", `${checkId(id)}.json`), "utf8");
    return parseNarration(JSON.parse(raw));
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}
