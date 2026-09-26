// /methods: docs/METHODS.md (copied into public/data by scripts/copy-data.mjs), rendered as text.
// Numbered sections carry anchors (#s8 is the countryside reference rule).
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Starfield } from "@/components/site/Starfield";
import { parseMarkdown, type Inline } from "@/lib/markdown";

const METHODS_FILE = join(process.cwd(), "public", "data", "METHODS.md");

function Inlines({ parts }: { parts: Inline[] }) {
  return parts.map((p, i) => {
    if (p.kind === "strong") return <strong key={i} className="font-semibold text-label">{p.text}</strong>;
    if (p.kind === "em") return <em key={i}>{p.text}</em>;
    if (p.kind === "code") return <code key={i} className="rounded bg-white/8 px-1 font-mono text-[0.9em]">{p.text}</code>;
    return <span key={i}>{p.text}</span>;
  });
}

export default async function MethodsPage() {
  const blocks = parseMarkdown(await readFile(METHODS_FILE, "utf8"));
  return (
    <div className="relative isolate flex min-h-full flex-col overflow-x-clip">
      <Starfield />
      <SiteHeader active="Method" />
      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-4 py-12 lg:py-16">
        {blocks.map((b, i) => {
          if (b.kind === "heading" && b.level === 1) {
            return <h1 key={i} id={b.id} className="m-0 mb-2 text-title-2">{b.text}</h1>;
          }
          if (b.kind === "heading") {
            return (
              <h2 key={i} id={b.id} className="m-0 mt-8 scroll-mt-6 text-[24px] font-[650] tracking-[-0.02em] target:text-gold-soft">
                {b.text}
              </h2>
            );
          }
          if (b.kind === "list") {
            return (
              <ul key={i} className="m-0 flex flex-col gap-2 pl-5 text-[16px] leading-[1.6] text-secondary">
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inlines parts={item} />
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="m-0 text-[16px] leading-[1.6] text-secondary">
              <Inlines parts={b.inlines} />
            </p>
          );
        })}
      </main>
      <SiteFooter />
    </div>
  );
}
