/**
 * "Meet the witnesses": the two NASA satellites whose MODIS instruments supply the satellite cases.
 * Every fact below is quoted from the NASA page listed with it (checked 2026-09-26); nothing is estimated.
 */
export type Source = { label: string; url: string };

export type Witness = {
  id: "terra" | "aqua";
  name: string;
  model: string;
  launched: string;
  instrument: string;
  dayPass: string;
  nightPass: string;
  drift: string;
  products: string;
  sources: Source[];
};

const TERRA_ABOUT: Source = { label: "NASA Terra: About", url: "https://terra.nasa.gov/about" };
const AQUA_20: Source = {
  label: "NASA Earthdata: Aqua Turns 20",
  url: "https://www.earthdata.nasa.gov/news/feature-articles/aqua-turns-20",
};
const AQUA_HOME: Source = { label: "NASA Aqua Project Science", url: "https://aqua.nasa.gov/" };

export const WITNESSES: readonly Witness[] = [
  {
    id: "terra",
    name: "Terra",
    model: "/models/terra.opt.glb",
    launched: "18 December 1999",
    instrument: "MODIS, one of five instruments on board",
    dayPass: "Crosses the equator heading south at 10:30 a.m. local time (its design orbit)",
    nightPass: "About 12 hours later it crosses again, heading north, on the night side of the same orbit",
    drift:
      "Began drifting in February 2020; past 10:15 a.m. by October 2022, and expected past 9:00 a.m. by December 2025",
    products: "MOD11A2 land surface temperature and MOD13Q1 greenness in these cases",
    sources: [TERRA_ABOUT],
  },
  {
    id: "aqua",
    name: "Aqua",
    model: "/models/aqua.opt.glb",
    launched: "4 May 2002",
    instrument: "MODIS, one of four instruments still collecting data",
    dayPass: "Crosses the equator heading north at about 1:30 p.m. local time (its design orbit)",
    nightPass: "About 12 hours later it crosses again, heading south, on the night side of the same orbit",
    drift: "Free drift since December 2021, to later crossing times; expected past 1:45 p.m. by February 2023",
    products: "MYD11A2 land surface temperature: the independent cross-check in the night-heat case",
    sources: [AQUA_20, AQUA_HOME],
  },
];
