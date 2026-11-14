// /explore · "Pick a variable": the challenge asks for a tool that can select variables, show how they change
// over time, and say what is changing, where, how much, and whether it's significant. This page regroups every
// trend the pipeline tested by variable; every number and verdict comes from the case files.
import { Explorer } from "@/components/explore/Explorer";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Starfield } from "@/components/site/Starfield";
import { exploreVariables } from "@/lib/explore";
import { FEATURED_CASE, GRID_CASES } from "@/lib/landing";
import { loadCase } from "@/lib/load-case";

export default async function ExplorePage() {
  const cases = await Promise.all([FEATURED_CASE, ...GRID_CASES].map(loadCase));
  const variables = exploreVariables(cases);
  const places = new Set(variables.flatMap((v) => v.rows.filter((r) => !r.reference).map((r) => r.place)));
  return (
    <div className="relative isolate flex min-h-full flex-col overflow-x-clip">
      <Starfield />
      <SiteHeader active="Explore" />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-12 lg:px-10 lg:py-16">
        <header className="flex max-w-[760px] flex-col gap-4">
          <span className="meta text-gold">Explore</span>
          <h1 className="m-0 text-[40px] leading-[1.05] font-bold tracking-[-0.032em] lg:text-title-1">
            Pick a variable. See what’s changing.
          </h1>
          <p className="m-0 text-body text-secondary">
            {variables.length} variables from NASA weather records and satellites, measured at {places.size} places around
            Chennai and the Nilgiris. Choose one to see where it’s changing, by how much, and whether the change is
            significant or could be chance.
          </p>
        </header>
        <Explorer variables={variables} />
      </main>
      <SiteFooter />
    </div>
  );
}
