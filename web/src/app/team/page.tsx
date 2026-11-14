// /team: who built Case Files, how AI was used (and where it wasn't), the NASA datasets behind it, and
// credits for everything else we used (#credits). Names come from the README; the dataset list is read from
// the case files, so it can't drift from the cases.
import Link from "next/link";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Starfield } from "@/components/site/Starfield";
import type { Dataset } from "@/lib/case-data";
import { FEATURED_CASE, GRID_CASES } from "@/lib/landing";
import { loadCase } from "@/lib/load-case";
import { WITNESSES } from "@/lib/witnesses";

const REPO = "https://github.com/Ommps246/spacejammers-casefiles";
const TEAM = ["Om Mishra", "Anik Paul", "Ashutosh Dash"] as const;

const AI_RULES = [
  {
    title: "AI writes the words, never the numbers",
    body: "Every statistic is computed by our Python pipeline from NASA data. The AI only turns the finished case file into plain English: the verdict, the captions and the Devil’s Advocate objection.",
    href: "/methods#s10",
    link: "Method, section 10",
  },
  {
    title: "A guard checks every sentence",
    body: "Before any AI-written text reaches the site, a script compares each number in it with the case file. One figure that isn’t there, and the text is rejected.",
    href: `${REPO}/blob/main/pipeline/guard.py`,
    link: "pipeline/guard.py",
  },
  {
    title: "Claude Code as our coding assistant",
    body: "We took assistance from Claude Code to generate much of the code, from prompts we wrote; we reviewed, edited and tested it. The prompts are in the repository, next to tests that plant a known trend and check the detector finds it, and that it rarely raises a false alarm on noise.",
    href: `${REPO}/tree/main/prompts`,
    link: "The prompts",
  },
] as const;

type Credit = { what: string; credit: string; url?: string };

// Everything on the site that we didn't make ourselves, apart from the NASA datasets listed above.
const CREDITS: readonly { group: string; items: readonly Credit[] }[] = [
  {
    group: "Images and 3D models",
    items: [
      ...WITNESSES.map((w) => ({ what: `${w.name} satellite 3D model`, credit: w.modelCredit.label, url: w.modelCredit.url })),
      {
        what: "Earth image on the globe",
        credit: "NASA Blue Marble (NASA Visible Earth), copied from the three-globe example images",
        url: "https://github.com/vasturiano/three-globe",
      },
    ],
  },
  {
    group: "Methods we rely on",
    items: [
      { what: "Trend test", credit: "Mann (1945); Kendall (1975)" },
      { what: "Trend size", credit: "Sen (1968), Journal of the American Statistical Association" },
      { what: "Block-bootstrap trend test", credit: "Kundzewicz & Robson (2004), Hydrological Sciences Journal; Önöz & Bayazit (2012), Hydrological Processes" },
      { what: "Change-point test", credit: "Pettitt (1979), Applied Statistics" },
      { what: "Candidate change points (PELT)", credit: "Killick, Fearnhead & Eckley (2012), Journal of the American Statistical Association" },
      { what: "False-discovery control", credit: "Benjamini & Hochberg (1995), Journal of the Royal Statistical Society B" },
      { what: "Global temperature record", credit: "Lenssen et al. (2019), JGR Atmospheres", url: "https://doi.org/10.1029/2018JD029522" },
      { what: "Heavy-rain threshold (64.5 mm a day)", credit: "India Meteorological Department" },
    ],
  },
  {
    group: "Open-source software",
    items: [
      { what: "Data pipeline", credit: "Python, pandas, NumPy, SciPy, pymannkendall, ruptures, requests, pytest" },
      { what: "Website", credit: "Next.js, React, three.js, React Three Fiber, drei, Framer Motion, Observable Plot, Tailwind CSS, Vitest" },
      { what: "3D model optimisation", credit: "glTF Transform", url: "https://gltf-transform.dev/" },
      { what: "Satellite data access", credit: "NASA AppEEARS (LP DAAC) with a NASA Earthdata login", url: "https://appeears.earthdatacloud.nasa.gov/" },
    ],
  },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("");

async function datasets(): Promise<Dataset[]> {
  const cases = await Promise.all([FEATURED_CASE, ...GRID_CASES].map(loadCase));
  const byName = new Map(cases.flatMap((c) => c.datasets).map((d) => [d.short_name, d]));
  return [...byName.values()].sort((a, b) => a.short_name.localeCompare(b.short_name));
}

const external = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

export default async function TeamPage() {
  const data = await datasets();
  return (
    <div className="relative isolate flex min-h-full flex-col overflow-x-clip">
      <Starfield />
      <SiteHeader active="Team" />
      <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-14 px-4 py-12 lg:px-10 lg:py-16">
        <header className="flex max-w-[760px] flex-col gap-4">
          <span className="meta text-gold">The team</span>
          <h1 className="m-0 text-[40px] leading-[1.05] font-bold tracking-[-0.032em] lg:text-title-1">SpaceJammers</h1>
          <p className="m-0 text-body text-secondary">
            NASA Space Apps Challenge 2026, Chennai. Our challenge: <span className="text-label">Be An Earth System Trend Detective!</span>
          </p>
          <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 pt-2 sm:gap-3">
            {TEAM.map((name) => (
              <li key={name} className="glass-card flex flex-col items-start gap-3 p-4">
                <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full border border-gold/40 bg-navy font-mono text-[15px] font-bold text-gold-pale">
                  {initials(name)}
                </span>
                <span className="text-[16px] font-semibold tracking-[-0.01em]">{name}</span>
              </li>
            ))}
          </ul>
        </header>

        <section className="flex flex-col gap-5" aria-labelledby="ai-title">
          <div className="flex flex-col gap-2">
            <span className="meta text-gold">How we used AI</span>
            <h2 id="ai-title" className="m-0 text-title-3">
              A narrator on a short leash
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {AI_RULES.map((rule, i) => (
              <article key={rule.title} className="glass-card flex flex-col gap-3 p-5">
                <span className="meta text-gold normal-case">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="m-0 text-[18px] font-semibold tracking-[-0.01em]">{rule.title}</h3>
                <p className="m-0 text-[15px] leading-[1.55] text-secondary">{rule.body}</p>
                <Link href={rule.href} {...external(rule.href)} className="mt-auto inline-flex min-h-11 items-center self-start text-[14px] font-semibold text-gold-soft hover:underline">
                  {rule.link} →
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-5" aria-labelledby="data-title">
          <div className="flex flex-col gap-2">
            <span className="meta text-gold">The NASA data</span>
            <h2 id="data-title" className="m-0 text-title-3">
              {data.length} datasets, every one open to anyone
            </h2>
          </div>
          <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
            {data.map((d) => (
              <li key={d.short_name} className="flex">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="glass-card flex min-h-[76px] w-full flex-col justify-center gap-1 px-5 py-3.5 transition-colors duration-200 hover:border-gold/50">
                  <span className="text-[16px] font-semibold tracking-[-0.01em] text-label">{d.short_name} ↗</span>
                  <span className="text-[13px] text-secondary">{d.provider}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section id="credits" className="flex scroll-mt-6 flex-col gap-5" aria-labelledby="credits-title">
          <div className="flex flex-col gap-2">
            <span className="meta text-gold">Credits</span>
            <h2 id="credits-title" className="m-0 text-title-3">
              Everything else we used
            </h2>
            <p className="m-0 max-w-[760px] text-[15px] leading-[1.55] text-secondary">
              Our own code and text are open source under the Apache 2.0 licence. The NASA data, images and 3D models
              belong to NASA and are used as published.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {CREDITS.map((g) => (
              <div key={g.group} className="glass-card flex flex-col gap-3 p-5">
                <h3 className="meta m-0 text-gold">{g.group}</h3>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {g.items.map((c) => (
                    <li key={c.what} className="flex flex-col gap-0.5 border-t border-hairline pt-3 first:border-0 first:pt-0">
                      <span className="text-[14px] font-semibold text-label">{c.what}</span>
                      <span className="text-[13px] leading-[1.5] text-secondary">
                        {c.url ? (
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-gold-soft hover:underline">
                            {c.credit} ↗
                          </a>
                        ) : (
                          c.credit
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap gap-3" aria-label="More">
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-gold bg-gold px-5 text-[15px] font-semibold text-space-1">
            The code on GitHub ↗
          </a>
          <Link href="/methods" className="inline-flex min-h-11 items-center rounded-full border border-hairline bg-white/6 px-5 text-[15px] font-semibold text-label">
            How we test a trend
          </Link>
          <Link href="/satellites" className="inline-flex min-h-11 items-center rounded-full border border-hairline bg-white/6 px-5 text-[15px] font-semibold text-label">
            Meet the satellites
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
