// /methods: docs/METHODS.md (copied into public/data by scripts/copy-data.mjs), rendered as text, with three
// things to try built from the case files: the block shuffle (section 3), every test against the
// false-discovery bar (section 7) and the map of reference points (section 8).
// Numbered sections carry anchors (#s8 is the countryside reference rule).
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { FdrLadder } from "@/components/methods/FdrLadder";
import { PointsMap } from "@/components/methods/PointsMap";
import { SectionNav, type NavItem } from "@/components/methods/SectionNav";
import { ShuffleDemo } from "@/components/methods/ShuffleDemo";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Starfield } from "@/components/site/Starfield";
import { loadFdrFamily, loadMapPoints, loadShuffleSeries } from "@/lib/load-method-demos";
import { parseMarkdown, type Block, type Inline } from "@/lib/markdown";

const METHODS_FILE = join(process.cwd(), "public", "data", "METHODS.md");
const QUESTIONS_ID = "likely-judge-questions";

// Short names for the side rail; a section without one falls back to its heading.
const NAV_LABELS: Record<string, string> = {
  s1: "1 · Data",
  s2: "2 · Seasons",
  s3: "3 · Is it a trend?",
  s4: "4 · How big?",
  s5: "5 · When?",
  s6: "6 · Other suspects",
  s7: "7 · False alarms",
  s8: "8 · Countryside rule",
  s9: "9 · Sanity check",
  s10: "10 · The AI’s job",
  [QUESTIONS_ID]: "Judge questions",
};

function Inlines({ parts }: { parts: Inline[] }) {
  return parts.map((p, i) => {
    if (p.kind === "strong") return <strong key={i} className="font-semibold text-label">{p.text}</strong>;
    if (p.kind === "em") return <em key={i}>{p.text}</em>;
    if (p.kind === "code") return <code key={i} className="rounded bg-white/8 px-1 font-mono text-[0.9em]">{p.text}</code>;
    return <span key={i}>{p.text}</span>;
  });
}

type Section = { id: string; title: string; body: Block[] };

/** Group the document under its level-2 headings; whatever comes before the first one is the intro. */
function sections(blocks: Block[]): { title: string; intro: Block[]; list: Section[] } {
  let title = "";
  const intro: Block[] = [];
  const list: Section[] = [];
  for (const b of blocks) {
    if (b.kind === "heading" && b.level === 1) title = b.text;
    else if (b.kind === "heading") list.push({ id: b.id, title: b.text, body: [] });
    else if (list.length) list[list.length - 1].body.push(b);
    else intro.push(b);
  }
  return { title, intro, list };
}

function Body({ blocks }: { blocks: Block[] }) {
  return blocks.map((b, i) => {
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
    if (b.kind === "paragraph") {
      return (
        <p key={i} className="m-0 text-[16px] leading-[1.6] text-secondary">
          <Inlines parts={b.inlines} />
        </p>
      );
    }
    return null;
  });
}

/** "Likely judge questions": each bullet opens to its answer. The question is the bullet's leading italic. */
function Questions({ blocks }: { blocks: Block[] }) {
  const items = blocks.flatMap((b) => (b.kind === "list" ? b.items : []));
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => {
        const [question, ...answer] = item;
        return (
          <details key={i} name="judge-questions" className="glass-card group px-4 lg:px-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[16px] font-semibold tracking-[-0.01em] text-label [&::-webkit-details-marker]:hidden">
              <span>{question.text.replace(/^"|"$/g, "")}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0 text-gold transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none">
                <path d="M7 1 V13 M1 7 H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </summary>
            <p className="m-0 pb-4 text-[16px] leading-[1.6] text-secondary">
              <Inlines parts={answer} />
            </p>
          </details>
        );
      })}
    </div>
  );
}

export default async function MethodsPage() {
  const [source, family, shuffles, points] = await Promise.all([
    readFile(METHODS_FILE, "utf8"),
    loadFdrFamily(),
    loadShuffleSeries(),
    loadMapPoints(),
  ]);
  const doc = sections(parseMarkdown(source));
  const demos: Record<string, React.ReactNode> = {
    s3: <ShuffleDemo series={shuffles} />,
    s7: <FdrLadder tests={family} />,
    s8: <PointsMap points={points} />,
  };
  const nav: NavItem[] = doc.list.map((s) => ({ id: s.id, label: NAV_LABELS[s.id] ?? s.title, demo: s.id in demos }));

  return (
    <div className="relative isolate flex min-h-full flex-col overflow-x-clip">
      <Starfield />
      <SiteHeader active="Method" />
      <main className="mx-auto grid w-full max-w-[1080px] grid-cols-[minmax(0,1fr)] gap-x-12 px-4 pb-12 lg:grid-cols-[200px_minmax(0,760px)] lg:px-10 lg:py-16">
        <SectionNav items={nav} />
        <div className="flex min-w-0 flex-col gap-4 pt-8 lg:pt-0">
          <h1 className="m-0 mb-2 text-title-2">{doc.title}</h1>
          <Body blocks={doc.intro} />
          <p className="m-0 flex items-start gap-2 text-[14px] text-secondary">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
            Sections 3, 7 and 8 have something to try, built from the real case files.
          </p>
          {doc.list.map((s) => (
            <section key={s.id} id={s.id} className="group flex scroll-mt-16 flex-col gap-4 pt-8 lg:scroll-mt-8" aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`} className="m-0 text-[24px] font-[650] tracking-[-0.02em] group-target:text-gold-soft">
                {s.title}
              </h2>
              {s.id === QUESTIONS_ID ? <Questions blocks={s.body} /> : <Body blocks={s.body} />}
              {demos[s.id]}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
