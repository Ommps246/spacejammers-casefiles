import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { parseInline, parseMarkdown } from "./markdown";

describe("parseMarkdown", () => {
  test("numbered headings get section anchors, so /methods#s8 finds the reference rule", () => {
    const blocks = parseMarkdown(readFileSync(join(__dirname, "../../../docs/METHODS.md"), "utf8"));
    const s8 = blocks.find((b) => b.kind === "heading" && b.id === "s8");
    expect(s8).toMatchObject({ kind: "heading", level: 2 });
    expect(s8?.kind === "heading" && s8.text).toMatch(/reference rule/);
  });

  test("bullets, wrapped lines and paragraphs", () => {
    const blocks = parseMarkdown("# Title\n\nOne\ntwo.\n\n- a\n  still a\n- b\n");
    expect(blocks.map((b) => b.kind)).toEqual(["heading", "paragraph", "list"]);
    expect(blocks[2]).toEqual({
      kind: "list",
      items: [[{ kind: "text", text: "a still a" }], [{ kind: "text", text: "b" }]],
    });
  });
});

describe("parseInline", () => {
  test("bold, italic and code; anything else stays text (never HTML)", () => {
    expect(parseInline("**Rule:** use `LC_Type1` in *both* <b>years</b>")).toEqual([
      { kind: "strong", text: "Rule:" },
      { kind: "text", text: " use " },
      { kind: "code", text: "LC_Type1" },
      { kind: "text", text: " in " },
      { kind: "em", text: "both" },
      { kind: "text", text: " <b>years</b>" },
    ]);
  });
});
