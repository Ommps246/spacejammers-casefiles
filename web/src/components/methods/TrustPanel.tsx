// "Can you trust the detector?": three tests the detector has to pass, then our results beside published
// studies of Chennai. Data from lib/trust.ts (our side read from the case files).
import Link from "next/link";

import type { DetectorCheck, Study } from "@/lib/trust";

import { StrengthLabel } from "../ui/StrengthLabel";

const VERDICT_TONE: Record<Study["verdict"], string> = {
  agree: "border-strong/40 bg-strong/10 text-strong",
  partly: "border-moderate/40 bg-moderate/10 text-moderate",
  differs: "border-moderate/40 bg-moderate/10 text-moderate-soft",
};

export function TrustPanel({ checks, studies }: { checks: DetectorCheck[]; studies: Study[] }) {
  return (
    <section id="trust" className="glass-card flex scroll-mt-16 flex-col gap-6 p-5 lg:scroll-mt-8 lg:p-6" aria-labelledby="trust-title">
      <div className="flex flex-col gap-1.5">
        <span className="meta text-gold">Before you believe us</span>
        <h2 id="trust-title" className="m-0 text-[24px] font-[650] tracking-[-0.02em]">
          Can you trust the detector?
        </h2>
        <p className="m-0 text-[15px] leading-[1.55] text-secondary">
          Three tests it has to pass, and how our results compare with published studies of Chennai.
        </p>
      </div>

      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
        {checks.map((c) => (
          <li key={c.title} className="flex flex-col gap-1.5 rounded-tile border border-hairline bg-white/3 p-4">
            <span className="text-[15px] font-semibold text-label">{c.title}</span>
            <span className="font-mono text-[14px] text-strong">{c.result}</span>
            <span className="text-[13px] leading-[1.5] text-secondary">{c.detail}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <h3 className="meta m-0 text-tertiary">Checked against published studies</h3>
        {studies.map((s) => (
          <article key={s.topic} className="flex flex-col gap-3 rounded-tile border border-hairline bg-white/3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[15px] font-semibold text-label">{s.topic}</span>
              <span className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${VERDICT_TONE[s.verdict]}`}>{s.verdictText}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="meta text-tertiary">They found</span>
                <span className="text-[14px] leading-[1.5] text-label">{s.theyFound}</span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-gold-soft hover:underline">
                  {s.citation} ↗
                </a>
              </div>
              <div className="flex flex-col gap-1">
                <span className="meta text-tertiary">We found</span>
                <span className="text-[14px] leading-[1.5] text-label">{s.ours}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <StrengthLabel kind={s.oursStrength} />
                  <Link href={`/case/${s.caseId}`} className="text-[13px] font-semibold text-gold-soft hover:underline">
                    Open the case →
                  </Link>
                </span>
              </div>
            </div>
          </article>
        ))}
        <p className="m-0 text-[12px] leading-[1.5] text-tertiary">
          The studies use different years, stations or satellites from ours, so this compares direction and size,
          not identical numbers. Where we differ, we say why.
        </p>
      </div>
    </section>
  );
}
