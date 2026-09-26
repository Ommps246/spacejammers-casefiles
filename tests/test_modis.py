"""MODIS (AppEEARS) loading, cleaning and cases, on small synthetic CSVs in the AppEEARS format:
same column names, bit-string QC encodings, kelvin LST, fill values 0.0 (LST) and -3000 (NDVI).

Run:  python -m pytest -q
"""
import json
import sys

import numpy as np
import pandas as pd
import pytest

from pipeline import build_cases, fetch, landcover, modis
from tests.test_pipeline import _fake_power

RNG = np.random.default_rng(7)
START, YEARS = "2003-01-01", 14


def _dates(step_days: int) -> pd.DatetimeIndex:
    return pd.date_range(START, periods=int(YEARS * 365.25 / step_days), freq=f"{step_days}D")


def _lst_rows(product: str, point: str, night_k, dates, cloudy=lambda d: False) -> list[dict]:
    rows = []
    for d in dates:
        k = night_k(d)
        clear = not cloudy(d)
        rows.append({
            "Category": "chennai", "ID": point, "Latitude": "13.0", "Longitude": "80.2",
            "Date": d.strftime("%Y-%m-%d"), "MODIS_Tile": "h25v07",
            f"{product}_061_LST_Day_1km": f"{k + 10:.2f}" if clear else "0.0",
            f"{product}_061_LST_Night_1km": f"{k:.2f}" if clear else "0.0",
            f"{product}_061_QC_Day_MODLAND": "0b00" if clear else "0b10",
            f"{product}_061_QC_Day_LST_Error_Flag": "0b00",
            f"{product}_061_QC_Night_MODLAND": "0b00" if clear else "0b10",
            f"{product}_061_QC_Night_LST_Error_Flag": "0b00",
        })
    return rows


def _write(path, rows: list[dict]) -> None:
    pd.DataFrame(rows).to_csv(path, index=False)


def _season(d) -> float:
    return 3 * np.sin(2 * np.pi * (d.month - 1) / 12)


def _years(d) -> float:
    return (d - pd.Timestamp(START)).days / 365.25


def _monsoon_cloud(d) -> bool:  # October to December is half cloudy
    return d.month in (10, 11, 12) and RNG.random() < 0.5


CONTROLS = ("rural_kanchipuram_west", "rural_uthiramerur_south", "rural_uthukottai_north")
# MCD12Q1 LC_Type1 in 2001 and 2024 (12 Cropland, 13 Urban/built-up), as in the real download
LAND_COVER = {"chennai_core": (13, 13), "chennai_omr": (12, 13), "chennai_tambaram": (12, 12),
              "chennai_avadi": (13, 13), "rural_chengalpattu": (13, 13), "pulicat_shore": (17, 17),
              "nilgiris_ooty": (9, 9), **{c: (12, 12) for c in CONTROLS}}


def _landcover_rows(points) -> list[dict]:
    rows = []
    for point in points:
        first, last = LAND_COVER[point]
        for year in range(2001, 2025):
            rows.append({"Category": "x", "ID": point, "Latitude": "0", "Longitude": "0",
                         "Date": f"{year}-01-01", "MODIS_Tile": "h25v07",
                         "MCD12Q1_061_LC_Type1": str(first if year < 2012 else last)})
    return rows


def _control_cloud(point):
    """Uthiramerur is fully clouded in 2008, so that year has only 2 of the 3 controls."""
    def cloudy(d):
        return (point == "rural_uthiramerur_south" and d.year == 2008) or _monsoon_cloud(d)
    return cloudy


def fake_appeears(raw) -> None:
    """Chennai city points warm 0.4 °C/decade faster at night than the countryside; Aqua mirrors Terra.
    Chengalpattu (downloaded under its old id rural_chengalpattu) warms like the city; the three
    cropland controls in appeears_extra/ don't warm."""
    out = raw / "appeears"
    out.mkdir(parents=True)
    extra = raw / "appeears_extra" / "extra-points"
    extra.mkdir(parents=True)
    lc_dir = raw / "appeears_extra" / "landcover"
    lc_dir.mkdir(parents=True)
    city = ("chennai_core", "chennai_omr", "chennai_tambaram", "chennai_avadi")
    for product in ("MOD11A2", "MYD11A2"):
        noise = 0.15 if product == "MOD11A2" else 0.2
        controls = []
        for point in CONTROLS:
            controls += _lst_rows(product, point,
                                  lambda d, n=noise: 297 + _season(d) + RNG.normal(0, n),
                                  _dates(8), _control_cloud(point))
        _write(extra / f"spacejammers-extra-points-{product}-061-results.csv", controls)
        rows = []
        for point in (*city, "rural_chengalpattu"):
            growth = 0.04
            rows += _lst_rows(product, point,
                              lambda d, g=growth, n=noise: 298 + _season(d) + g * _years(d) + RNG.normal(0, n),
                              _dates(8), _monsoon_cloud)
        rows += _lst_rows(product, "pulicat_shore", lambda d: 0.0, _dates(8), lambda d: True)
        _write(out / f"spacejammers-casefiles-{product}-061-results.csv", rows)

    p = "MOD13Q1_061__250m_16_days_"
    rows = []
    for point in (*city, "rural_chengalpattu", "nilgiris_ooty"):
        for d in _dates(16):
            rows.append({"Category": "x", "ID": point, "Latitude": "0", "Longitude": "0",
                         "Date": d.strftime("%Y-%m-%d"), "MODIS_Tile": "h25v07",
                         f"{p}NDVI": f"{0.5 - 0.004 * _years(d) + RNG.normal(0, 0.02):.4f}",
                         f"{p}VI_Quality_MODLAND": "0b00", f"{p}VI_Quality_Mixed_Clouds": "0b0"})
    rows.append({**rows[0], "ID": "pulicat_shore", f"{p}NDVI": "-3000.0", f"{p}VI_Quality_MODLAND": "0b11"})
    _write(out / f"spacejammers-casefiles-{'MOD13Q1'}-061-results.csv", rows)
    _write(extra / "spacejammers-extra-points-MCD12Q1-061-results.csv", _landcover_rows(CONTROLS))
    control_ndvi = [{"Category": "reference", "ID": c, "Latitude": "0", "Longitude": "0",
                     "Date": d.strftime("%Y-%m-%d"), "MODIS_Tile": "h25v07",
                     f"{p}NDVI": f"{0.6 + RNG.normal(0, 0.02):.4f}",
                     f"{p}VI_Quality_MODLAND": "0b00", f"{p}VI_Quality_Mixed_Clouds": "0b0"}
                    for c in CONTROLS for d in _dates(16)]
    _write(extra / "spacejammers-extra-points-MOD13Q1-061-results.csv", control_ndvi)
    main_points = (*city, "rural_chengalpattu", "pulicat_shore", "nilgiris_ooty")
    _write(lc_dir / "spacejammers-landcover-MCD12Q1-061-results.csv", _landcover_rows(main_points))


# ------------------------------------------------------------------ cleaning


def test_lst_drops_fill_and_poor_quality_and_converts_kelvin_to_celsius(tmp_path):
    p = "MOD11A2_061_"
    base = {"Category": "c", "ID": "chennai_core", "Latitude": "13", "Longitude": "80", "MODIS_Tile": "h25v07",
            f"{p}LST_Day_1km": "300.0", f"{p}QC_Day_MODLAND": "0b00", f"{p}QC_Day_LST_Error_Flag": "0b00"}
    rows = [
        {**base, "Date": "2010-01-01", f"{p}LST_Night_1km": "300.0", f"{p}QC_Night_MODLAND": "0b00", f"{p}QC_Night_LST_Error_Flag": "0b00"},
        {**base, "Date": "2010-01-09", f"{p}LST_Night_1km": "0.0", f"{p}QC_Night_MODLAND": "0b10", f"{p}QC_Night_LST_Error_Flag": "0b00"},
        {**base, "Date": "2010-01-17", f"{p}LST_Night_1km": "299.0", f"{p}QC_Night_MODLAND": "0b01", f"{p}QC_Night_LST_Error_Flag": "0b10"},
        {**base, "Date": "2010-01-25", f"{p}LST_Night_1km": "298.0", f"{p}QC_Night_MODLAND": "0b01", f"{p}QC_Night_LST_Error_Flag": "0b01"},
    ]
    _write(tmp_path / "x-MOD11A2-061-results.csv", rows)

    lst = modis.load_lst(tmp_path, "MOD11A2", "Night")

    kept = lst[lst["good"]]
    assert kept["date"].dt.day.tolist() == [1, 25]  # fill (cloud) and the >2 K error pixel are out
    assert kept["value"].tolist() == pytest.approx([300.0 - 273.15, 298.0 - 273.15])


def test_ndvi_drops_fill_and_mixed_clouds(tmp_path):
    p = "MOD13Q1_061__250m_16_days_"
    base = {"Category": "c", "ID": "chennai_core", "Latitude": "13", "Longitude": "80", "MODIS_Tile": "h25v07"}
    rows = [
        {**base, "Date": "2010-01-01", f"{p}NDVI": "0.41", f"{p}VI_Quality_MODLAND": "0b00", f"{p}VI_Quality_Mixed_Clouds": "0b0"},
        {**base, "Date": "2010-01-17", f"{p}NDVI": "-3000", f"{p}VI_Quality_MODLAND": "0b11", f"{p}VI_Quality_Mixed_Clouds": "0b0"},
        {**base, "Date": "2010-02-02", f"{p}NDVI": "0.30", f"{p}VI_Quality_MODLAND": "0b01", f"{p}VI_Quality_Mixed_Clouds": "0b1"},
    ]
    _write(tmp_path / "x-MOD13Q1-061-results.csv", rows)

    ndvi = modis.load_ndvi(tmp_path)

    assert ndvi.loc[ndvi["good"], "value"].tolist() == [0.41]


def test_water_point_is_skipped(tmp_path):
    fake_appeears(tmp_path)
    for loaded in (modis.load_lst(tmp_path / "appeears", "MOD11A2", "Night"), modis.load_ndvi(tmp_path / "appeears")):
        assert "pulicat_shore" not in set(loaded["point"])


def test_old_chengalpattu_id_is_read_as_chengalpattu_edge(tmp_path):
    fake_appeears(tmp_path)

    points = set(modis.load_lst(tmp_path / "appeears", "MOD11A2", "Night")["point"])

    assert "chengalpattu_edge" in points and "rural_chengalpattu" not in points


def test_months_need_two_clear_composites_and_years_need_eight_months():
    dates = pd.to_datetime(["2010-01-05", "2010-01-20", "2010-02-10"])  # January: 2 clear, February: 1
    composites = pd.DataFrame({"point": "p", "date": dates, "value": [20.0, 22.0, 30.0], "good": True})
    monthly, months_seen, _ = modis.monthly_means(composites, "p", modis.MIN_COMPOSITES_PER_MONTH["lst"])
    assert monthly.index.month.tolist() == [1] and months_seen == 2

    idx = pd.date_range("2010-01-01", "2011-12-01", freq="MS")
    series = pd.Series(1.0, index=idx).drop(pd.date_range("2011-01-01", "2011-05-01", freq="MS"))  # 2011: 7 months
    yearly, years_seen = modis.yearly_anomalies(series)
    assert yearly.index.year.tolist() == [2010] and years_seen == 2


# ------------------------------------------------------------------ detection


def test_reference_is_the_yearly_mean_of_controls_in_years_with_at_least_two():
    years = pd.to_datetime(["2008-01-01", "2009-01-01", "2010-01-01"])
    controls = {
        "a": pd.Series([1.0, 2.0, 3.0], index=years),
        "b": pd.Series([3.0, 4.0], index=years[1:]),     # missing 2008
        "c": pd.Series([5.0], index=years[2:]),          # only 2010
    }

    reference = modis.reference_yearly(controls)

    assert reference.index.year.tolist() == [2009, 2010]  # 2008 has 1 of 3: dropped
    assert reference.tolist() == pytest.approx([2.5, 4.0])


def test_gap_is_city_minus_reference_on_shared_years():
    years = pd.to_datetime(["2008-01-01", "2009-01-01", "2010-01-01"])
    city = pd.Series([1.0, 2.0, 3.0], index=years)
    reference = pd.Series([0.5, 1.0], index=years[1:])

    gap = modis.gap_yearly(city, reference)

    assert gap.index.year.tolist() == [2009, 2010] and gap.tolist() == pytest.approx([1.5, 2.0])


def test_planted_heat_island_growth_shows_in_the_city_minus_countryside_gap(tmp_path):
    fake_appeears(tmp_path)
    lst = pd.concat([modis.load_lst(tmp_path / "appeears", "MOD11A2", "Night"),
                     modis.load_lst(tmp_path / "appeears_extra" / "extra-points", "MOD11A2", "Night")])
    _, city, _ = modis.point_series(lst, "chennai_core", "night", "lst")
    controls = {c: modis.point_series(lst, c, "night", "lst")[1] for c in CONTROLS}

    reference = modis.reference_yearly(controls)
    result = modis.st.trend_test(modis.gap_yearly(city, reference), steps_per_year=1, units="°C")

    assert 2008 in reference.index.year  # 2 of 3 controls is enough
    assert result.trend == "increasing" and result.significant
    assert result.slope_per_decade == pytest.approx(0.4, abs=0.12)
    assert not modis.st.trend_test(reference, steps_per_year=1, units="°C").significant


# ------------------------------------------------------------------ land cover


def test_reference_rule_needs_cropland_in_both_2001_and_2024(tmp_path):
    fake_appeears(tmp_path)
    lc = landcover.load(tmp_path / "appeears_extra")

    assert landcover.passes_reference_rule(lc, "rural_kanchipuram_west")
    assert not landcover.passes_reference_rule(lc, "chengalpattu_edge")   # urban both years
    assert not landcover.passes_reference_rule(lc, "chennai_omr")         # cropland in 2001 only
    assert not landcover.passes_reference_rule(lc, "no_such_point")       # no land-cover rows


def test_land_cover_classes_for_2001_and_2024_with_names(tmp_path):
    fake_appeears(tmp_path)
    lc = landcover.load(tmp_path / "appeears_extra")

    omr = landcover.classes(lc, "chennai_omr")

    assert omr == {"class_2001": {"code": 12, "name": "Cropland"},
                   "class_2024": {"code": 13, "name": "Urban/built-up"}, "changed": True}


def test_terra_and_aqua_agree_when_they_see_the_same_ground(tmp_path):
    fake_appeears(tmp_path)
    terra, _, _ = modis.point_series(modis.load_lst(tmp_path / "appeears", "MOD11A2", "Night"), "chennai_omr", "t", "lst")
    aqua, _, _ = modis.point_series(modis.load_lst(tmp_path / "appeears", "MYD11A2", "Night"), "chennai_omr", "a", "lst")

    check = modis.satellite_agreement(terra, aqua)

    assert check["monthly_correlation"] > 0.5
    assert check["same_direction"] is True


def test_slopes_differ_flags_a_size_mismatch_but_not_small_differences():
    assert modis.slopes_differ(0.613, 0.356)        # Avadi on real data: 42% apart
    assert not modis.slopes_differ(0.727, 0.639)    # Tambaram: 12% apart
    assert not modis.slopes_differ(0.0, 0.0)


def test_mismatch_becomes_a_case_flag_with_both_slopes():
    agreement = [
        {"point": "chennai_avadi", "slopes_differ": True, "terra_slope_per_decade": 0.613,
         "aqua_slope_per_decade": 0.356, "first_year": 2003, "last_year": 2025},
        {"point": "chennai_core", "slopes_differ": False},
    ]

    flags = build_cases._agreement_flags(agreement)

    assert [f["point"] for f in flags] == ["chennai_avadi"]
    assert "+0.61 vs +0.36 °C per decade, 2003–2025" in flags[0]["note"]


def test_extra_request_adds_three_countryside_points_and_land_cover_for_everyone():
    from pipeline import appeears

    extra = appeears.extra_payloads()

    new, lc = extra["extra-points"]["params"], extra["landcover"]["params"]
    assert [c["id"] for c in new["coordinates"]] == [p["id"] for p in appeears.EXTRA_POINTS]
    assert appeears.LANDCOVER in new["layers"] and len(new["layers"]) == len(appeears.LAYERS) + 1
    assert lc["layers"] == [appeears.LANDCOVER] and lc["coordinates"] == appeears.POINTS
    assert lc["dates"] == [{"startDate": "01-01-2001", "endDate": "12-31-2024"}]
    assert not {p["id"] for p in appeears.EXTRA_POINTS} & {p["id"] for p in appeears.POINTS}


# ------------------------------------------------------------------ end-to-end


def test_build_adds_the_modis_cases_to_the_same_fdr_family(tmp_path, monkeypatch):
    raw = _fake_power(tmp_path)
    fake_appeears(raw)
    monkeypatch.setattr(fetch, "RAW", raw)
    monkeypatch.setattr(build_cases, "RAW", raw)
    monkeypatch.setattr(build_cases, "CASES", tmp_path / "cases")

    cases = build_cases.build(["chennai", "nilgiris"])

    ids = {c["case_id"] for c in cases}
    assert {"chennai-greenery", "chennai-night-heat", "nilgiris-greenery"} <= ids
    night = json.loads((tmp_path / "cases" / "chennai-night-heat.json").read_text())
    assert {e["id"] for e in night["evidence"]} >= {"night_lst_chennai_core", "uhi_chennai_core", "night_lst_chengalpattu_edge"}
    assert night["sanity_checks"][0]["result"][0]["point"] == "chennai_core"
    assert night["data_quality"]["skipped_points"] == ["pulicat_shore"]
    family = [e["stats"] for c in cases for e in c["evidence"] if "trend" in e["stats"] and e["id"] != "global_context"]
    assert all(isinstance(s["survives_fdr"], bool) for s in family)  # every regional test, weather and satellite
    assert any(e["id"].startswith("uhi_") and e["stats"]["survives_fdr"] for e in night["evidence"])
    # headline = region-wide night warming; the city-minus-countryside gaps are leads
    assert night["primary_evidence"] and all(i.startswith("night_lst_") for i in night["primary_evidence"])
    assert all("lead" in e for e in night["evidence"] if e["id"].startswith("uhi_"))
    # the fake Aqua mirrors Terra; the flat controls' near-zero slopes can still differ by the ratio test
    assert not [f for f in night["flags"] if f["point"] in build_cases.CITY_POINTS]


def test_chengalpattu_is_an_urban_edge_exhibit_and_never_the_reference(tmp_path, monkeypatch):
    raw = _fake_power(tmp_path)
    fake_appeears(raw)
    monkeypatch.setattr(fetch, "RAW", raw)
    monkeypatch.setattr(build_cases, "RAW", raw)
    monkeypatch.setattr(build_cases, "CASES", tmp_path / "cases")

    cases = {c["case_id"]: c for c in build_cases.build(["chennai"])}

    night = cases["chennai-night-heat"]
    by_id = {e["id"]: e for e in night["evidence"]}
    assert "urban edge" in by_id["night_lst_chengalpattu_edge"]["label"]
    assert {f"night_lst_{c}" for c in CONTROLS} <= set(by_id)
    assert {i for i in by_id if i.startswith("uhi_")} == {f"uhi_{p}" for p in build_cases.CITY_POINTS}
    assert night["reference"]["points"] == list(CONTROLS)
    assert night["reference"]["min_points_per_year"] == 2
    rule = {r["point"]: r["passes"] for r in night["data_quality"]["reference_rule"]}
    assert rule["chengalpattu_edge"] is False and all(rule[c] for c in CONTROLS)


def test_a_control_that_fails_the_land_cover_rule_is_dropped_from_the_reference(tmp_path, monkeypatch):
    raw = _fake_power(tmp_path)
    LAND_COVER_WITH_BUILT_UP_CONTROL = {**LAND_COVER, "rural_uthukottai_north": (12, 13)}
    monkeypatch.setattr(sys.modules[__name__], "LAND_COVER", LAND_COVER_WITH_BUILT_UP_CONTROL)
    fake_appeears(raw)
    monkeypatch.setattr(fetch, "RAW", raw)
    monkeypatch.setattr(build_cases, "RAW", raw)
    monkeypatch.setattr(build_cases, "CASES", tmp_path / "cases")

    night = {c["case_id"]: c for c in build_cases.build(["chennai"])}["chennai-night-heat"]

    assert night["reference"]["points"] == ["rural_kanchipuram_west", "rural_uthiramerur_south"]


def test_each_chennai_satellite_case_carries_the_land_cover_exhibit(tmp_path, monkeypatch):
    raw = _fake_power(tmp_path)
    fake_appeears(raw)
    monkeypatch.setattr(fetch, "RAW", raw)
    monkeypatch.setattr(build_cases, "RAW", raw)
    monkeypatch.setattr(build_cases, "CASES", tmp_path / "cases")

    cases = {c["case_id"]: c for c in build_cases.build(["chennai"])}

    for cid in ("chennai-greenery", "chennai-night-heat"):
        lc = cases[cid]["land_cover"]
        assert lc["source_note"] == "MODIS land cover classification (500 m), evidence not proof"
        omr = next(p for p in lc["points"] if p["point"]["id"] == "chennai_omr")
        assert (omr["class_2001"]["name"], omr["class_2024"]["name"]) == ("Cropland", "Urban/built-up")
    night_points = [p["point"]["id"] for p in cases["chennai-night-heat"]["land_cover"]["points"]]
    assert set(CONTROLS) <= set(night_points) and "chengalpattu_edge" in night_points


def test_greenery_case_has_countryside_controls_and_lead_gaps_in_the_same_fdr_family(tmp_path, monkeypatch):
    raw = _fake_power(tmp_path)
    fake_appeears(raw)
    monkeypatch.setattr(fetch, "RAW", raw)
    monkeypatch.setattr(build_cases, "RAW", raw)
    monkeypatch.setattr(build_cases, "CASES", tmp_path / "cases")

    cases = {c["case_id"]: c for c in build_cases.build(["chennai", "nilgiris"])}

    green = cases["chennai-greenery"]
    by_id = {e["id"]: e for e in green["evidence"]}
    assert all(by_id[f"ndvi_{c}"]["role"] == "countryside control" for c in CONTROLS)
    assert by_id["ndvi_chengalpattu_edge"]["role"] == "urban edge"
    gaps = {i for i, e in by_id.items() if "lead" in e}
    assert gaps == {f"ndvi_gap_{p}" for p in build_cases.CITY_POINTS}
    assert green["reference"]["points"] == list(CONTROLS)
    assert {p["point"]["id"] for p in green["land_cover"]["points"]} >= set(CONTROLS)
    assert all(isinstance(e["stats"]["survives_fdr"], bool) for e in green["evidence"])
    assert not any(i.startswith("ndvi_gap_") for i in green["primary_evidence"])
    # the planted city browning (-0.004/yr) against flat farmland shows up in the gap
    assert by_id["ndvi_gap_chennai_core"]["stats"]["trend_uncorrected"] == "decreasing"
    # Nilgiris has no controls: unchanged, no roles
    assert all("role" not in e for e in cases["nilgiris-greenery"]["evidence"])
