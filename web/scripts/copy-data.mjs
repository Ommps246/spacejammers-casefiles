// Copy the pipeline's output into public/data so the app is fully static and works offline.
// Reads ../data/{cases,narration} and ../docs/METHODS.md; never writes there. Runs before `dev` and `build`.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(WEB, "..", "data");
const TARGET = join(WEB, "public", "data");
const FOLDERS = ["cases", "narration"];

if (!existsSync(join(SOURCE, "cases", "index.json"))) {
  console.error(
    `copy-data: ${join(SOURCE, "cases", "index.json")} not found.\n` +
      "Run the pipeline first: python -m pipeline.build_cases",
  );
  process.exit(1);
}

rmSync(TARGET, { recursive: true, force: true });
for (const folder of FOLDERS) {
  const from = join(SOURCE, folder);
  const to = join(TARGET, folder);
  mkdirSync(to, { recursive: true });
  const files = existsSync(from) ? readdirSync(from).filter((f) => f.endsWith(".json")) : [];
  for (const file of files) cpSync(join(from, file), join(to, file));
  console.log(`copy-data: ${files.length} file(s) from data/${folder}`);
}

// The /methods page renders the judge-facing method notes.
const METHODS = join(WEB, "..", "docs", "METHODS.md");
if (!existsSync(METHODS)) {
  console.error(`copy-data: ${METHODS} not found.`);
  process.exit(1);
}
cpSync(METHODS, join(TARGET, "METHODS.md"));
console.log("copy-data: METHODS.md from docs/");
