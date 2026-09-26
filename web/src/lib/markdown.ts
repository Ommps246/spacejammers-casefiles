/**
 * Just enough Markdown for docs/METHODS.md: headings, paragraphs, bullet lists, and inline bold,
 * italic and code. Returns plain data; the page renders it as React text (never raw HTML).
 * Numbered headings ("## 8. …") get the anchor id "s8", so the case page can link to /methods#s8.
 */
export type Inline = { kind: "text" | "strong" | "em" | "code"; text: string };

export type Block =
  | { kind: "heading"; level: 1 | 2; id: string; text: string }
  | { kind: "paragraph"; inlines: Inline[] }
  | { kind: "list"; items: Inline[][] };

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/;

export function parseInline(text: string): Inline[] {
  return text
    .split(INLINE)
    .filter((part) => part !== "")
    .map((part): Inline => {
      if (part.startsWith("**") && part.endsWith("**")) return { kind: "strong", text: part.slice(2, -2) };
      if (part.startsWith("`") && part.endsWith("`")) return { kind: "code", text: part.slice(1, -1) };
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return { kind: "em", text: part.slice(1, -1) };
      return { kind: "text", text: part };
    });
}

function headingId(text: string): string {
  const numbered = /^(\d+)\./.exec(text);
  if (numbered) return `s${numbered[1]}`;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", inlines: parseInline(paragraph.join(" ")) });
    if (list.length) blocks.push({ kind: "list", items: list.map(parseInline) });
    paragraph = [];
    list = [];
  };
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    const heading = /^(#{1,2})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const text = heading[2];
      blocks.push({ kind: "heading", level: heading[1].length as 1 | 2, id: headingId(text), text });
    } else if (line.startsWith("- ")) {
      if (paragraph.length) flush();
      list = [...list, line.slice(2)];
    } else if (line === "") {
      flush();
    } else if (list.length) {
      list = [...list.slice(0, -1), `${list[list.length - 1]} ${line}`];
    } else {
      paragraph = [...paragraph, line];
    }
  }
  flush();
  return blocks;
}
