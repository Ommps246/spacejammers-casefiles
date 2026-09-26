"""Narration must match each result's CURRENT verdict, in both directions.

  * Inconclusive items: no sentence about them may use a definite trend verb ("has become", "is rising", ...)
    unless the same sentence hedges ("may", "not clear", ...).
  * Moderate and strong items: no sentence about them may use inconclusive language ("not clear",
    "can't yet", "inconclusive", "within chance"). Verdicts can move (the FDR family decides them), and
    narration written for the old verdict must not survive the move.

A sentence is "about" an inconclusive item when it is
  * in that item's evidence note (evidence_notes[<id>]), or
  * anywhere in the narration and quotes the item's slope (matched as pipeline/guard.py matches numbers), or
  * anywhere in the narration of a case whose every trend result is inconclusive.

Run:  python -m pytest -q
"""
import json
import re
from pathlib import Path

import pytest

from pipeline.guard import NUM, _decimals

DATA = Path(__file__).resolve().parents[1] / "data"
DEFINITE = (
    "has become", "have become", "is rising", "is falling", "is edging up", "has increased", "has decreased",
    "edges up", "edging up", "has edged up", "is growing", "is shrinking",
)
HEDGES = (
    "may", "not clear", "can't yet", "within chance",
    "not clearly", "not enough to call", "could be chance", "no clear",
)
SENTENCE_END = re.compile(r"(?<=[.!?])\s+")
REFERENCE_IDS = {"global_context"}  # the planet line is context, not this case's own result


def _normal(text: str) -> str:
    return text.replace("’", "'").lower()


def _sentences(text: str) -> list[str]:
    return [s for s in SENTENCE_END.split(text) if s.strip()]


def _texts(narration: dict) -> list[str]:
    """Every narration string except the evidence notes (checked per item) and the source list."""
    skip = {"case_id", "strength", "evidence_notes", "sources"}
    out = []
    for key, value in narration.items():
        if key in skip:
            continue
        if isinstance(value, str):
            out.append(value)
        elif isinstance(value, list):
            out += [v for item in value if isinstance(item, dict) for v in item.values() if isinstance(v, str)]
    return out


def _quotes(sentence: str, slope: float) -> bool:
    for tok in NUM.findall(sentence):
        val = abs(float(tok.replace("−", "-").replace(",", "")))
        d = _decimals(tok)
        if d > 0 and abs(round(abs(slope), d) - val) < 0.5 * 10 ** (-d) + 1e-9:
            return True
    return False


def unhedged_definite(sentence: str) -> str | None:
    """The definite trend verb in the sentence, unless the sentence also hedges."""
    s = _normal(sentence)
    if any(re.search(rf"\b{re.escape(h)}\b", s) for h in HEDGES):
        return None
    return next((v for v in DEFINITE if v in s), None)


# Language that says "we can't call this": wrong for a result that passes the check.
DOUBT = ("not clear", "can't yet", "inconclusive", "within chance")
PASSING = ("moderate", "strong")


def _sentences_about(e: dict, narration: dict, whole_case: bool = False) -> list[str]:
    """The item's own evidence note, plus any narration sentence that quotes its slope (or every sentence)."""
    about = _sentences(narration.get("evidence_notes", {}).get(e["id"], ""))
    return about + [s for t in _texts(narration) for s in _sentences(t)
                    if whole_case or _quotes(s, e["stats"]["slope_per_decade"])]


def understatements(case: dict, narration: dict) -> list[str]:
    """Sentences about a moderate or strong result that describe it as unclear."""
    found = []
    for e in case["evidence"]:
        stats = e.get("stats", {})
        if "slope_per_decade" not in stats or e["id"] in REFERENCE_IDS or stats["verdict_strength"] not in PASSING:
            continue
        for sentence in _sentences_about(e, narration):
            doubt = next((d for d in DOUBT if d in _normal(sentence)), None)
            if doubt:
                found.append(f"{e['id']} is {stats['verdict_strength']} ({doubt!r}): {sentence}")
    return sorted(set(found))


def violations(case: dict, narration: dict) -> list[str]:
    trends = [e for e in case["evidence"] if "slope_per_decade" in e.get("stats", {}) and e["id"] not in REFERENCE_IDS]
    weak = [e for e in trends if e["stats"]["verdict_strength"] == "inconclusive"]
    all_weak = bool(trends) and len(weak) == len(trends)
    found = []
    for e in weak:
        for sentence in _sentences_about(e, narration, whole_case=all_weak):
            verb = unhedged_definite(sentence)
            if verb:
                found.append(f"{e['id']} ({verb!r}): {sentence}")
    return sorted(set(found))


NARRATED = sorted(p.stem for p in (DATA / "narration").glob("*.json"))


@pytest.mark.parametrize("case_id", NARRATED)
def test_inconclusive_results_are_not_narrated_as_definite_trends(case_id):
    case = json.loads((DATA / "cases" / f"{case_id}.json").read_text())
    narration = json.loads((DATA / "narration" / f"{case_id}.json").read_text())

    assert violations(case, narration) == []


@pytest.mark.parametrize("case_id", NARRATED)
def test_passing_results_are_not_narrated_as_unclear(case_id):
    case = json.loads((DATA / "cases" / f"{case_id}.json").read_text())
    narration = json.loads((DATA / "narration" / f"{case_id}.json").read_text())

    assert understatements(case, narration) == []


def test_the_understatement_check_uses_the_current_verdict():
    note = {"evidence_notes": {"uthukottai": "The mildest warming, and not clear enough to call."}}
    as_moderate = {"evidence": [{"id": "uthukottai", "stats": {"slope_per_decade": 0.27, "verdict_strength": "moderate"}}]}
    as_inconclusive = {"evidence": [{"id": "uthukottai",
                                     "stats": {"slope_per_decade": 0.27, "verdict_strength": "inconclusive"}}]}

    assert len(understatements(as_moderate, note)) == 1  # the verdict moved; the words didn't
    assert understatements(as_inconclusive, note) == []


def test_the_check_catches_a_definite_verb_and_accepts_a_hedge():
    case = {"evidence": [{"id": "hot_days", "stats": {"slope_per_decade": -1.538, "verdict_strength": "inconclusive"}},
                         {"id": "temp_trend", "stats": {"slope_per_decade": 0.065, "verdict_strength": "strong"}}]}
    bad = {"evidence_notes": {"hot_days": "Very hot days have become slightly rarer."},
           "can_say": "Hot days fell by 1.54 per decade and the count has decreased."}
    good = {"evidence_notes": {"hot_days": "Very hot days may be slightly fewer, but it isn’t a clear trend."},
            "can_say": "Chennai is rising at +0.065 °C per decade."}  # strong item: definite is fine

    assert [v.split(" ")[0] for v in violations(case, bad)] == ["hot_days", "hot_days"]
    assert violations(case, good) == []


def test_the_extended_lists():
    case = {"evidence": [{"id": "total", "stats": {"slope_per_decade": 68.98, "verdict_strength": "inconclusive"}}]}
    bad = {"evidence_notes": {"total": "Total yearly rain edges up. The wet season is growing."}}
    good = {"evidence_notes": {"total": "Total yearly rain edges up, but not clearly enough to call. "
                                        "It has edged up, but that could be chance."}}

    assert [v.split(": ", 1)[1] for v in violations(case, bad)] == ["Total yearly rain edges up.",
                                                                    "The wet season is growing."]
    assert violations(case, good) == []
