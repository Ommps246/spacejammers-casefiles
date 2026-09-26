// Landing hero (Landing-Desktop: text left, globe right; Landing-Mobile: text over the globe).
import Link from "next/link";

import { HeroGlobe } from "../globe/HeroGlobe";
import { ArrowRightIcon, SatelliteIcon } from "../ui/icons";

// No display class here: each button sets its own (a shared `inline-flex` would beat `hidden`).
const BUTTON = "min-h-11 items-center gap-2 rounded-full border px-5 text-[15px] font-semibold tracking-[-0.01em]";

export function Hero({ featuredCaseId }: { featuredCaseId: string }) {
  return (
    <section className="relative mx-auto h-[830px] w-full max-w-[1440px] shrink-0 overflow-hidden lg:h-[820px] lg:overflow-visible">
      <HeroGlobe
        priority
        sizes="(min-width: 1024px) 760px, 430px"
        className="absolute top-[390px] -left-5 size-[430px] lg:top-10 lg:left-[640px] lg:size-[760px]"
      />

      <div className="absolute top-9 left-5 flex w-[350px] max-w-[calc(100%-40px)] flex-col gap-[18px] lg:top-[190px] lg:left-[120px] lg:w-[560px] lg:gap-7">
        <span className="meta text-gold">
          NASA Space Apps 2026<span className="hidden lg:inline"> · SpaceJammers, Chennai</span>
        </span>
        <h1 className="m-0 text-[64px] leading-[0.95] font-bold tracking-[-0.045em] lg:text-[112px] lg:leading-[0.92]">
          Case Files
        </h1>
        <p className="m-0 text-[19px] leading-[1.45] text-inconclusive-soft lg:text-[24px] lg:tracking-[-0.01em]">
          We asked NASA’s satellites what’s changing around Chennai. Some answers are clear. Some aren’t. We tell you
          which.
        </p>
        <div className="flex flex-col gap-2.5 lg:mt-2 lg:flex-row lg:gap-3">
          <Link
            href={`/case/${featuredCaseId}`}
            className={`${BUTTON} flex border-gold bg-gold text-space-1 lg:inline-flex lg:self-start`}
          >
            Open the Chennai case
            <ArrowRightIcon color="#0b1020" />
          </Link>
          <Link href="/#how" className={`${BUTTON} hidden border-hairline bg-white/6 text-label lg:inline-flex`}>
            How a case works
          </Link>
        </div>
      </div>

      <div className="absolute bottom-14 left-[120px] hidden items-center gap-2.5 text-[13px] text-secondary lg:flex">
        <SatelliteIcon size={16} />
        NASA Terra passing over South India
      </div>
    </section>
  );
}
