"""Request MODIS satellite data (vegetation + land surface temperature) from NASA AppEEARS.

Needs a free NASA Earthdata login (https://urs.earthdata.nasa.gov/users/new) and one sign-in on
https://appeears.earthdatacloud.nasa.gov/ to activate AppEEARS for that account.

    python -m pipeline.appeears submit      # asks for Earthdata username/password, submits the request
    python -m pipeline.appeears status      # pending / processing / done
    python -m pipeline.appeears download    # saves the CSVs into data/raw/appeears/

The password is only sent to NASA's login endpoint and is never written to disk. The login token
(valid ~48 h) and the task id are saved in data/raw/appeears_task.json (git-ignored).
"""
from __future__ import annotations

import getpass
import json
import os
import sys
from pathlib import Path

import requests

API = "https://appeears.earthdatacloud.nasa.gov/api"
RAW = Path(__file__).resolve().parents[1] / "data" / "raw"
TASK_FILE = RAW / "appeears_task.json"
OUT = RAW / "appeears"

START, END = "02-18-2000", "12-31-2025"  # MM-DD-YYYY; MODIS Terra record starts Feb 2000

# Several points per region so we can compare city core vs. edge vs. countryside.
POINTS = [
    {"id": "chennai_core", "category": "chennai", "latitude": 13.04, "longitude": 80.23},        # T. Nagar
    {"id": "chennai_omr", "category": "chennai", "latitude": 12.90, "longitude": 80.23},         # Sholinganallur / IT corridor
    {"id": "chennai_tambaram", "category": "chennai", "latitude": 12.92, "longitude": 80.12},    # southern suburb
    {"id": "chennai_avadi", "category": "chennai", "latitude": 13.12, "longitude": 80.10},       # western suburb
    # Requested as "rural_chengalpattu" (a farmland reference), but MODIS land cover calls it Urban/built-up
    # in 2001 and 2024, so it's an urban-edge point, never a reference. modis.RAW_ID_ALIASES maps the old id.
    {"id": "chengalpattu_edge", "category": "chennai", "latitude": 12.70, "longitude": 79.95},
    {"id": "pulicat_shore", "category": "pulicat", "latitude": 13.55, "longitude": 80.18},
    {"id": "nilgiris_ooty", "category": "nilgiris", "latitude": 11.41, "longitude": 76.70},
]

LAYERS = [
    {"product": "MOD13Q1.061", "layer": "_250m_16_days_NDVI"},   # Terra vegetation, 250 m, 16-day
    {"product": "MOD11A2.061", "layer": "LST_Day_1km"},          # Terra land surface temp, 1 km, 8-day
    {"product": "MOD11A2.061", "layer": "LST_Night_1km"},        # city heat is strongest at night
    {"product": "MYD11A2.061", "layer": "LST_Day_1km"},          # Aqua: independent satellite cross-check
    {"product": "MYD11A2.061", "layer": "LST_Night_1km"},
]


# ---------------------------------------------------------------- extra request (control points)
# Is Chengalpattu still countryside? Three more references far from the city and the highway
# corridors, checked against OpenStreetMap on 2026-09-22 (no mapped built-up land within 1 km except
# two small hamlet polygons at the Uthukottai point, no mapped water within 750 m, no motorway/trunk/
# primary road within 3 km). OSM farmland mapping is sparse here: the land-cover layer below confirms.
EXTRA_POINTS = [
    {"id": "rural_kanchipuram_west", "category": "reference", "latitude": 12.80, "longitude": 79.55},
    {"id": "rural_uthiramerur_south", "category": "reference", "latitude": 12.55, "longitude": 79.70},
    {"id": "rural_uthukottai_north", "category": "reference", "latitude": 13.37, "longitude": 79.95},
]

# Yearly land cover (IGBP classes, 500 m), so each case can say what a pixel was in 2001 vs 2024.
LANDCOVER = {"product": "MCD12Q1.061", "layer": "LC_Type1"}
LANDCOVER_START, LANDCOVER_END = "01-01-2001", "12-31-2024"

EXTRA_TASK_FILE = RAW / "appeears_extra.json"
EXTRA_OUT = RAW / "appeears_extra"


def task_payload(name: str = "spacejammers-casefiles", points: list[dict] | None = None,
                 layers: list[dict] | None = None, start: str = START, end: str = END) -> dict:
    return {
        "task_type": "point",
        "task_name": name,
        "params": {
            "dates": [{"startDate": start, "endDate": end}],
            "layers": LAYERS if layers is None else layers,
            "coordinates": POINTS if points is None else points,
        },
    }


def extra_payloads() -> dict[str, dict]:
    """New points get every layer plus land cover; existing points only need land cover."""
    return {
        "extra-points": task_payload("spacejammers-extra-points", EXTRA_POINTS, [*LAYERS, LANDCOVER]),
        "landcover": task_payload("spacejammers-landcover", POINTS, [LANDCOVER], LANDCOVER_START, LANDCOVER_END),
    }


def _login() -> str:
    user = os.environ.get("EARTHDATA_USER") or input("Earthdata username: ").strip()
    pw = os.environ.get("EARTHDATA_PASS") or getpass.getpass("Earthdata password (hidden): ")
    r = requests.post(f"{API}/login", auth=(user, pw), timeout=60)
    if r.status_code != 200:
        sys.exit(f"Login failed ({r.status_code}): {r.text[:300]}\n"
                 "Check the password, and sign in once at https://appeears.earthdatacloud.nasa.gov/ first.")
    return r.json()["token"]


def _saved() -> dict:
    if not TASK_FILE.exists():
        sys.exit("No task yet. Run: python -m pipeline.appeears submit")
    return json.loads(TASK_FILE.read_text())


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def submit() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    token = _login()
    r = requests.post(f"{API}/task", json=task_payload(), headers=_headers(token), timeout=60)
    if r.status_code not in (200, 202):
        sys.exit(f"Submit failed ({r.status_code}): {r.text[:500]}")
    task_id = r.json()["task_id"]
    TASK_FILE.write_text(json.dumps({"task_id": task_id, "token": token}, indent=2))
    print(f"Submitted. task_id = {task_id}")
    print("NASA emails you when it's done (often a few hours, sometimes a day).")
    print("Check with: python -m pipeline.appeears status")


def _with_token(fn):
    saved = _saved()
    try:
        return fn(saved)
    except PermissionError:
        saved["token"] = _login()  # token expired (~48 h): log in again
        TASK_FILE.write_text(json.dumps(saved, indent=2))
        return fn(saved)


def _get(url: str, token: str, **kw):
    r = requests.get(url, headers=_headers(token), timeout=120, **kw)
    if r.status_code in (401, 403):
        raise PermissionError
    r.raise_for_status()
    return r


def status() -> str:
    def run(saved):
        js = _get(f"{API}/task/{saved['task_id']}", saved["token"]).json()
        return js.get("status", "unknown")
    s = _with_token(run)
    print(f"Task status: {s}")
    return s


def _download_bundle(task_id: str, token: str, out: Path) -> None:
    files = _get(f"{API}/bundle/{task_id}", token).json()["files"]
    out.mkdir(parents=True, exist_ok=True)
    wanted = [f for f in files if f["file_name"].endswith((".csv", ".json", ".txt"))]
    for f in wanted:
        dest = out / Path(f["file_name"]).name
        with _get(f"{API}/bundle/{task_id}/{f['file_id']}", token, stream=True, allow_redirects=True) as r:
            with open(dest, "wb") as fh:
                for chunk in r.iter_content(1 << 16):
                    fh.write(chunk)
        print(f"saved {dest.relative_to(RAW.parent.parent)}")


def download() -> None:
    _with_token(lambda saved: _download_bundle(saved["task_id"], saved["token"], OUT))


# ---------------------------------------------------------------- extra request commands

def _saved_extra() -> dict:
    if not EXTRA_TASK_FILE.exists():
        sys.exit("No extra tasks yet. Run: python -m pipeline.appeears submit-extra")
    return json.loads(EXTRA_TASK_FILE.read_text())


def _with_extra_token(fn):
    saved = _saved_extra()
    try:
        return fn(saved)
    except PermissionError:
        saved = {**saved, "token": _login()}  # token expired (~48 h): log in again
        EXTRA_TASK_FILE.write_text(json.dumps(saved, indent=2))
        return fn(saved)


def submit_extra() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    token = _login()
    tasks = {}
    for key, payload in extra_payloads().items():
        r = requests.post(f"{API}/task", json=payload, headers=_headers(token), timeout=60)
        if r.status_code not in (200, 202):
            if tasks:
                EXTRA_TASK_FILE.write_text(json.dumps({"tasks": tasks, "token": token}, indent=2))
            sys.exit(f"Submit of {key} failed ({r.status_code}): {r.text[:500]}")
        tasks[key] = r.json()["task_id"]
        print(f"Submitted {key}: task_id = {tasks[key]}")
    EXTRA_TASK_FILE.write_text(json.dumps({"tasks": tasks, "token": token}, indent=2))
    print("Check with: python -m pipeline.appeears status-extra")


def status_extra() -> dict[str, str]:
    def run(saved):
        return {k: _get(f"{API}/task/{tid}", saved["token"]).json().get("status", "unknown")
                for k, tid in saved["tasks"].items()}
    states = _with_extra_token(run)
    for k, s in states.items():
        print(f"{k}: {s}")
    return states


def download_extra() -> None:
    def run(saved):
        for key, tid in saved["tasks"].items():
            _download_bundle(tid, saved["token"], EXTRA_OUT / key)
    _with_extra_token(run)


COMMANDS = {
    "submit": submit, "status": status, "download": download,
    "submit-extra": submit_extra, "status-extra": status_extra, "download-extra": download_extra,
}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    COMMANDS.get(cmd, lambda: sys.exit(f"usage: python -m pipeline.appeears {'|'.join(COMMANDS)}"))()
