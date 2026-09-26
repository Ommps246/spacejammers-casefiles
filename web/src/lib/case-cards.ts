import "server-only";

import type { CaseCardData } from "@/components/case/CaseCard";

import type { CaseFile, Strength } from "./case-data";
import { dotPlotCaption, pointDots, type PointDot } from "./case-sections";
import { caseVerdict } from "./evidence-view";
import { cardTag, FEATURED_CASE, GRID_CASES, landingStats, type LandingStats } from "./landing";
import { loadCase, loadNarration } from "./load-case";

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

export type Landing = { featured: FeaturedCase; cards: CaseCardData[]; stats: LandingStats };

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
  };
}
