"""Statistical core of Case Files.

Every number the app shows comes from here. The AI layer only narrates these outputs.

Methods (see docs/METHODS.md for the judge-facing explanation):
- Deseasonalise monthly series by subtracting the monthly climatology.
- Trend: Mann-Kendall with a moving-block bootstrap p-value (Kundzewicz & Robson 2004;
  Onoz & Bayazit 2012). Climate series are autocorrelated, so plain MK over-reports trends
  (~25% false positives on AR(1) noise). Pre-whitening fixes that but also eats real trends
  (it rated global warming 1981-2025 as p=0.017). Resampling whole blocks keeps the
  autocorrelation and destroys only the trend, so the p-value stays close to honest in both directions
  (measured: ~8% false alarms at a nominal 5%, vs ~22% for plain MK; min reportable p = 1/(n_boot+1)).
  Slope from Sen's estimator (median of pairwise slopes) -> robust to outliers.
- Changepoint: Pettitt test (single abrupt shift, gives a p-value) + ruptures PELT
  (multiple candidate shifts, exploratory only).
- Cross-signal: lagged Pearson correlation of anomalies, reported as correlation, not cause.
- Multiple testing: Benjamini-Hochberg false discovery rate across all tests in a run.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict

import numpy as np
import pandas as pd
import pymannkendall as mk
import ruptures as rpt
from scipy import stats as sps


# ---------------------------------------------------------------- preprocessing

def deseasonalize(monthly: pd.Series, base: tuple[int, int] | None = None) -> pd.Series:
    """Monthly anomalies vs. the mean of each calendar month (optionally over a base period)."""
    s = monthly.dropna()
    ref = s if base is None else s[(s.index.year >= base[0]) & (s.index.year <= base[1])]
    clim = ref.groupby(ref.index.month).mean()
    return s - clim.reindex(s.index.month).to_numpy()


# ---------------------------------------------------------------- trend

@dataclass
class TrendResult:
    trend: str             # "increasing" | "decreasing" | "no trend"
    p_value: float
    significant: bool      # before FDR correction
    sen_slope_per_step: float
    slope_per_decade: float
    units_per_decade: str
    tau: float
    n: int
    start: str
    end: str
    method: str
    p_value_naive: float   # plain MK, no autocorrelation handling; shown for transparency only
    block_length: int

    def to_dict(self) -> dict:
        return asdict(self)


def _mk_s(x: np.ndarray) -> float:
    """Mann-Kendall S statistic: sum of signs of all later-minus-earlier pairs."""
    d = np.sign(x[None, :] - x[:, None])
    return float(np.triu(d, 1).sum())


def block_length(x: np.ndarray) -> int:
    """Block covers the autocorrelation: first lag with |ACF| below the 95% noise band, >= n^(1/3)."""
    n = len(x)
    z = (x - x.mean()) / (x.std() or 1.0)
    band = 2 / np.sqrt(n)
    lag = 1
    while lag < n // 4 and abs(np.mean(z[:-lag] * z[lag:])) > band:
        lag += 1
    return int(min(max(lag + 1, int(np.ceil(n ** (1 / 3)))), max(2, n // 4)))


def block_bootstrap_mk(x: np.ndarray, n_boot: int = 1000, seed: int = 20261114) -> tuple[float, int]:
    """Two-sided MK p-value under H0 'no trend, same autocorrelation' via moving-block bootstrap."""
    rng = np.random.default_rng(seed)  # fixed seed -> the same case file every run
    n = len(x)
    L = block_length(x)
    s0 = abs(_mk_s(x))
    nb = int(np.ceil(n / L))
    hits = 0
    for _ in range(n_boot):
        starts = rng.integers(0, n - L + 1, nb)
        xb = np.concatenate([x[i:i + L] for i in starts])[:n]
        hits += abs(_mk_s(xb)) >= s0
    return (hits + 1) / (n_boot + 1), L


def trend_test(series: pd.Series, steps_per_year: int, units: str, alpha: float = 0.05,
               n_boot: int = 1000) -> TrendResult:
    """Mann-Kendall (block-bootstrap p-value) + Sen's slope on an evenly spaced series."""
    s = series.dropna()
    if len(s) < 10:
        raise ValueError(f"need >= 10 points for a trend test, got {len(s)}")
    x = s.to_numpy(dtype=float)
    p, L = block_bootstrap_mk(x, n_boot)
    naive = mk.original_test(x)
    slope = float(mk.sens_slope(x).slope)
    per_decade = slope * steps_per_year * 10
    direction = "increasing" if slope > 0 else "decreasing" if slope < 0 else "no trend"
    return TrendResult(
        trend=direction if p < alpha else "no trend",
        p_value=float(p),
        significant=bool(p < alpha),
        sen_slope_per_step=slope,
        slope_per_decade=per_decade,
        units_per_decade=f"{units} per decade",
        tau=float(naive.Tau),
        n=int(len(s)),
        start=str(s.index[0].date()) if hasattr(s.index[0], "date") else str(s.index[0]),
        end=str(s.index[-1].date()) if hasattr(s.index[-1], "date") else str(s.index[-1]),
        method=f"Mann-Kendall, moving-block bootstrap p-value (block={L}, {n_boot} resamples) + Sen's slope",
        p_value_naive=float(naive.p),
        block_length=L,
    )


# ---------------------------------------------------------------- changepoints

def pettitt_test(series: pd.Series, units: str = "") -> dict:
    """Pettitt (1979) non-parametric test for one abrupt change in the median."""
    s = series.dropna()
    x = s.to_numpy()
    n = len(x)
    # U_t = sum_{i<=t} sum_{j>t} sign(x_i - x_j)
    sign = np.sign(x[:, None] - x[None, :])
    u = np.array([sign[: t + 1, t + 1 :].sum() for t in range(n - 1)])
    k = int(np.argmax(np.abs(u)))
    K = float(np.abs(u[k]))
    p = float(min(1.0, 2 * np.exp(-6 * K**2 / (n**3 + n**2))))
    before, after = x[: k + 1], x[k + 1 :]
    first_new = s.index[k + 1]
    year = first_new.year if hasattr(first_new, "year") else first_new
    return {
        "method": "Pettitt test",
        "new_regime_starts": int(year),
        "plain": f"The shift shows up from {int(year)} onward"
                 f" ({np.mean(after) - np.mean(before):+.2f}{(' ' + units) if units else ''} vs. the years before).",
        "change_after": str(s.index[k].date()) if hasattr(s.index[k], "date") else str(s.index[k]),
        "p_value": p,
        "mean_before": float(np.mean(before)),
        "mean_after": float(np.mean(after)),
        "shift": float(np.mean(after) - np.mean(before)),
    }


def pelt_changepoints(series: pd.Series, max_points: int = 3, min_size: int = 24) -> list[str]:
    """Exploratory multi-changepoint search (ruptures PELT, RBF cost). No p-values: treat as leads."""
    s = series.dropna()
    x = s.to_numpy()
    if len(x) < 2 * min_size:
        return []
    z = (x - x.mean()) / (x.std() or 1.0)
    pen = 3 * np.log(len(z))
    idx = rpt.Pelt(model="rbf", min_size=min_size).fit(z.reshape(-1, 1)).predict(pen=pen)[:-1]
    idx = idx[:max_points]
    return [str(s.index[i].date()) if hasattr(s.index[i], "date") else str(s.index[i]) for i in idx]


# ---------------------------------------------------------------- cross-signal

def lagged_correlation(driver: pd.Series, response: pd.Series, max_lag: int = 12) -> dict:
    """Correlate driver(t) with response(t+lag). Inputs should be anomalies on the same frequency.

    p-values here are NOT corrected for autocorrelation and are indicative only.
    """
    df = pd.concat({"d": driver, "r": response}, axis=1).dropna()
    rows = []
    for lag in range(0, max_lag + 1):
        d = df["d"].iloc[: len(df) - lag] if lag else df["d"]
        r = df["r"].iloc[lag:]
        if len(d) < 10:
            break
        rho, p = sps.pearsonr(d.to_numpy(), r.to_numpy())
        rows.append({"lag": lag, "r": float(rho), "p_value": float(p), "n": int(len(d))})
    best = max(rows, key=lambda x: abs(x["r"])) if rows else None
    return {
        "method": "Lagged Pearson correlation of anomalies",
        "best": best,
        "all_lags": rows,
        "caveat": "Correlation, not causation. p-values not adjusted for autocorrelation.",
    }


# ---------------------------------------------------------------- multiple testing

def benjamini_hochberg(pvals: list[float], alpha: float = 0.05) -> list[bool]:
    """Return which hypotheses survive BH false-discovery-rate control."""
    p = np.asarray(pvals, dtype=float)
    m = len(p)
    if m == 0:
        return []
    order = np.argsort(p)
    thresh = alpha * (np.arange(1, m + 1) / m)
    passed = p[order] <= thresh
    k = np.max(np.nonzero(passed)[0]) + 1 if passed.any() else 0
    keep = np.zeros(m, dtype=bool)
    keep[order[:k]] = True
    return keep.tolist()


# ---------------------------------------------------------------- helpers

def annual_count_above(daily: pd.Series, threshold: float) -> pd.Series:
    """Days per year with value >= threshold (e.g. heavy-rain days >= 64.5 mm, IMD definition)."""
    s = daily.dropna()
    counts = (s >= threshold).groupby(s.index.year).sum().astype(float)
    counts.index = pd.to_datetime(counts.index.astype(str) + "-01-01")
    return counts


def percentile_threshold(daily: pd.Series, q: float, base: tuple[int, int]) -> float:
    s = daily.dropna()
    ref = s[(s.index.year >= base[0]) & (s.index.year <= base[1])]
    return float(np.percentile(ref, q))


def zscore_of(series: pd.Series, when: str) -> float:
    s = series.dropna()
    return float((s.loc[when] - s.mean()) / s.std())
