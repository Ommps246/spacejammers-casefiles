"""Shared test setup.

The FDR family is frozen in data/fdr_family.json (pipeline/build_cases.py checks every real build against
it). The synthetic-data tests build their own small families, so the check is switched off for them;
tests/test_fdr_family.py switches it back on for the real data.
"""
import pytest

from pipeline import build_cases


@pytest.fixture(autouse=True)
def _synthetic_builds_skip_the_frozen_family(monkeypatch):
    monkeypatch.setattr(build_cases, "FDR_FAMILY_FILE", None)
