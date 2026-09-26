// Case page (design/Case-Desktop.dc.html): question → headline finding → summary chart or detector check →
// exhibits (grouped by role on the satellite cases) → land cover → Terra/Aqua check → other suspects → Devil's Advocate →
// verdict → sources. Each section appears only when the case file has what it needs.
// Every number comes from data/cases (formatted by lib/format.ts) or guard-checked data/narration.
import Link from "next/link";

import { AgreementBlock } from "@/components/case/AgreementBlock";
import { DetectorCheckCard } from "@/components/case/DetectorCheckCard";
import { DevilsAdvocateCard } from "@/components/case/DevilsAdvocateCard";
import { EvidenceCard } from "@/components/case/EvidenceCard";
import { ExhibitGroup } from "@/components/case/ExhibitGroup";
import { LandCoverBlock } from "@/components/case/LandCoverBlock";
import { OneToWatch } from "@/components/case/OneToWatch";
import { PointDotPlot } from "@/components/case/PointDotPlot";
import { SuspectsSection } from "@/components/case/SuspectsSection";
import { VerdictCard } from "@/components/case/VerdictCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Starfield } from "@/components/site/Starfield";
import { StrengthLabel } from "@/components/ui/StrengthLabel";
import type { CaseFile } from "@/lib/case-data";
import {
  agreementRows,
  agreementSpan,
  dotPlotCaption,
  farmlandGapSentence,
  floodCheck,
  groupEvidence,
  landCoverRows,
  oneToWatch,
  pointDots,
  referenceComparison,
  strengthTally,
  type PointDot,
} from "@/lib/case-sections";
import { loadCaseIndex, type CaseSummary } from "@/lib/cases";
import { buildEvidenceViews, caseVerdict } from "@/lib/evidence-view";
import { plural } from "@/lib/format";
import { loadCase, loadNarration } from "@/lib/load-case";
import type { Narration } from "@/lib/narration";
import { caseCountsLine, suspectRows } from "@/lib/suspects";

export const dynamicParams = false; // only the cases the pipeline wrote

export async function generateStaticParams() {
  const index = await loadCaseIndex();
  return index.map((c) => ({ id: c.case_id }));
}

const TOPIC_WORDS: Record<string, string> = {
  heat: "Temperature",
  rain: "Rain",
  greenery: "Greenery",
  "night-heat": "Night heat",
};

function yearSpan(c: CaseFile): string {
  const trends = c.evidence.filter((e) => e.kind === "trend");
  if (trends.length === 0) return "";
  const first = trends.map((e) => e.stats.start).sort()[0];
  const last = trends.map((e) => e.stats.end).sort()[trends.length - 1];
  return `${first.slice(0, 4)}–${last.slice(0, 4)}`;
}

// Night heat and greenery look at the same satellite points, so each links to the other.
const COMPANION_TOPIC: Record<string, string> = {
  "night-heat": "greenery",
  greenery: "night-heat",
};
const COMPANION_LINK_LABEL: Record<string, string> = {
  greenery: "Same points in the greenery case",
  "night-heat": "Same points in the night-heat case",
};

// The dot plot's x-axis and unit, per topic.
const DOT_AXIS: Record<string, { label: string; unit: string }> = {
  "night-heat": {
    label: "Night warming, °C per decade →",
    unit: "°C per decade",
  },
  greenery: {
    label: "← browning · greenness (NDVI) change per decade · greening →",
    unit: "NDVI per decade",
  },
};

async function companionCase(c: CaseFile, index: CaseSummary[]): Promise<CaseFile | null> {
  const topic = COMPANION_TOPIC[c.topic];
  if (!topic || !c.land_cover) return null;
  const id = `${c.region.id}-${topic}`;
  return index.some((x) => x.case_id === id) ? loadCase(id) : null;
}

// Air temperature on a ~50 km grid points to the sharper satellite night-heat case, when the region has one.
function nextWitnessLink(c: CaseFile, index: CaseSummary[]): { href: string; label: string } | undefined {
  const id = `${c.region.id}-night-heat`;
  if (c.topic !== "heat" || !index.some((x) => x.case_id === id)) return undefined;
  return { href: `/case/${id}`, label: "See the night-heat case" };
}

type SummaryChart = {
  dots: PointDot[];
  caption: string;
  axisLabel: string;
  unit: string;
  eyebrow: string;
  reference?: { name: string; value: number; label: string };
};

const PLANET_AXIS = "Air temperature trend, °C per decade →";

/** Satellite cases: one dot per point. Heat cases: the region against the planet line. Otherwise none. */
function summaryChart(c: CaseFile): SummaryChart | null {
  const dots = pointDots(c);
  const axis = DOT_AXIS[c.topic];
  if (dots.length > 0 && axis) {
    const eyebrow = "At a glance · every point";
    return { dots, caption: dotPlotCaption(dots, c.topic), axisLabel: axis.label, unit: axis.unit, eyebrow };
  }
  const cmp = referenceComparison(c);
  if (!cmp) return null;
  const eyebrow = "At a glance · compared with the whole planet";
  return { ...cmp, axisLabel: PLANET_AXIS, unit: "°C per decade", eyebrow };
}

function SectionHead({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="meta text-gold">{eyebrow}</span>
      <h2 className="m-0 text-title-2">{title}</h2>
      {hint && <p className="m-0 max-w-[680px] text-body text-secondary">{hint}</p>}
    </div>
  );
}

type HeadlineProps = {
  c: CaseFile;
  narration: Narration | null;
  /** A sentence computed from the case file, shown after the narration's summary. */
  derived: string | null;
  lines: string[];
};

function HeadlineFinding({ c, narration, derived, lines }: HeadlineProps) {
  return (
    <section className="glass-card flex flex-col gap-3 p-6 lg:p-8" aria-label="Headline finding">
      <div className="flex flex-wrap items-center gap-3">
        <span className="meta text-gold">Headline finding</span>
        <StrengthLabel kind={caseVerdict(c)} size="md" />
      </div>
      <p className="m-0 text-[28px] leading-[1.2] font-[650] tracking-[-0.02em] lg:text-[32px]">
        {narration?.headline ?? c.question}
      </p>
      {narration?.summary && <p className="m-0 max-w-[760px] text-body text-secondary">{narration.summary}</p>}
      {derived && <p className="m-0 max-w-[760px] text-body text-secondary">{derived}</p>}
      {lines.map((line) => (
        <span key={line} className="meta text-tertiary">
          {line}
        </span>
      ))}
    </section>
  );
}

type VerdictProps = { c: CaseFile; narration: Narration; witnessLink?: { href: string; label: string } };

function VerdictSection({ c, narration, witnessLink }: VerdictProps) {
  const facts = [
    ["What we can say", narration.can_say],
    ["What we can’t say yet", narration.what_data_cannot_tell_us],
    ["What would change it", narration.would_change_it],
    ["Next witness", narration.next_witness],
  ];
  return (
    <section className="flex flex-col gap-4" aria-label="Verdict">
      <SectionHead eyebrow="Verdict" title="What the evidence says" />
      <VerdictCard strength={caseVerdict(c)} title={narration.headline} body={narration.verdict} />
      <div className="grid gap-4 md:grid-cols-2">
        {facts.map(([label, text]) => (
          <div key={label} className="glass-card flex flex-col gap-2 p-5">
            <span className="meta text-tertiary">{label}</span>
            <p className="m-0 text-[15px] leading-[1.55] text-label">{text}</p>
            {label === "Next witness" && witnessLink && (
              <Link
                href={witnessLink.href}
                className="self-start text-[14px] font-medium text-gold-soft hover:underline"
              >
                {witnessLink.label} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Sources({ c }: { c: CaseFile }) {
  return (
    <section className="flex flex-col gap-4" aria-label="Sources">
      <SectionHead eyebrow="Sources" title="Where every number comes from" />
      <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
        {c.datasets.map((d) => (
          <li key={d.short_name}>
            <a
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-col rounded-tile border border-gold/28 bg-navy/55 px-3.5 py-2 hover:border-gold/50"
            >
              <span className="text-[13px] font-semibold text-label">{d.short_name}</span>
              <span className="text-[12px] text-secondary">{d.provider}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function CasePage(props: PageProps<"/case/[id]">) {
  const { id } = await props.params;
  const [c, narration, index] = await Promise.all([loadCase(id), loadNarration(id), loadCaseIndex()]);
  const companion = await companionCase(c, index);
  const night = c.topic === "night-heat" ? c : companion;
  const greenery = c.topic === "greenery" ? c : companion;
  const groups = groupEvidence(c, buildEvidenceViews(c));
  const landRows = landCoverRows(c);
  const agreement = agreementRows(c);
  const watch = night && greenery ? oneToWatch(night, greenery) : null;
  const companionHref = companion ? `/case/${companion.case_id}` : undefined;
  const watchLinks = c.topic === "night-heat" ? { greenery: companionHref } : { nightHeat: companionHref };
  const related =
    companion && companionHref ? { href: companionHref, label: COMPANION_LINK_LABEL[companion.topic] } : undefined;
  const chart = summaryChart(c);
  const flood = floodCheck(c);
  const span = agreementSpan(c);
  const agreeCount = agreement.filter((r) => r.sameDirection).length;
  const suspects = suspectRows(c, narration);
  const headlineLines = [
    caseCountsLine(c, narration),
    strengthTally(c),
    agreement.length > 0
      ? `Terra and Aqua agree on the direction at ${agreeCount} of ${plural(agreement.length, "point")}`
      : null,
  ].filter((line): line is string => line !== null);

  return (
    <div className="relative isolate flex min-h-full flex-col overflow-x-clip">
      <Starfield />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-14 px-4 py-12 lg:px-10 lg:py-16">
        <header className="flex flex-col gap-4">
          <span className="meta text-tertiary">
            {c.region.name} · {TOPIC_WORDS[c.topic] ?? c.topic} · {yearSpan(c)}
          </span>
          <h1 className="m-0 max-w-[900px] text-[40px] leading-[1.05] font-bold tracking-[-0.032em] lg:text-title-1">
            {c.question}
          </h1>
        </header>

        <HeadlineFinding c={c} narration={narration} derived={farmlandGapSentence(c)} lines={headlineLines} />

        {chart && <PointDotPlot {...chart} />}

        {flood && <DetectorCheckCard check={flood} />}

        <section className="flex flex-col gap-10" aria-label="The evidence">
          <SectionHead eyebrow="The evidence" title={plural(c.evidence.length, "exhibit")} />
          {groups.map((g) => (
            <ExhibitGroup key={g.key} group={g}>
              <div className="grid gap-4 lg:grid-cols-2">
                {g.views.map((v) => (
                  <EvidenceCard key={v.id} view={v} note={narration?.evidence_notes[v.id]} variant="B" />
                ))}
              </div>
            </ExhibitGroup>
          ))}
        </section>

        {c.land_cover && landRows.length > 0 && (
          <div className="flex flex-col gap-4">
            <LandCoverBlock landCover={c.land_cover} rows={landRows} related={related} />
            {watch && <OneToWatch watch={watch} links={watchLinks} />}
          </div>
        )}

        {span && agreement.length > 0 && <AgreementBlock rows={agreement} flags={c.flags} span={span} />}

        {suspects.length > 0 && <SuspectsSection rows={suspects} />}

        {narration && (
          <DevilsAdvocateCard objection={narration.devils_advocate} note={narration.devils_advocate_note} />
        )}

        {narration && <VerdictSection c={c} narration={narration} witnessLink={nextWitnessLink(c, index)} />}

        <Sources c={c} />
      </main>
      <SiteFooter />
    </div>
  );
}
