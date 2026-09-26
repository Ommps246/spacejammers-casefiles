"""Turn raw NASA data into Case File JSON for the app.

    python -m pipeline.build_cases            # all regions with raw data present
    python -m pipeline.build_cases chennai

Output: data/cases/<region>-<topic>.json and data/cases/index.json.
Every number in these files is computed here; the AI layer may only restate them.
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

from . import landcover, modis
from . import stats as st
from .appeears import EXTRA_POINTS
from .appeears import POINTS as MODIS_POINTS
from .fetch import RAW, daily_to_monthly, load_gistemp, load_power_daily
from .regions import REGIONS

CASES = Path(__file__).resolve().parents[1] / "data" / "cases"
# The tests the FDR correction runs over, frozen on 2026-09-26 (docs/METHODS.md §7). Every build is checked
# against it before correcting; None switches the check off (the synthetic-data tests).
FDR_FAMILY_FILE: Path | None = Path(__file__).resolve().parents[1] / "data" / "fdr_family.json"
BASE = (1981, 2010)          # climatology baseline
HEAVY_RAIN_MM = 64.5         # IMD "heavy rainfall" threshold (mm/day)

CAVEATS_POWER = [
    "NASA POWER values are model/satellite blends (MERRA-2 reanalysis based) on a ~50 km grid, "
    "so they describe the wider city region, not individual neighbourhoods.",
    "Reanalysis can shift when input observing systems change; abrupt changepoints should be "
    "cross-checked against an independent dataset before being called real.",
]


def _series_payload(s: pd.Series, decimals: int = 3) -> list[dict]:
    s = s.dropna()
    return [{"t": d.strftime("%Y-%m-%d"), "v": round(float(v), decimals)} for d, v in s.items()]


def _annual(s: pd.Series, how: str = "mean") -> pd.Series:
    g = s.groupby(s.index.year)
    a = g.mean() if how == "mean" else g.sum()
    full = g.count() >= (330 if len(s) and (s.index[1] - s.index[0]).days == 1 else 12)
    a = a[full]
    a.index = pd.to_datetime(a.index.astype(str) + "-01-01")
    return a


def _power_citation(header: dict | None) -> dict:
    return {
        "short_name": "NASA POWER daily point",
        "provider": "NASA Langley Research Center, POWER Project",
        "url": "https://power.larc.nasa.gov/",
        "sources": (header or {}).get("sources"),
        "accessed": date.today().isoformat(),
    }


GISTEMP_CITATION = {
    "short_name": "GISTEMP v4 (global land-ocean)",
    "provider": "NASA Goddard Institute for Space Studies",
    "url": "https://data.giss.nasa.gov/gistemp/",
    "reference": "Lenssen et al. (2019), JGR Atmospheres, doi:10.1029/2018JD029522",
}


def heat_case(rid: str, daily: pd.DataFrame, monthly: pd.DataFrame, header, gis: pd.Series | None) -> dict:
    t_anom = st.deseasonalize(monthly["T2M"], BASE)
    t_trend = st.trend_test(t_anom, steps_per_year=12, units="°C")

    thr = st.percentile_threshold(daily["T2M_MAX"], 95, BASE)
    hot_days = st.annual_count_above(daily["T2M_MAX"], thr)
    hot_trend = st.trend_test(hot_days, steps_per_year=1, units="days/yr")

    annual_t = _annual(daily["T2M"])
    shift = st.pettitt_test(annual_t, units="°C")

    evidence = [
        {"id": "temp_trend", "label": "Average temperature", "plain": "Is the region getting warmer overall?",
         "stats": t_trend.to_dict(), "series": _series_payload(annual_t - annual_t[f"{BASE[0]}":f"{BASE[1]}"].mean())},
        {"id": "hot_days", "label": "Very hot days per year",
         "plain": f"Days hotter than {thr:.1f}°C (the hottest 5% of days in {BASE[0]}–{BASE[1]})",
         "threshold": round(thr, 2), "stats": hot_trend.to_dict(), "series": _series_payload(hot_days, 0)},
        {"id": "temp_shift", "label": "When did it change?", "plain": "Single abrupt shift in yearly mean temperature",
         "stats": shift, "exploratory_changepoints": st.pelt_changepoints(t_anom)},
    ]
    datasets = [_power_citation(header)]
    if gis is not None:
        g = gis[(gis.index >= t_anom.index[0]) & (gis.index <= t_anom.index[-1])]
        g_trend = st.trend_test(g, steps_per_year=1, units="°C")
        evidence.append({"id": "global_context", "label": "Compared with the whole planet",
                         "plain": "Global warming rate over the same years (NASA GISS)",
                         "stats": g_trend.to_dict(), "series": _series_payload(g)})
        datasets.append(GISTEMP_CITATION)

    precip_anom = st.deseasonalize(monthly["PRECTOTCORR"], BASE)
    cross = st.lagged_correlation(precip_anom, t_anom, max_lag=3)

    return {
        "case_id": f"{rid}-heat", "region": {"id": rid, **REGIONS[rid]}, "topic": "heat",
        "question": f"Is {REGIONS[rid]['name']} heating up, and since when?",
        "evidence": evidence,
        "cross_examination": [{"suspect": "Rainfall variability",
                               "question": "Do drier months explain the warm anomalies?", **cross}],
        "datasets": datasets, "caveats": CAVEATS_POWER,
    }


def rain_case(rid: str, daily: pd.DataFrame, monthly: pd.DataFrame, header) -> dict:
    p = daily["PRECTOTCORR"]
    heavy = st.annual_count_above(p, HEAVY_RAIN_MM)
    heavy_trend = st.trend_test(heavy, steps_per_year=1, units="days/yr")
    total = _annual(p, "sum")
    total_trend = st.trend_test(total, steps_per_year=1, units="mm/yr")
    max_day = p.groupby(p.index.year).max()
    max_day.index = pd.to_datetime(max_day.index.astype(str) + "-01-01")
    max_trend = st.trend_test(max_day, steps_per_year=1, units="mm/day")

    # Sanity check: the detector must "see" a documented extreme before we trust it.
    top = p.nlargest(5)
    monthly_p = monthly["PRECTOTCORR"]
    checks = [{"name": "Wettest days on record in this dataset",
               "result": [{"date": d.strftime("%Y-%m-%d"), "mm": round(float(v), 1)} for d, v in top.items()]}]
    if rid == "chennai" and "2015-12-01" in monthly_p.index.strftime("%Y-%m-%d"):
        nov_dec = monthly_p.loc["2015-11-01":"2015-12-01"].sum()
        same = monthly_p[monthly_p.index.month.isin([11, 12])].groupby(lambda d: d.year).sum()
        rank = int((same >= nov_dec).sum())
        checks.append({"name": "Does the data show the Nov–Dec 2015 Chennai floods?",
                       "result": {"nov_dec_2015_mm": round(float(nov_dec), 1), "rank_among_years": rank,
                                  "years_compared": int(len(same))}})

    return {
        "case_id": f"{rid}-rain", "region": {"id": rid, **REGIONS[rid]}, "topic": "rain",
        "question": f"Are extreme downpours becoming more common in {REGIONS[rid]['name']}?",
        "evidence": [
            {"id": "heavy_days", "label": "Heavy-rain days per year",
             "plain": f"Days with at least {HEAVY_RAIN_MM} mm of rain (India Meteorological Department's 'heavy rain')",
             "stats": heavy_trend.to_dict(), "series": _series_payload(heavy, 0)},
            {"id": "max_day", "label": "Wettest day of each year", "plain": "How intense the single worst day gets",
             "stats": max_trend.to_dict(), "series": _series_payload(max_day, 1)},
            {"id": "total", "label": "Total yearly rainfall", "plain": "More rain overall, or the same rain in fewer bursts?",
             "stats": total_trend.to_dict(), "series": _series_payload(total, 0)},
        ],
        "sanity_checks": checks,
        "datasets": [_power_citation(header)], "caveats": CAVEATS_POWER,
    }


# ---------------------------------------------------------------- MODIS cases (AppEEARS points)

MIN_TREND_YEARS = 10  # stats.trend_test's own minimum
CITY_POINTS = ("chennai_core", "chennai_omr", "chennai_tambaram", "chennai_avadi")
EDGE_POINT = "chengalpattu_edge"  # fails the reference rule (Urban/built-up in 2001 and 2024)
# Countryside controls; each must still pass the land-cover rule to join the reference.
REFERENCE_CANDIDATES = tuple(p["id"] for p in EXTRA_POINTS)
POINT_NAMES = {
    "chennai_core": "Chennai core (T. Nagar)",
    "chennai_omr": "OMR IT corridor (Sholinganallur)",
    "chennai_tambaram": "Tambaram (southern suburb)",
    "chennai_avadi": "Avadi (western suburb)",
    EDGE_POINT: "Chengalpattu (urban edge)",
    "rural_kanchipuram_west": "Kanchipuram west farmland (countryside control)",
    "rural_uthiramerur_south": "Uthiramerur south farmland (countryside control)",
    "rural_uthukottai_north": "Uthukottai north farmland (countryside control)",
    "nilgiris_ooty": "Ooty",
}
POINT_ROLES = {**{p: "city" for p in CITY_POINTS}, EDGE_POINT: "urban edge",
               **{p: "countryside control" for p in REFERENCE_CANDIDATES}}

MODIS_CITATIONS = {
    "MOD11A2": {"short_name": "MODIS MOD11A2 v6.1 (Terra land surface temperature, 8-day, 1 km)",
                "provider": "NASA LP DAAC, via AppEEARS", "url": "https://doi.org/10.5067/MODIS/MOD11A2.061"},
    "MYD11A2": {"short_name": "MODIS MYD11A2 v6.1 (Aqua land surface temperature, 8-day, 1 km)",
                "provider": "NASA LP DAAC, via AppEEARS", "url": "https://doi.org/10.5067/MODIS/MYD11A2.061"},
    "MOD13Q1": {"short_name": "MODIS MOD13Q1 v6.1 (Terra vegetation index, 16-day, 250 m)",
                "provider": "NASA LP DAAC, via AppEEARS", "url": "https://doi.org/10.5067/MODIS/MOD13Q1.061"},
    "MCD12Q1": {"short_name": "MODIS MCD12Q1 v6.1 (Terra+Aqua land cover type, yearly, 500 m)",
                "provider": "NASA LP DAAC, via AppEEARS", "url": "https://doi.org/10.5067/MODIS/MCD12Q1.061"},
}

CAVEATS_MODIS = [
    "Each point is a single MODIS pixel (250 m for greenness, 1 km for land temperature): one new building, "
    "cleared plot or flooded field inside it can look like a trend.",
    "Clouds hide the ground, most of all in the monsoon: months without enough clear views are left out, "
    "and a year counts only with at least 8 valid months.",
    "MODIS starts in 2000 (Aqua in mid-2002), so these trends cover about 25 years, shorter than the "
    "1981 to 2025 weather record.",
]
CAVEAT_LST = (
    "Land surface temperature is how hot the ground is, not the air temperature a weather station "
    "measures. Terra has drifted to an earlier overpass time since about 2020 as it nears the end of its "
    "mission; the Aqua cross-check guards against reading that drift as a trend."
)


UHI_LEAD_REASON = (
    "Lead, not a finding: every farmland control is classed Cropland in both 2001 and 2024, but a 500 m "
    "land-cover class can't see smaller changes inside the pixel (a new building, a switch to irrigation), "
    "and the controls are about 40 to 75 km inland, where nights can differ from the coast for other reasons."
)
REFERENCE_RULE = (f"A countryside reference must be MODIS land cover class {landcover.CROPLAND} (Cropland) "
                  f"in both {landcover.RULE_YEARS[0]} and {landcover.RULE_YEARS[1]}.")


def _agreement_flags(agreement: list[dict]) -> list[dict]:
    """Points where Terra and Aqua agree on direction but not on the size of the night trend."""
    flags = []
    for r in agreement:
        if not r.get("slopes_differ"):
            continue
        t, a = r["terra_slope_per_decade"], r["aqua_slope_per_decade"]
        flags.append({
            "point": r["point"], "issue": "terra_aqua_slope_mismatch",
            "terra_slope_per_decade": t, "aqua_slope_per_decade": a,
            "note": (f"Terra and Aqua disagree on how fast {POINT_NAMES[r['point']]} is warming at night "
                     f"({t:+.2f} vs {a:+.2f} °C per decade, {r['first_year']}–{r['last_year']}); "
                     "treat the size of this trend with caution."),
        })
    return flags


def _point_meta(point: str) -> dict:
    p = next(x for x in (*MODIS_POINTS, *EXTRA_POINTS) if x["id"] == point)
    return {"id": point, "name": POINT_NAMES.get(point, point), "lat": p["latitude"], "lon": p["longitude"]}


def land_cover_exhibit(lc: pd.DataFrame, points: tuple[str, ...]) -> dict:
    """What MODIS classed each point as in 2001 vs 2024. Not a trend test: kept out of the FDR family
    (and out of `evidence`, whose items are all tests)."""
    first, last = landcover.RULE_YEARS
    return {
        "id": "land_cover", "label": f"Land cover in {first} vs {last}",
        "plain": "What the satellite classified the ground at each spot as, at the start and end of the record",
        "source_note": landcover.SOURCE_NOTE,
        "points": [{"point": _point_meta(p), "role": POINT_ROLES.get(p), **landcover.classes(lc, p),
                    "passes_reference_rule": landcover.passes_reference_rule(lc, p)} for p in points],
    }


def _trend_evidence(eid: str, label: str, plain: str, yearly: pd.Series, units: str, point: str,
                    report: modis.CleaningReport | None, skipped: list[dict]) -> dict | None:
    """A trend exhibit, or None (recorded in `skipped`) when too few clear years survive cleaning."""
    if len(yearly) < MIN_TREND_YEARS:
        skipped.append({"id": eid, "reason": f"only {len(yearly)} years with >= "
                        f"{modis.MIN_MONTHS_PER_YEAR} valid months (needs {MIN_TREND_YEARS})"})
        return None
    ev = {"id": eid, "label": label, "plain": plain, "point": _point_meta(point),
          "stats": st.trend_test(yearly, steps_per_year=1, units=units).to_dict(),
          "series": _series_payload(yearly, 4 if units == "NDVI" else 3)}
    return {**ev, "cleaning": report.to_dict()} if report else ev


NDVI_GAP_LEAD_REASON = (
    "Lead, not a finding: farmland greenness rises and falls with crop cycles, irrigation and fallow years, "
    "so a city-minus-farmland gap moves with farming as much as with the city."
)


def _ndvi_evidence(point: str, yearly: pd.Series, report, skipped: list[dict]) -> dict | None:
    return _trend_evidence(
        f"ndvi_{point}", f"Greenness: {POINT_NAMES[point]}",
        "Is this spot getting greener or browner? (NDVI, a satellite greenness index: "
        "about 0 is bare ground or buildings, near 1 is dense green cover)",
        yearly, "NDVI", point, report, skipped)


def greenery_case(rid: str, raw_dirs: tuple[Path, ...], points: tuple[str, ...], lc: pd.DataFrame | None = None,
                  controls: tuple[str, ...] = ()) -> dict:
    """Greenness trend per point. With `controls` (and land cover), the countryside controls join as
    their own exhibits, and each city point gets a city-minus-farmland gap, shown as a lead."""
    ndvi = pd.concat([modis.load_ndvi(d) for d in raw_dirs], ignore_index=True)
    evidence, reports, skipped, yearly = [], [], [], {}
    for point in (*points, *controls):
        _, yearly[point], report = modis.point_series(ndvi, point, "NDVI", "ndvi")
        reports.append(report.to_dict())
        ev = _ndvi_evidence(point, yearly[point], report, skipped)
        if ev:
            evidence.append({**ev, "role": POINT_ROLES[point]} if controls else ev)
    case = {
        "case_id": f"{rid}-greenery", "region": {"id": rid, **REGIONS[rid]}, "topic": "greenery",
        "question": f"Is {REGIONS[rid]['name']} losing its green cover?",
        "primary_evidence": [e["id"] for e in evidence],
        "evidence": evidence,
        "data_quality": {"points": reports, "skipped_exhibits": skipped,
                         "skipped_points": sorted(modis.SKIP_POINTS)},
        "datasets": [MODIS_CITATIONS["MOD13Q1"]], "caveats": CAVEATS_MODIS,
    }
    if lc is None:
        return case
    case = {**case, "land_cover": land_cover_exhibit(lc, (*points, *controls)),
            "datasets": [*case["datasets"], MODIS_CITATIONS["MCD12Q1"]]}
    if not controls:
        return case
    reference, reference_meta = _reference(lc, yearly)
    gap_exhibits = [_trend_evidence(
        f"ndvi_gap_{point}", f"City minus countryside greenness: {POINT_NAMES[point]}",
        "Is this spot losing green faster than the farmland reference (the average of three spots classed "
        "as cropland in both 2001 and 2024)? A falling gap means the city spot is browning relative to farmland.",
        modis.gap_yearly(yearly[point], reference), "NDVI", point, None, skipped)
        for point in points if point in CITY_POINTS]
    gaps = [{**ev, "lead": {"reason": NDVI_GAP_LEAD_REASON}} for ev in gap_exhibits if ev]
    return {**case, "evidence": [*case["evidence"], *gaps], "reference": reference_meta,
            "data_quality": {**case["data_quality"],
                             "reference_rule": [{"point": p, "passes": landcover.passes_reference_rule(lc, p)}
                                                for p in (*points, *controls)]}}


def _load_night_lst(raw_dirs: tuple[Path, ...], product: str) -> pd.DataFrame:
    return pd.concat([modis.load_lst(d, product, "Night") for d in raw_dirs], ignore_index=True)


def _reference(lc: pd.DataFrame, yearly: dict[str, pd.Series]) -> tuple[pd.Series, dict]:
    """Mean of the controls that pass the land-cover rule, in years with enough of them."""
    points = [p for p in REFERENCE_CANDIDATES if landcover.passes_reference_rule(lc, p)]
    series = modis.reference_yearly({p: yearly[p] for p in points})
    return series, {
        "points": points, "rule": REFERENCE_RULE,
        "min_points_per_year": modis.MIN_REFERENCE_POINTS_PER_YEAR,
        "years": int(len(series)),
        "first_year": int(series.index.min().year) if len(series) else None,
        "last_year": int(series.index.max().year) if len(series) else None,
    }


def night_heat_case(rid: str, raw_dirs: tuple[Path, ...], lc: pd.DataFrame) -> dict:
    terra = _load_night_lst(raw_dirs, "MOD11A2")
    aqua = _load_night_lst(raw_dirs, "MYD11A2")
    points = (*CITY_POINTS, EDGE_POINT, *REFERENCE_CANDIDATES)
    yearly, evidence, reports, skipped, agreement = {}, [], [], [], []
    for point in points:
        monthly, yearly[point], report = modis.point_series(terra, point, "Terra night LST", "lst")
        reports.append(report.to_dict())
        ev = _trend_evidence(
            f"night_lst_{point}", f"Night surface temperature: {POINT_NAMES[point]}",
            "Is the ground here staying warmer at night? (Terra's land-surface temperature, "
            "measured around 10:30 pm)", yearly[point], "°C", point, report, skipped)
        if ev:
            evidence.append({**ev, "role": POINT_ROLES[point]})
        aqua_monthly, _, aqua_report = modis.point_series(aqua, point, "Aqua night LST", "lst")
        reports.append(aqua_report.to_dict())
        agreement.append({"point": point, **modis.satellite_agreement(monthly, aqua_monthly)})
    reference, reference_meta = _reference(lc, yearly)
    for point in CITY_POINTS:
        ev = _trend_evidence(
            f"uhi_{point}", f"City minus countryside: {POINT_NAMES[point]}",
            "How much warmer this spot stays at night than the farmland reference (the average of three "
            "spots classed as cropland in both 2001 and 2024). A widening gap means the city's heat island "
            "is growing.", modis.gap_yearly(yearly[point], reference), "°C", point, None, skipped)
        if ev:
            evidence.append({**ev, "lead": {"reason": UHI_LEAD_REASON}})
    return {
        "case_id": f"{rid}-night-heat", "region": {"id": rid, **REGIONS[rid]}, "topic": "night-heat",
        "question": f"Are {REGIONS[rid]['name']}'s nights warming faster than the countryside's?",
        # The finding is region-wide night warming (every point, both satellites); the city-minus-
        # countryside gaps stay in the FDR family but are shown as leads (see UHI_LEAD_REASON).
        "primary_evidence": [e["id"] for e in evidence if e["id"].startswith("night_lst_")],
        "evidence": evidence,
        "reference": reference_meta,
        "land_cover": land_cover_exhibit(lc, points),
        "sanity_checks": [{"name": "Do Terra and Aqua agree? (night land temperature, same points)",
                           "result": agreement}],
        "flags": _agreement_flags(agreement),
        "data_quality": {"points": reports, "skipped_exhibits": skipped,
                         "skipped_points": sorted(modis.SKIP_POINTS),
                         "reference_rule": [{"point": p, "passes": landcover.passes_reference_rule(lc, p)}
                                            for p in points]},
        "datasets": [MODIS_CITATIONS["MOD11A2"], MODIS_CITATIONS["MYD11A2"], MODIS_CITATIONS["MCD12Q1"]],
        "caveats": [*CAVEATS_MODIS, CAVEAT_LST],
    }


def modis_cases(region_ids: list[str], raw_dir: Path, extra_dir: Path) -> list[dict]:
    """MODIS cases for the regions asked for, if the AppEEARS results have been downloaded.
    The Chennai cases also need the extra request (countryside controls + land cover) in `extra_dir`."""
    if not raw_dir.exists():
        print(f"no MODIS data in {raw_dir}; run `python -m pipeline.appeears download` for the satellite cases")
        return []
    cases = []
    if "chennai" in region_ids:
        lc = landcover.load(extra_dir)
        both = (raw_dir, extra_dir / "extra-points")
        cases += [greenery_case("chennai", both, (*CITY_POINTS, EDGE_POINT), lc, REFERENCE_CANDIDATES),
                  night_heat_case("chennai", both, lc)]
    if "nilgiris" in region_ids:
        cases.append(greenery_case("nilgiris", (raw_dir,), ("nilgiris_ooty",)))
    return cases


def _strength(p: float, survives: bool) -> str:
    return "strong" if survives and p < 0.01 else "moderate" if survives else "inconclusive"


PLANET_CONTEXT_ID = "global_context"


def fdr_family(cases: list[dict]) -> list[dict]:
    """The tests Benjamini-Hochberg corrects together: every regional trend test (not the planet line)."""
    return sorted(({"case_id": c["case_id"], "evidence_id": ev["id"]}
                   for c in cases for ev in c["evidence"]
                   if "trend" in ev.get("stats", {}) and ev["id"] != PLANET_CONTEXT_ID),
                  key=lambda t: (t["case_id"], t["evidence_id"]))


def check_frozen_family(cases: list[dict], frozen: list[dict]) -> None:
    """Refuse to correct a family that differs from the frozen one: adding or dropping a test moves verdicts."""
    key = lambda t: f"{t['case_id']}/{t['evidence_id']}"  # noqa: E731
    now, fixed = {key(t) for t in fdr_family(cases)}, {key(t) for t in frozen}
    if now == fixed:
        return
    raise ValueError(
        "The FDR family differs from the frozen one in data/fdr_family.json "
        f"(missing: {', '.join(sorted(fixed - now)) or '-'}; new: {', '.join(sorted(now - fixed)) or '-'}). "
        "Build every region, or change the family on purpose with --freeze-fdr and say why in docs/METHODS.md.")


def apply_fdr(cases: list[dict], alpha: float = 0.05) -> None:
    """Benjamini-Hochberg across every regional trend test in this run; annotate in place.

    `trend` becomes the single label the UI and narration use: a direction only if the result
    survives the correction, otherwise "no clear trend". The uncorrected label is kept alongside.
    Global context (GISTEMP) is a reference line, not a claim about the region: it's tested on its
    own and left out of the correction so it isn't counted once per case.
    """
    regional, context = [], []
    for c in cases:
        for ev in c["evidence"]:
            st_ = ev.get("stats", {})
            if "trend" not in st_:
                continue
            (context if ev["id"] == PLANET_CONTEXT_ID else regional).append(st_)
    keep = st.benjamini_hochberg([r["p_value"] for r in regional], alpha)
    for r, k in zip(regional, keep):
        r["trend_uncorrected"] = r["trend"]
        r["survives_fdr"] = bool(k)
        r["trend"] = r["trend"] if k else "no clear trend"
        r["verdict_strength"] = _strength(r["p_value"], bool(k))
    for r in context:
        r["role"] = "context (not part of the FDR family)"
        r["trend_uncorrected"] = r["trend"]
        r["survives_fdr"] = None
        r["verdict_strength"] = _strength(r["p_value"], r["p_value"] < alpha)


def build(region_ids: list[str], freeze: bool = False) -> list[dict]:
    """Build the cases. With `freeze`, (re)write the frozen FDR family from this build instead of checking it."""
    CASES.mkdir(parents=True, exist_ok=True)
    gis = load_gistemp() if (RAW / "gistemp_global.csv").exists() else None
    cases = []
    for rid in region_ids:
        f = RAW / f"power_daily_{rid}.json"
        if not f.exists():
            print(f"no raw data for {rid}; run `python -m pipeline.fetch power` first")
            continue
        header = json.loads(f.read_text()).get("header")
        daily = load_power_daily(rid)
        monthly = daily_to_monthly(daily)
        cases += [heat_case(rid, daily, monthly, header, gis), rain_case(rid, daily, monthly, header)]
    cases += modis_cases(region_ids, RAW / "appeears", RAW / "appeears_extra")
    if freeze and FDR_FAMILY_FILE is not None:
        FDR_FAMILY_FILE.write_text(json.dumps(fdr_family(cases), indent=2) + "\n")
        print(f"froze the FDR family: {len(fdr_family(cases))} tests in {FDR_FAMILY_FILE.name}")
    elif FDR_FAMILY_FILE is not None and FDR_FAMILY_FILE.exists():
        check_frozen_family(cases, json.loads(FDR_FAMILY_FILE.read_text()))
    apply_fdr(cases)  # one family: every regional trend test, weather and satellite alike
    generated = date.today().isoformat()
    for c in cases:
        c["generated"] = generated
        (CASES / f"{c['case_id']}.json").write_text(json.dumps(c, indent=2, ensure_ascii=False, default=_np))
        print(f"wrote {c['case_id']}.json")
    index = [{"case_id": c["case_id"], "question": c["question"], "region": c["region"]["name"],
              "topic": c["topic"]} for c in cases]
    (CASES / "index.json").write_text(json.dumps(index, indent=2, ensure_ascii=False))
    return cases


def _np(o):
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    if isinstance(o, np.bool_):
        return bool(o)
    raise TypeError(type(o))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--freeze-fdr"]
    build(args or list(REGIONS), freeze="--freeze-fdr" in sys.argv[1:])
