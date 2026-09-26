"""Download NASA data into data/raw/. Run once on a machine with internet:

    python -m pipeline.fetch power      # NASA POWER daily + monthly for every region (no login)
    python -m pipeline.fetch gistemp    # NASA GISS global temperature anomalies (no login)
    python -m pipeline.fetch all

Raw files are cached; re-running skips files that already exist (use --force to refresh).
"""
from __future__ import annotations

import argparse
import io
import json
import time
from pathlib import Path

import pandas as pd
import requests

from .regions import REGIONS

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"
POWER_BASE = "https://power.larc.nasa.gov/api/temporal"
GISTEMP_URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
FILL = -999.0

DAILY_PARAMS = ["T2M", "T2M_MAX", "PRECTOTCORR", "RH2M"]
FIRST_YEAR, LAST_YEAR = 1981, 2025


# ---------------------------------------------------------------- NASA POWER

def _get(url: str, params: dict, tries: int = 4) -> dict:
    for i in range(tries):
        r = requests.get(url, params=params, timeout=120)
        if r.status_code == 200:
            return r.json()
        if r.status_code in (429, 500, 502, 503, 504):
            time.sleep(5 * (i + 1))
            continue
        r.raise_for_status()
    r.raise_for_status()
    return {}


def fetch_power_daily(region_id: str, force: bool = False) -> Path:
    reg = REGIONS[region_id]
    out = RAW / f"power_daily_{region_id}.json"
    if out.exists() and not force:
        print(f"skip {out.name} (cached)")
        return out
    merged: dict[str, dict[str, float]] = {p: {} for p in DAILY_PARAMS}
    header = None
    for y0 in range(FIRST_YEAR, LAST_YEAR + 1, 10):
        y1 = min(y0 + 9, LAST_YEAR)
        print(f"POWER daily {region_id} {y0}-{y1} ...")
        js = _get(f"{POWER_BASE}/daily/point", {
            "parameters": ",".join(DAILY_PARAMS), "community": "AG",
            "latitude": reg["lat"], "longitude": reg["lon"],
            "start": f"{y0}0101", "end": f"{y1}1231", "format": "JSON",
        })
        header = header or js.get("header")
        for p, vals in js["properties"]["parameter"].items():
            merged[p].update(vals)
    out.write_text(json.dumps({"region": region_id, "header": header, "parameter": merged}))
    print(f"wrote {out}")
    return out


def load_power_daily(region_id: str) -> pd.DataFrame:
    js = json.loads((RAW / f"power_daily_{region_id}.json").read_text())
    df = pd.DataFrame(js["parameter"])
    df.index = pd.to_datetime(df.index, format="%Y%m%d")
    return df.sort_index().replace(FILL, float("nan"))


def daily_to_monthly(df: pd.DataFrame) -> pd.DataFrame:
    agg = {c: ("sum" if c.startswith("PRECTOT") else "mean") for c in df.columns}
    m = df.resample("MS").agg(agg)
    # drop months with too many missing days
    valid = df.resample("MS").count().min(axis=1) >= 25
    return m[valid]


# ---------------------------------------------------------------- GISTEMP

def fetch_gistemp(force: bool = False) -> Path:
    out = RAW / "gistemp_global.csv"
    if out.exists() and not force:
        print(f"skip {out.name} (cached)")
        return out
    r = requests.get(GISTEMP_URL, timeout=60)
    r.raise_for_status()
    out.write_text(r.text)
    print(f"wrote {out}")
    return out


def parse_gistemp(text: str) -> pd.Series:
    """Annual (J-D) global land-ocean anomaly, deg C vs 1951-1980."""
    df = pd.read_csv(io.StringIO(text), skiprows=1, na_values=["***", "****"])
    s = pd.to_numeric(df["J-D"], errors="coerce")
    s.index = pd.to_datetime(df["Year"].astype(int).astype(str) + "-01-01")
    return s.dropna()


def load_gistemp() -> pd.Series:
    return parse_gistemp((RAW / "gistemp_global.csv").read_text())


# ---------------------------------------------------------------- CLI

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("what", choices=["power", "gistemp", "all"])
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    if a.what in ("power", "all"):
        for rid in REGIONS:
            fetch_power_daily(rid, a.force)
    if a.what in ("gistemp", "all"):
        fetch_gistemp(a.force)


if __name__ == "__main__":
    main()
