// Source chip: every number carries its dataset (Components · Source chip).
import type { SourceKey } from "@/lib/evidence-view";

import { SatelliteIcon } from "./icons";

export const SOURCES: Record<SourceKey, { name: string; provider: string; url: string }> = {
  power: { name: "NASA POWER", provider: "LaRC", url: "https://power.larc.nasa.gov/" },
  gistemp: { name: "GISTEMP v4", provider: "GISS", url: "https://data.giss.nasa.gov/gistemp/" },
  modis: { name: "MODIS", provider: "LP DAAC", url: "https://lpdaac.usgs.gov/" },
};

type Props = { source: SourceKey; size?: "sm" | "md"; asLink?: boolean };

export function SourceChip({ source, size = "sm", asLink = false }: Props) {
  const { name, provider, url } = SOURCES[source];
  const box = size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]";
  const className = `inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border border-gold/28 bg-navy/55 font-semibold text-label ${box}`;
  const content = (
    <>
      <SatelliteIcon size={size === "sm" ? 12 : 13} />
      {name}
      <span className="font-medium text-secondary">{provider}</span>
    </>
  );
  return asLink ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${className} hover:border-gold/50`}>
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  );
}
