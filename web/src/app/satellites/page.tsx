// /satellites · "Meet the witnesses": the two NASA satellites behind the satellite cases, each as a
// rotatable, zoomable 3D model (loaded when scrolled into view) with short, cited fact cards.
import Link from "next/link";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Starfield } from "@/components/site/Starfield";
import { ModelViewer } from "@/components/witnesses/ModelViewer";
import { OverpassClock } from "@/components/witnesses/OverpassClock";
import { WITNESSES, type Witness } from "@/lib/witnesses";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-hairline pt-3">
      <dt className="meta text-tertiary">{label}</dt>
      <dd className="m-0 text-[15px] leading-[1.5] text-label">{children}</dd>
    </div>
  );
}

function WitnessCard({ w }: { w: Witness }) {
  return (
    <article className="glass-card flex flex-col gap-5 p-5 lg:p-6" aria-labelledby={`${w.id}-title`}>
      <ModelViewer model={w.model} name={w.name} />
      <div className="flex flex-col gap-1">
        <span className="meta text-gold">NASA · MODIS</span>
        <h2 id={`${w.id}-title`} className="m-0 text-title-3">
          {w.name}
        </h2>
      </div>
      <dl className="m-0 flex flex-col gap-3">
        <Fact label="Launched">{w.launched}</Fact>
        <Fact label="Instrument">{w.instrument}</Fact>
        <Fact label="Daytime pass">{w.dayPass}</Fact>
        <Fact label="Night pass">{w.nightPass}</Fact>
        <Fact label="Since then">{w.drift}</Fact>
        <Fact label="In these cases">{w.products}</Fact>
      </dl>
      <p className="m-0 text-[13px] text-secondary">
        Source:{" "}
        {w.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && " · "}
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gold-soft hover:underline">
              {s.label}
            </a>
          </span>
        ))}
      </p>
    </article>
  );
}

export default function SatellitesPage() {
  return (
    <div className="relative isolate flex min-h-full flex-col overflow-x-clip">
      <Starfield />
      <SiteHeader active="Satellites" />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-12 lg:px-10 lg:py-16">
        <header className="flex max-w-[760px] flex-col gap-4">
          <span className="meta text-gold">Meet the witnesses</span>
          <h1 className="m-0 text-[40px] leading-[1.05] font-bold tracking-[-0.032em] lg:text-title-1">
            Two satellites, one instrument, twice a day each
          </h1>
          <p className="m-0 text-body text-secondary">
            The satellite cases rest on MODIS, flying on NASA’s Terra and Aqua. They pass over at different times of
            day, so when both see the same trend it’s harder to blame one satellite’s clock or sensor. Drag to rotate
            and scroll to zoom; on a phone, use two fingers.
          </p>
          <p className="m-0 text-body text-label">
            See them disagree, and agree, in the{" "}
            <Link href="/case/chennai-night-heat#agreement-title" className="text-gold-soft hover:underline">
              Terra/Aqua cross-check of the night-heat case →
            </Link>
          </p>
        </header>
        <OverpassClock />
        <div className="grid gap-5 md:grid-cols-2">
          {WITNESSES.map((w) => (
            <WitnessCard key={w.id} w={w} />
          ))}
        </div>
        <p className="m-0 max-w-[760px] text-[13px] leading-[1.55] text-tertiary">
          Both satellites have been drifting from their design orbits as their fuel runs low, so their crossing times
          have moved (see “Since then”). The night-heat case’s caveats cover what that means for its trends.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
