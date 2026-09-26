// Development-only component sheet, laid out like design/Components.dc.html but fed by real data,
// so the two can be compared side by side. 404 in production builds.
import { notFound } from "next/navigation";

import { CaseCard } from "@/components/case/CaseCard";
import { DevilsAdvocateCard } from "@/components/case/DevilsAdvocateCard";
import { EvidenceCard } from "@/components/case/EvidenceCard";
import { VerdictCard } from "@/components/case/VerdictCard";
import { LogoLockup, LogoMark } from "@/components/ui/Logo";
import { SourceChip } from "@/components/ui/SourceChip";
import { StatPill } from "@/components/ui/StatPill";
import { StrengthLabel } from "@/components/ui/StrengthLabel";
import { loadLanding } from "@/lib/case-cards";
import { buildEvidenceViews, caseVerdict } from "@/lib/evidence-view";
import { formatP, formatYearSpan } from "@/lib/format";
import { loadCase, loadNarration } from "@/lib/load-case";

type SectionProps = { title: string; hint: string; id?: string; children: React.ReactNode };

function Section({ title, hint, id, children }: SectionProps) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="meta text-gold">{title}</span>
        <span className="text-[13px] text-secondary">{hint}</span>
      </div>
      {children}
    </section>
  );
}

export default async function ComponentSheet() {
  if (process.env.NODE_ENV === "production") notFound();

  const heat = await loadCase("chennai-heat");
  const narration = await loadNarration("chennai-heat");
  const views = buildEvidenceViews(heat);
  const byId = Object.fromEntries(views.map((v) => [v.id, v]));
  const global = heat.evidence.find((e) => e.id === "global_context");
  const { cards } = await loadLanding();

  return (
    <main className="mx-auto flex w-[1440px] flex-col gap-12 px-20 py-[72px]">
      <div className="flex flex-col gap-2.5">
        <span className="meta text-gold">Components</span>
        <h2 className="m-0 text-[44px] leading-[1.15] font-bold tracking-[-0.025em]">The six building blocks</h2>
        <p className="m-0 max-w-[680px] text-body text-secondary">
          Every screen, the video and the logo are assembled from these. Real numbers only; where a case has no number
          yet, the component says so.
        </p>
      </div>

      <div className="flex gap-10">
        <div className="w-[640px] shrink-0">
          <Section title="Evidence card" hint="Plain label · one plain sentence · chart · stat pill · strength">
            <EvidenceCard view={byId.temp_trend} note={narration?.evidence_notes.temp_trend} variant="B" />
          </Section>
        </div>
        <div className="flex grow flex-col gap-10">
          <Section title="Stat pill" hint="Tabular numerals; unit always spelled out">
            <div className="flex flex-wrap gap-3">
              <StatPill {...byId.temp_trend.stat} />
              <StatPill {...byId.hot_days.stat} />
              <StatPill {...byId.global_context.stat} tone="reference" />
              <StatPill {...byId.temp_shift.stat} size="lg" />
            </div>
          </Section>
          <Section title="Source chip" hint="Every number carries its dataset">
            <div className="flex flex-wrap gap-3">
              <SourceChip source="power" size="md" />
              <SourceChip source="gistemp" size="md" />
              <SourceChip source="power" />
            </div>
          </Section>
          <Section title="Strength labels" hint="Icon + word + colour; never colour alone">
            <div className="flex flex-wrap gap-3">
              {(["strong", "moderate", "inconclusive", "lead"] as const).map((k) => (
                <StrengthLabel key={k} kind={k} size="md" />
              ))}
            </div>
          </Section>
          <Section title="Devil’s Advocate card" hint="Muted red edge; enters from the right as an objection">
            <div className="w-[600px]">
              <DevilsAdvocateCard
                objection={narration?.devils_advocate ?? "Narration not written yet for this case."}
                note={narration?.devils_advocate_note}
              />
            </div>
          </Section>
        </div>
      </div>

      <Section
        title="Verdict card"
        hint="Inconclusive is styled as a finding: solid border, full meter, plain explanation"
      >
        <div className="grid grid-cols-3 gap-4">
          {global?.kind === "trend" && (
            <VerdictCard
              strength={global.stats.verdict_strength}
              title={`The whole planet warmed over ${formatYearSpan(global.stats.start, global.stats.end)}`}
              body={`${byId.global_context.stat.value} °C per decade, ${formatP(global.stats.p_value)}. Survives every check.`}
            />
          )}
          <VerdictCard
            strength="moderate"
            title="[Case title]"
            body="Holds up, with caveats on the record. No current case uses this label."
          />
          <VerdictCard
            strength={caseVerdict(heat)}
            title={narration?.headline ?? heat.question}
            body={narration?.summary ?? ""}
          />
        </div>
      </Section>

      <Section title="Case card" hint="Folder tab · question · verdict · optional tag">
        <div className="grid grid-cols-4 gap-4">
          {cards.map((card) => (
            <CaseCard key={card.id} data={card} />
          ))}
        </div>
      </Section>

      <hr className="border-hairline" />
      <span className="meta text-tertiary">Extras, not on the component sheet</span>

      <Section id="logo" title="Logo" hint="Tile, gold and mono white; the small-size cut applies at 24 px and below">
        <div className="flex flex-wrap items-end gap-6">
          {[16, 20, 24, 32, 48, 64, 96].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <LogoMark size={s} />
              <LogoMark size={s} variant="white" />
              <span className="meta text-tertiary">{s}px</span>
            </div>
          ))}
          <div className="ml-10 flex flex-col gap-6">
            <LogoLockup size="large" />
            <LogoLockup size="nav" />
          </div>
        </div>
      </Section>

      <Section title="Evidence card · variant A" hint="Words left, chart right (desktop case page)">
        <div className="flex flex-col gap-4">
          <EvidenceCard view={byId.hot_days} note={narration?.evidence_notes.hot_days} variant="A" />
          <EvidenceCard view={byId.global_context} note={narration?.evidence_notes.global_context} variant="A" />
        </div>
      </Section>
    </main>
  );
}
