import "server-only";

import type { CaseCardData } from "@/components/case/CaseCard";

import type { CaseFile, Strength, TrendEvidence } from "./case-data";
import { dotPlotCaption, pointDots, type PointDot } from "./case-sections";
import { caseVerdict } from "./evidence-view";
import { formatP, formatTrend } from "./format";
import { cardTag, FEATURED_CASE, GRID_CASES, landingStats, type LandingStats } from "./landing";
import { loadCase, loadNarration } from "./load-case";
import type { Narration } from "./narration";

export type FeaturedCase = {
  id: string;
  region: string;
  topic: string;
  question: string;
  headline: string;
  strength: Strength;
  dots: PointDot[];
  caption: string;
};

/** One step of "How a case works", with a real excerpt from the featured case. */
export type WalkStep = {
  title: string;
  body: string;
  /** What the featured case says at this step; missing if the case has nothing for it. */
  example?: { kicker: string; text: string; stat?: string; strength?: Strength };
};

export type Landing = { featured: FeaturedCase; cards: CaseCardData[]; stats: LandingStats; walkthrough: WalkStep[] };

const trendWithRole = (c: CaseFile, role: string): TrendEvidence | undefined =>
  c.evidence.find((e): e is TrendEvidence => e.kind === "trend" && e.role === role);

function exhibitExample(e: TrendEvidence | undefined, n: Narration | null): WalkStep["example"] {
  if (!e) return undefined;
  return {
    kicker: e.label,
    text: n?.evidence_notes[e.id] ?? e.plain,
    stat: `${formatTrend(e.stats.slope_per_decade, e.stats.units_per_decade)} ${e.stats.units_per_decade} · ${formatP(e.stats.p_value)}`,
    strength: e.stats.verdict_strength,
  };
}

/** The five parts of a case, each with what the featured case actually says (case file + guard-checked narration). */
export function walkthrough(c: CaseFile, n: Narration | null): WalkStep[] {
  return [
    { title: "Question", body: "One plain question about a place.", example: { kicker: c.region.name, text: c.question } },
    { title: "Evidence", body: "NASA satellite and climate data, tested.", example: exhibitExample(trendWithRole(c, "city"), n) },
    {
      title: "Other suspects",
      body: "What else could explain it?",
      example: exhibitExample(trendWithRole(c, "countryside control"), n),
    },
    {
      title: "Devil’s Advocate",
      body: "The strongest case against the finding.",
      example: n?.devils_advocate ? { kicker: "The objection on the record", text: n.devils_advocate } : undefined,
    },
    {
      title: "Verdict",
      body: "An honest strength label.",
      example: n?.verdict ? { kicker: n.headline, text: n.verdict, strength: caseVerdict(c) } : undefined,
    },
  ];
}

function card(c: CaseFile, number: number, all: CaseFile[]): CaseCardData {
  return {
    id: c.case_id,
    number,
    topic: c.topic,
    region: c.region.name,
    question: c.question,
    strength: caseVerdict(c),
    tag: cardTag(c, all),
  };
}

/** Everything the landing page shows, from data/cases and data/narration only. */
export async function loadLanding(): Promise<Landing> {
  const [featured, ...grid] = await Promise.all([FEATURED_CASE, ...GRID_CASES].map(loadCase));
  const all = [featured, ...grid];
  const narration = await loadNarration(featured.case_id);
  const dots = pointDots(featured);
  return {
    featured: {
      id: featured.case_id,
      region: featured.region.name,
      topic: featured.topic,
      question: featured.question,
      headline: narration?.headline ?? featured.question,
      strength: caseVerdict(featured),
      dots,
      caption: dotPlotCaption(dots, featured.topic),
    },
    // The featured case is Case 01; the grid continues from 02.
    cards: grid.map((c, i) => card(c, i + 2, all)),
    stats: landingStats(all),
    walkthrough: walkthrough(featured, narration),
  };
}
