"""MODIS point data from NASA AppEEARS (data/raw/appeears/*-results.csv) as tidy series.

Products (requested by pipeline/appeears.py, one row per point id and composite date):
  MOD11A2.061  Terra land surface temperature (LST), 8-day, 1 km, day and night, already in kelvin
  MYD11A2.061  Aqua land surface temperature, same layout (from July 2002): the cross-check satellite
  MOD13Q1.061  Terra vegetation greenness (NDVI), 16-day, 250 m, already scaled to about -0.2..1

Cleaning (reported, never silent):
  * fill values dropped: LST 0.0, NDVI -3000;
  * quality: keep only pixels whose MODLAND flag says the value was produced (0b00 good, 0b01 other);
    for LST "other quality" pixels, also drop those with an average LST error above 2 K;
    for NDVI, also drop pixels flagged "mixed clouds";
  * monthly means need enough clear composites; yearly means need >= 8 valid months, and are taken
    over deseasonalised monthly values so a year missing its cloudy monsoon months isn't biased.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from . import stats as st

KELVIN = 273.15
LST_FILL = 0.0
NDVI_FILL = -3000.0
LST_VALID_K = (250.0, 350.0)
NDVI_VALID = (-0.2, 1.0)

PRODUCED = {"0b00", "0b01"}          # MODLAND: produced, good / produced, other quality
LST_ERROR_OK = {"0b00", "0b01"}      # average LST error <= 1 K / <= 2 K
MIN_COMPOSITES_PER_MONTH = {"lst": 2, "ndvi": 1}  # of ~4 eight-day / ~2 sixteen-day composites
MIN_MONTHS_PER_YEAR = 8

# pulicat_shore (13.55 N, 80.18 E) falls on the lagoon: MODIS classes the pixel as "Shallow ocean"
# and never produces LST or NDVI there (all rows are fill). Skipped, not silently dropped.
SKIP_POINTS = frozenset({"pulicat_shore"})

# Chengalpattu was requested as a "rural" reference but MODIS classes its pixel Urban/built-up in both
# 2001 and 2024, so it fails the reference rule (see pipeline/landcover.py). The downloaded files still
# carry the old id; it is read under its new name everywhere.
RAW_ID_ALIASES = {"rural_chengalpattu": "chengalpattu_edge"}

# The countryside reference in a year is the mean of the control points with a valid value that year,
# and needs at least this many of them.
MIN_REFERENCE_POINTS_PER_YEAR = 2

# Terra and Aqua "disagree" on a trend when their slopes differ by more than this share of the larger.
SLOPE_MISMATCH_RATIO = 0.25

LST_PRODUCTS = ("MOD11A2", "MYD11A2")  # Terra, Aqua
NDVI_PRODUCT = "MOD13Q1"


@dataclass(frozen=True)
class CleaningReport:
    """How much of one point's record survived each step."""
    point: str
    layer: str
    composites: int
    kept_composites: int
    months: int
    kept_months: int
    years: int
    kept_years: int

    def to_dict(self) -> dict:
        return {k: getattr(self, k) for k in self.__dataclass_fields__}


def results_file(raw_dir: Path, product: str) -> Path:
    matches = sorted(raw_dir.glob(f"*-{product}-061-results.csv"))
    if not matches:
        raise FileNotFoundError(f"no AppEEARS {product} results in {raw_dir}; run `python -m pipeline.appeears download`")
    return matches[0]


def _read(raw_dir: Path, product: str) -> pd.DataFrame:
    df = pd.read_csv(results_file(raw_dir, product), dtype=str)
    missing = {"ID", "Date"} - set(df.columns)
    if missing:
        raise ValueError(f"{product} results lack columns {sorted(missing)}")
    df = df[~df["ID"].isin(SKIP_POINTS)]
    return df.assign(ID=df["ID"].replace(RAW_ID_ALIASES), Date=pd.to_datetime(df["Date"], format="%Y-%m-%d"))


def load_lst(raw_dir: Path, product: str, when: str) -> pd.DataFrame:
    """Clean LST composites in °C: columns point, date, value. `when` is "Day" or "Night"."""
    if product not in LST_PRODUCTS or when not in ("Day", "Night"):
        raise ValueError(f"unknown LST layer {product} {when}")
    df = _read(raw_dir, product)
    value = pd.to_numeric(df[f"{product}_061_LST_{when}_1km"], errors="coerce")
    modland = df[f"{product}_061_QC_{when}_MODLAND"]
    error = df[f"{product}_061_QC_{when}_LST_Error_Flag"]
    good = (
        value.ne(LST_FILL)
        & value.between(*LST_VALID_K)
        & modland.isin(PRODUCED)
        & (modland.eq("0b00") | error.isin(LST_ERROR_OK))
    )
    return pd.DataFrame({"point": df["ID"], "date": df["Date"], "value": value - KELVIN, "good": good})


def load_ndvi(raw_dir: Path) -> pd.DataFrame:
    """Clean NDVI composites: columns point, date, value, good."""
    df = _read(raw_dir, NDVI_PRODUCT)
    p = f"{NDVI_PRODUCT}_061__250m_16_days_"
    value = pd.to_numeric(df[f"{p}NDVI"], errors="coerce")
    good = (
        value.ne(NDVI_FILL)
        & value.between(*NDVI_VALID)
        & df[f"{p}VI_Quality_MODLAND"].isin(PRODUCED)
        & df[f"{p}VI_Quality_Mixed_Clouds"].ne("0b1")
    )
    return pd.DataFrame({"point": df["ID"], "date": df["Date"], "value": value, "good": good})


def monthly_means(composites: pd.DataFrame, point: str, min_per_month: int) -> tuple[pd.Series, int, int]:
    """Monthly mean of the good composites for one point; months with too few are dropped.

    Returns (series indexed by month start, months seen, composites kept)."""
    rows = composites[composites["point"] == point]
    if rows.empty:
        raise KeyError(f"no rows for point {point}")
    good = rows[rows["good"]].set_index("date")["value"]
    months_seen = rows["date"].dt.to_period("M").nunique()
    counts = good.resample("MS").count()
    means = good.resample("MS").mean()
    return means[counts >= min_per_month].dropna(), int(months_seen), int(len(good))


def yearly_anomalies(monthly: pd.Series, min_months: int = MIN_MONTHS_PER_YEAR) -> tuple[pd.Series, int]:
    """Yearly mean of deseasonalised monthly values for years with >= min_months valid months.

    Returns (series indexed by Jan 1 of each kept year, number of years seen)."""
    anomalies = st.deseasonalize(monthly)
    by_year = anomalies.groupby(anomalies.index.year)
    kept = by_year.mean()[by_year.count() >= min_months]
    kept.index = pd.to_datetime(kept.index.astype(str) + "-01-01")
    return kept, int(by_year.ngroups)


def point_series(composites: pd.DataFrame, point: str, layer: str, kind: str) -> tuple[pd.Series, pd.Series, CleaningReport]:
    """Monthly means, yearly anomalies and the cleaning report for one point and layer."""
    monthly, months_seen, kept_composites = monthly_means(composites, point, MIN_COMPOSITES_PER_MONTH[kind])
    yearly, years_seen = yearly_anomalies(monthly)
    report = CleaningReport(
        point=point,
        layer=layer,
        composites=int((composites["point"] == point).sum()),
        kept_composites=kept_composites,
        months=months_seen,
        kept_months=int(len(monthly)),
        years=years_seen,
        kept_years=int(len(yearly)),
    )
    return monthly, yearly, report


def reference_yearly(controls_yearly: dict[str, pd.Series],
                     min_points: int = MIN_REFERENCE_POINTS_PER_YEAR) -> pd.Series:
    """Countryside reference: per year, the mean of the controls' yearly anomalies, kept only in years
    where at least `min_points` controls have a valid value. Anomalies (each point against its own
    seasonal normal) make the mean fair when one control is missing."""
    table = pd.concat(controls_yearly, axis=1, sort=True)
    return table.mean(axis=1)[table.count(axis=1) >= min_points]


def gap_yearly(city_yearly: pd.Series, reference: pd.Series) -> pd.Series:
    """City minus countryside reference, in the years both have."""
    both = pd.concat({"city": city_yearly, "reference": reference}, axis=1, sort=True).dropna()
    return both["city"] - both["reference"]


def satellite_agreement(terra_monthly: pd.Series, aqua_monthly: pd.Series) -> dict:
    """Terra vs Aqua for one point: do the two satellites see the same month-to-month swings, and the
    same trend over the years both flew? A check, not a finding: kept out of the FDR family."""
    both = pd.concat({"terra": terra_monthly, "aqua": aqua_monthly}, axis=1, sort=True).dropna()
    if len(both) < 24:
        return {"months_compared": int(len(both)), "note": "too few shared months to compare"}
    anomalies = pd.concat({k: st.deseasonalize(both[k]) for k in both}, axis=1, sort=True)
    r = float(anomalies["terra"].corr(anomalies["aqua"]))
    terra_yearly, _ = yearly_anomalies(both["terra"])
    aqua_yearly, _ = yearly_anomalies(both["aqua"])
    common = terra_yearly.index.intersection(aqua_yearly.index)
    slopes = {}
    if len(common) >= 10:
        for name, s in (("terra", terra_yearly[common]), ("aqua", aqua_yearly[common])):
            slopes[name] = st.trend_test(s, steps_per_year=1, units="°C").slope_per_decade
    return {
        "months_compared": int(len(both)),
        "monthly_correlation": r,
        "years_compared": int(len(common)),
        "first_year": int(common.min().year) if len(common) else None,
        "last_year": int(common.max().year) if len(common) else None,
        "terra_slope_per_decade": slopes.get("terra"),
        "aqua_slope_per_decade": slopes.get("aqua"),
        "same_direction": (None if len(slopes) < 2 else
                           bool((slopes["terra"] > 0) == (slopes["aqua"] > 0))),
        "slopes_differ": (None if len(slopes) < 2 else slopes_differ(slopes["terra"], slopes["aqua"])),
    }


def slopes_differ(a: float, b: float) -> bool:
    """True when two trend slopes differ by more than SLOPE_MISMATCH_RATIO of the larger one."""
    larger = max(abs(a), abs(b))
    return bool(larger > 0 and abs(a - b) / larger > SLOPE_MISMATCH_RATIO)
