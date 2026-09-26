"""MODIS yearly land cover (MCD12Q1.061, LC_Type1 = IGBP classes, 500 m) per AppEEARS point.

Two uses:
  * the reference rule: a countryside reference must be Cropland (class 12) in both 2001 and 2024;
  * a land-cover exhibit for each Chennai case: what each point was classed as in 2001 vs 2024.

The class is one 500 m pixel's label from a classifier, so it is evidence, not proof.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from .modis import RAW_ID_ALIASES

PRODUCT = "MCD12Q1"
LAYER = f"{PRODUCT}_061_LC_Type1"
CROPLAND = 12
RULE_YEARS = (2001, 2024)
SOURCE_NOTE = "MODIS land cover classification (500 m), evidence not proof"

IGBP = {
    1: "Evergreen needleleaf forest", 2: "Evergreen broadleaf forest", 3: "Deciduous needleleaf forest",
    4: "Deciduous broadleaf forest", 5: "Mixed forest", 6: "Closed shrubland", 7: "Open shrubland",
    8: "Woody savanna", 9: "Savanna", 10: "Grassland", 11: "Permanent wetland", 12: "Cropland",
    13: "Urban/built-up", 14: "Cropland/natural vegetation mosaic", 15: "Permanent snow and ice",
    16: "Barren", 17: "Water", 255: "Unclassified",
}


def load(root: Path) -> pd.DataFrame:
    """Every MCD12Q1 results CSV under `root`: columns point, year, code (one row per point and year)."""
    files = sorted(root.rglob(f"*-{PRODUCT}-061-results.csv"))
    if not files:
        raise FileNotFoundError(f"no AppEEARS {PRODUCT} results under {root}; "
                                "run `python -m pipeline.appeears download-extra`")
    frames = []
    for f in files:
        df = pd.read_csv(f, dtype=str)
        missing = {"ID", "Date", LAYER} - set(df.columns)
        if missing:
            raise ValueError(f"{f.name} lacks columns {sorted(missing)}")
        frames.append(pd.DataFrame({
            "point": df["ID"].replace(RAW_ID_ALIASES),
            "year": pd.to_datetime(df["Date"], format="%Y-%m-%d").dt.year,
            "code": pd.to_numeric(df[LAYER], errors="coerce"),
        }))
    both = pd.concat(frames, ignore_index=True).dropna(subset=["code"])
    return both.drop_duplicates(["point", "year"]).astype({"code": int})


def code_in(lc: pd.DataFrame, point: str, year: int) -> int | None:
    rows = lc.loc[(lc["point"] == point) & (lc["year"] == year), "code"]
    return int(rows.iloc[0]) if len(rows) else None


def passes_reference_rule(lc: pd.DataFrame, point: str) -> bool:
    """Cropland in both 2001 and 2024. A point without land-cover rows fails."""
    return all(code_in(lc, point, y) == CROPLAND for y in RULE_YEARS)


def _named(code: int | None) -> dict | None:
    return None if code is None else {"code": code, "name": IGBP.get(code, "Unknown class")}


def classes(lc: pd.DataFrame, point: str) -> dict:
    """The class in 2001 and 2024, with IGBP names, and whether it changed."""
    first, last = (code_in(lc, point, y) for y in RULE_YEARS)
    return {"class_2001": _named(first), "class_2024": _named(last),
            "changed": None if first is None or last is None else first != last}
