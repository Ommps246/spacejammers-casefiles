"""The FDR family is frozen: the build must correct exactly the tests listed in data/fdr_family.json.

Adding or dropping a test changes every Benjamini-Hochberg verdict, so the family can't drift silently.
To change it on purpose: `python -m pipeline.build_cases --freeze-fdr`, and say why in docs/METHODS.md.

Run:  python -m pytest -q
"""
import json
from pathlib import Path

import pytest

from pipeline import build_cases

ROOT = Path(__file__).resolve().parents[1]
FROZEN = ROOT / "data" / "fdr_family.json"


def _frozen() -> list[dict]:
    return json.loads(FROZEN.read_text())


def _cases_on_disk() -> list[dict]:
    index = json.loads((ROOT / "data" / "cases" / "index.json").read_text())
    return [json.loads((ROOT / "data" / "cases" / f"{i['case_id']}.json").read_text()) for i in index]


def test_the_frozen_family_lists_40_distinct_tests():
    family = _frozen()

    assert len(family) == 40
    assert len({(t["case_id"], t["evidence_id"]) for t in family}) == 40


def test_the_case_files_on_disk_were_corrected_as_the_frozen_family():
    assert build_cases.fdr_family(_cases_on_disk()) == _frozen()


def test_a_different_family_is_refused_before_any_correction():
    cases = [{"case_id": "x-heat", "evidence": [
        {"id": "temp_trend", "stats": {"trend": "increasing"}},
        {"id": "global_context", "stats": {"trend": "increasing"}},  # context, never in the family
    ]}]
    frozen = [{"case_id": "x-heat", "evidence_id": "temp_trend"}, {"case_id": "x-heat", "evidence_id": "hot_days"}]

    with pytest.raises(ValueError, match=r"missing: x-heat/hot_days"):
        build_cases.check_frozen_family(cases, frozen)
    build_cases.check_frozen_family(cases, frozen[:1])  # the same set passes


@pytest.mark.skipif(not (ROOT / "data" / "raw" / "appeears_extra").exists(), reason="needs the downloaded raw data")
def test_a_full_build_from_raw_data_produces_exactly_the_frozen_family(tmp_path, monkeypatch):
    monkeypatch.setattr(build_cases, "FDR_FAMILY_FILE", FROZEN)
    monkeypatch.setattr(build_cases, "CASES", tmp_path)

    cases = build_cases.build(list(build_cases.REGIONS))

    assert build_cases.fdr_family(cases) == _frozen()


@pytest.mark.skipif(not (ROOT / "data" / "raw" / "appeears_extra").exists(), reason="needs the downloaded raw data")
def test_a_partial_build_is_refused_because_it_would_change_the_family(tmp_path, monkeypatch):
    monkeypatch.setattr(build_cases, "FDR_FAMILY_FILE", FROZEN)
    monkeypatch.setattr(build_cases, "CASES", tmp_path)

    with pytest.raises(ValueError, match="FDR family"):
        build_cases.build(["chennai"])
    assert not list(tmp_path.glob("*.json"))  # nothing written
