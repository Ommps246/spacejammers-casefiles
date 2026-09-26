import { CasesSection } from "@/components/landing/CasesSection";
import { FeaturedCase } from "@/components/landing/FeaturedCase";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Starfield } from "@/components/site/Starfield";
import { loadLanding } from "@/lib/case-cards";

// Landing (design/Landing-Desktop.dc.html, Landing-Mobile.dc.html): hero → featured case → stat strip and
// case grid → how a case works. Every case fact on this page comes from data/cases and data/narration
// via loadLanding(): questions, headlines, verdicts, the dot plot, the tags and every number in the stat strip.
export default async function Home() {
  const { featured, cards, stats } = await loadLanding();

  return (
    <div className="relative isolate flex min-h-full flex-col overflow-x-clip">
      <Starfield />
      <SiteHeader />
      <main className="flex flex-col">
        <Hero featuredCaseId={featured.id} />
        <FeaturedCase data={featured} />
        <CasesSection cards={cards} stats={stats} />
        <HowItWorks />
      </main>
      <SiteFooter />
    </div>
  );
}
