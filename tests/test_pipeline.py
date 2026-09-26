"""Synthetic-data tests: the detector must find trends we planted and ignore ones we didn't.

Run:  python -m pytest -q
"""
import json

import numpy as np
import pandas as pd
import pytest

from pipeline import stats as st
from pipeline import build_cases, fetch

RNG = np.random.default_rng(42)


def monthly(n_years=40, slope_per_decade=0.0, noise=0.3, step_at=None, step=0.0):
    idx = pd.date_range("1981-01-01", periods=n_years * 12, freq="MS")
    t = np.arange(len(idx))
    season = 3 * np.sin(2 * np.pi * (idx.month.to_numpy() - 1) / 12)
    y = 28 + season + slope_per_decade * t / 120 + RNG.normal(0, noise, len(idx))
    if step_at is not None:
        y[t >= step_at] += step
    return pd.Series(y, index=idx)


# ------------------------------------------------------------------ trend

def test_detects_planted_warming():
    s = st.deseasonalize(monthly(slope_per_decade=0.3))
    r = st.trend_test(s, steps_per_year=12, units="°C")
    assert r.trend == "increasing" and r.significant
    assert r.slope_per_decade == pytest.approx(0.3, abs=0.06)


def _ar1(n, phi):
    e = RNG.normal(size=n)
    x = np.zeros(n)
    for i in range(1, n):
        x[i] = phi * x[i - 1] + e[i]
    return pd.Series(x, index=pd.date_range("1981-01-01", periods=n, freq="MS"))


def test_no_false_trend_on_autocorrelated_noise():
    """Real climate anomalies are autocorrelated; plain MK flags ~25% of pure AR(1) noise."""
    hits = sum(st.trend_test(_ar1(44, 0.5), 1, "°C", n_boot=300).significant for _ in range(60))
    assert hits <= 9  # nominal 5% (3 of 60); bootstrap measured ~8%, plain MK ~22% (~13 of 60)


def test_detects_strong_trend_in_autocorrelated_series():
    """Regression test: pre-whitening rated global warming 1981-2025 as p=0.017. Must be tiny."""
    idx = pd.date_range("1981-01-01", periods=45, freq="YS")
    x = 0.02 * np.arange(45) + _ar1(45, 0.3).to_numpy() * 0.08
    r = st.trend_test(pd.Series(x, index=idx), 1, "°C")
    assert r.trend == "increasing" and r.p_value < 0.005


def test_bootstrap_is_reproducible():
    s = st.deseasonalize(monthly(slope_per_decade=0.1))
    assert st.trend_test(s, 12, "°C").p_value == st.trend_test(s, 12, "°C").p_value


def test_deseasonalize_removes_cycle():
    a = st.deseasonalize(monthly(noise=0.01))
    assert a.groupby(a.index.month).mean().abs().max() < 0.05


# ------------------------------------------------------------------ changepoints

def test_pettitt_finds_step():
    s = monthly(step_at=240, step=1.5, noise=0.3)
    annual = s.groupby(s.index.year).mean()
    annual.index = pd.to_datetime(annual.index.astype(str) + "-01-01")
    r = st.pettitt_test(annual)
    assert r["p_value"] < 0.01
    assert r["new_regime_starts"] in (2000, 2001)
    assert r["change_after"].startswith(("1999", "2000"))
    assert r["shift"] == pytest.approx(1.5, abs=0.3)


def test_pelt_returns_dates():
    s = st.deseasonalize(monthly(step_at=240, step=2.0, noise=0.3))
    cps = st.pelt_changepoints(s)
    assert cps and any(c.startswith(("2000", "2001")) for c in cps)


# ------------------------------------------------------------------ cross-signal & FDR

def test_lagged_correlation_finds_lag():
    idx = pd.date_range("1990-01-01", periods=300, freq="MS")
    d = pd.Series(RNG.normal(size=300), index=idx)
    r = d.shift(2) * 0.8 + RNG.normal(0, 0.3, 300)
    out = st.lagged_correlation(d, pd.Series(r.to_numpy(), index=idx), max_lag=6)
    assert out["best"]["lag"] == 2 and out["best"]["r"] > 0.7


def test_benjamini_hochberg():
    keep = st.benjamini_hochberg([0.001, 0.02, 0.04, 0.5])
    assert keep == [True, True, False, False]  # thresholds .0125/.025/.0375/.05


def test_annual_count_above():
    idx = pd.date_range("2000-01-01", "2001-12-31", freq="D")
    s = pd.Series(0.0, index=idx)
    s["2000-06-01"] = 100
    s["2001-11-01":"2001-11-03"] = 70
    c = st.annual_count_above(s, 64.5)
    assert c.tolist() == [1.0, 3.0]


# ------------------------------------------------------------------ parsers

GISTEMP_SAMPLE = """Land-Ocean: Global Means
Year,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,J-D,D-N,DJF,MAM,JJA,SON
1880,-.18,-.24,-.09,-.16,-.10,-.21,-.18,-.10,-.14,-.23,-.22,-.18,-.17,***,***,-.12,-.17,-.20
2024,1.24,1.44,1.39,1.31,1.17,1.23,1.20,1.30,1.24,1.32,1.30,1.26,1.28,1.29,1.35,1.29,1.24,1.29
2025,1.37,1.26,1.35,***,***,***,***,***,***,***,***,***,***,***,1.30,***,***,***
"""


def test_parse_gistemp_skips_incomplete_year():
    s = fetch.parse_gistemp(GISTEMP_SAMPLE)
    assert list(s.index.year) == [1880, 2024]
    assert s.iloc[-1] == pytest.approx(1.28)


# ------------------------------------------------------------------ end-to-end

def _fake_power(tmp_path):
    idx = pd.date_range("1981-01-01", "2024-12-31", freq="D")
    t = np.arange(len(idx))
    doy = idx.dayofyear.to_numpy()
    t2m = 28 + 3 * np.sin(2 * np.pi * doy / 365) + 0.03 * t / 365 + RNG.normal(0, 1, len(idx))
    rain = np.where(RNG.random(len(idx)) < 0.1, RNG.gamma(1.2, 15, len(idx)), 0.0)
    rain[(idx >= "2015-11-15") & (idx <= "2015-12-05")] += 60  # planted "2015 flood"
    rain[5] = -999.0  # POWER fill value must become NaN
    param = {
        "T2M": dict(zip(idx.strftime("%Y%m%d"), t2m.round(2))),
        "T2M_MAX": dict(zip(idx.strftime("%Y%m%d"), (t2m + 5).round(2))),
        "PRECTOTCORR": dict(zip(idx.strftime("%Y%m%d"), rain.round(2))),
        "RH2M": dict(zip(idx.strftime("%Y%m%d"), np.full(len(idx), 70.0))),
    }
    raw = tmp_path / "raw"
    raw.mkdir()
    (raw / "power_daily_chennai.json").write_text(json.dumps(
        {"region": "chennai", "header": {"sources": ["synthetic"]}, "parameter": param}))
    (raw / "gistemp_global.csv").write_text(GISTEMP_SAMPLE.replace(
        "2024,", "\n".join(f"{y},0,0,0,0,0,0,0,0,0,0,0,0,{0.02*(y-1981):.2f},0,0,0,0,0"
                           for y in range(1981, 2024)) + "\n2024,"))
    return raw


def test_build_cases_end_to_end(tmp_path, monkeypatch):
    raw = _fake_power(tmp_path)
    monkeypatch.setattr(fetch, "RAW", raw)
    monkeypatch.setattr(build_cases, "RAW", raw)
    monkeypatch.setattr(build_cases, "CASES", tmp_path / "cases")
    cases = build_cases.build(["chennai"])
    assert {c["case_id"] for c in cases} == {"chennai-heat", "chennai-rain"}

    heat = json.loads((tmp_path / "cases" / "chennai-heat.json").read_text())
    temp = next(e for e in heat["evidence"] if e["id"] == "temp_trend")["stats"]
    assert temp["trend"] == "increasing" and temp["survives_fdr"]
    for ev in heat["evidence"] + json.loads((tmp_path / "cases" / "chennai-rain.json").read_text())["evidence"]:
        s = ev["stats"]
        if s.get("verdict_strength") == "inconclusive":
            assert s["trend"] == "no clear trend"  # labels can never contradict each other
    assert temp["slope_per_decade"] == pytest.approx(0.3, abs=0.08)
    assert any(e["id"] == "global_context" for e in heat["evidence"])

    rain = json.loads((tmp_path / "cases" / "chennai-rain.json").read_text())
    flood = next(c for c in rain["sanity_checks"] if "2015" in c["name"])["result"]
    assert flood["rank_among_years"] == 1  # planted flood is the wettest Nov-Dec
    assert (tmp_path / "cases" / "index.json").exists()


# ------------------------------------------------------------------ number guard

from pipeline import guard  # noqa: E402

CASE = {"evidence": [{"stats": {"slope_per_decade": 0.2371, "p_value": 0.0034, "n": 528,
                                "start": "1981-01-01"}}], "threshold": 36.42}


def test_guard_accepts_traceable_numbers():
    narr = {"verdict": "Warming of 0.24 °C per decade since 1981 (p = 0.003, 528 months); "
                       "hot days above 36.4 °C."}
    assert guard.check(CASE, narr) == []


def test_guard_rejects_invented_numbers():
    narr = {"verdict": "Chennai warmed 1.4 °C and lost 18% of its trees."}
    bad = guard.check(CASE, narr)
    assert len(bad) == 2


def test_guard_accepts_bootstrap_floor_wording():
    case = {"stats": {"p_value": 0.000999}}
    assert guard.check(case, {"verdict": "Global warming is clear (p < 0.001)."}) == []


def test_pettitt_sentence_has_units():
    idx = pd.date_range("1981-01-01", periods=30, freq="YS")
    r = st.pettitt_test(pd.Series(np.r_[np.zeros(15), np.ones(15)], index=idx), units="°C")
    assert "°C" in r["plain"] and r["new_regime_starts"] == 1996


def test_appeears_payload_shape():
    from pipeline import appeears
    p = appeears.task_payload()
    assert p["task_type"] == "point"
    d = p["params"]["dates"][0]
    assert d["startDate"] == "02-18-2000" and len(d["endDate"]) == 10
    assert all({"id", "latitude", "longitude"} <= set(c) for c in p["params"]["coordinates"])
    assert {"product": "MOD13Q1.061", "layer": "_250m_16_days_NDVI"} in p["params"]["layers"]
