// Footer: "Every number traces to a NASA dataset" (Landing-Desktop).
import Link from "next/link";

import { SatelliteIcon } from "../ui/icons";

export function SiteFooter() {
  return (
    <footer
      className="mt-auto flex flex-col gap-4 border-t border-white/7 px-5 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-20"
    >
      <div className="flex items-center gap-3">
        <SatelliteIcon size={16} />
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Every number traces to a NASA dataset</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          href="/methods"
          className="inline-flex min-h-11 items-center text-[14px] font-semibold text-gold-soft hover:text-gold-pale"
        >
          Method
        </Link>
        <Link
          href="/satellites"
          className="inline-flex min-h-11 items-center text-[14px] font-semibold text-gold-soft hover:text-gold-pale"
        >
          Satellites
        </Link>
        <Link
          href="/team"
          className="inline-flex min-h-11 items-center text-[14px] font-semibold text-gold-soft hover:text-gold-pale"
        >
          Team
        </Link>
        <span className="text-[13px] text-secondary">SpaceJammers · Chennai · NASA Space Apps 2026</span>
      </div>
    </footer>
  );
}
