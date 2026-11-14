import "server-only";

/**
 * "Can you trust the detector?": three checks on the detector itself and three published studies to set
 * our results beside. Our side of every comparison is read from the case files; the studies' side is
 * quoted from the papers (docs/VALIDATION.md has the same table, with the exact sources).
 */
import type { Strength, TrendEvidence } from "./case-data";
import { floodCheck } from "./case-sections";
import { formatP, formatTrend } from "./format";
import { loadCase } from "./load-case";

export type DetectorCheck = { title: string; result: string; detail: string };
export type Study = {
  topic: string;
  citation: string;
  url: string;
  theyFound: string;
  ours: string;
  oursStrength: Strength;
  caseId: string;
  verdict: "agree" | "partly" | "differs";
  verdictText: string;
};

const trend = (evidence: TrendEvidence[], id: string): TrendEvidence => {
  const e = evidence.find((x) => x.id === id);
  if (!e) throw new Error(`trust: no evidence "${id}"`);
  return e;
};
const trendsOf = async (caseId: string) =>
  (await loadCase(caseId)).evidence.filter((e): e is TrendEvidence => e.kind === "trend");

export async function loadTrust(): Promise<{ checks: DetectorCheck[]; studies: Study[] }> {
  const rainCase = await loadCase("chennai-rain");
  const flood = floodCheck(rainCase);
  const rain = rainCase.evidence.filter((e): e is TrendEvidence => e.kind === "trend");
  const heat = await trendsOf("chennai-heat");
  const night = (await trendsOf("chennai-night-heat")).filter((e) => e.role === "city");
  const slopes = night.map((e) => e.stats.slope_per_decade);
  const lo = Math.min(...slopes);
  const hi = Math.max(...slopes);
  const unit = night[0].stats.units_per_decade;
  const nightStrong = night.every((e) => e.stats.verdict_strength === "strong");
  const total = trend(rain, "total");
  const heavy = trend(rain, "heavy_days");
  const air = trend(heat, "temp_trend");

  const checks: DetectorCheck[] = [
    {
      title: "Finds trends we plant",
      result: "Passes",
      detail: "We hide a +0.3 °C per decade warming in made-up data. The detector finds it and measures it to within ±0.06.",
    },
    {
      title: "Rarely cries wolf",
      result: "About 8% false alarms",
      detail: "On trend-free noise that is ‘sticky’ like real climate data, against a 5% target. A plain Mann-Kendall test raised about 22%.",
    },
    {
      title: "Sees a flood everyone remembers",
      result: flood?.passed ? "Passes" : "Not passed",
      detail: flood
        ? `November–December 2015 comes out as the wettest of ${flood.years} years in the data (${Number(flood.mm).toLocaleString("en-US", { minimumFractionDigits: 1 })} mm).`
        : "The 2015 flood check is missing from the rain case.",
    },
  ];

  const studies: Study[] = [
    {
      topic: "Night ground temperature",
      citation: "Nayak, Vinod & Prasad (2023), Applied Sciences",
      url: "https://doi.org/10.3390/app132413323",
      theyFound: "MODIS land surface temperature over major Indian cities, 2000–2023: a statistically significant rise in night-time surface temperatures.",
      ours: `Chennai’s four city points: ${formatTrend(lo, unit)} to ${formatTrend(hi, unit)} ${unit}, 2000–2025.`,
      oursStrength: nightStrong ? "strong" : "moderate",
      caseId: "chennai-night-heat",
      verdict: "agree",
      verdictText: "Agree: both see nights warming",
    },
    {
      topic: "Yearly rainfall",
      citation: "Bheeman & Rangarajan (2026), Acta Geophysica",
      url: "https://link.springer.com/article/10.1007/s11600-026-01803-w",
      theyFound: "Meenambakkam rain gauge, 1969–2023: no significant trend in annual rainfall (Mann-Kendall p = 0.36), but short 1–3 hour downpours are becoming more frequent.",
      ours: `Yearly rainfall: no clear trend (${formatP(total.stats.p_value)}); heavy-rain days: no clear trend (${formatP(heavy.stats.p_value)}).`,
      oursStrength: total.stats.verdict_strength,
      caseId: "chennai-rain",
      verdict: "agree",
      verdictText: "Agree on totals; our daily data can’t see hour-long bursts",
    },
    {
      topic: "Air temperature",
      citation: "Jeganathan & Andimuthu (2013), Theoretical and Applied Climatology",
      url: "https://doi.org/10.1007/s00704-012-0646-6",
      theyFound: "Chennai weather station, 1951–2010: mean annual temperature rose 1.3 °C over 60 years; three-quarters of the rise in daytime maximum came after 1981.",
      ours: `NASA POWER grid cell, 1981–2025: ${formatTrend(air.stats.slope_per_decade, air.stats.units_per_decade)} ${air.stats.units_per_decade} (${formatP(air.stats.p_value)}), which doesn’t pass our check across all 40 tests, so we call it no clear trend.`,
      oursStrength: air.stats.verdict_strength,
      caseId: "chennai-heat",
      verdict: "differs",
      verdictText: "Weaker than the station record: our ~50 km grid cell mixes city, sea and countryside, and the periods differ",
    },
  ];
  return { checks, studies };
}
