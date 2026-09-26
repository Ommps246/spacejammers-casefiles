"""Number guard: reject any AI-written narration containing a number not in the case file.

    python -m pipeline.guard data/cases/chennai-heat.json data/narration/chennai-heat.json

Narration file shape: {"verdict": str, "evidence_notes": [str], "devils_advocate": str, ...}
Every string value is checked. A number passes if it matches (after rounding to the precision
it was written with) some number in the case JSON, or is a small counting word-like integer (0-12).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

NUM = re.compile(r"(?<![\w.])[-+−]?\d+(?:[.,]\d+)?")


def _numbers_in(obj) -> list[float]:
    out: list[float] = []
    if isinstance(obj, dict):
        for v in obj.values():
            out += _numbers_in(v)
    elif isinstance(obj, list):
        for v in obj:
            out += _numbers_in(v)
    elif isinstance(obj, bool):
        pass
    elif isinstance(obj, (int, float)):
        out.append(float(obj))
    elif isinstance(obj, str):
        out += [float(m.replace("−", "-").replace(",", "")) for m in NUM.findall(obj)]
    return out


def _strings_in(obj) -> list[str]:
    if isinstance(obj, dict):
        return [s for v in obj.values() for s in _strings_in(v)]
    if isinstance(obj, list):
        return [s for v in obj for s in _strings_in(v)]
    return [obj] if isinstance(obj, str) else []


def _decimals(tok: str) -> int:
    tok = tok.replace(",", "")
    return len(tok.split(".")[1]) if "." in tok else 0


def check(case: dict, narration: dict) -> list[str]:
    allowed = _numbers_in(case)
    allowed_abs = [abs(a) for a in allowed]
    bad = []
    for text in _strings_in(narration):
        for tok in NUM.findall(text):
            val = abs(float(tok.replace("−", "-").replace(",", "")))
            if val <= 12 and float(val).is_integer():
                continue  # "two signals", "3 datasets"
            d = _decimals(tok)
            tol = 0.5 * 10 ** (-d) + 1e-9
            ok = any(abs(round(a, d) - val) < tol or abs(a - val) < tol for a in allowed_abs)
            # allow percentages derived from 0-1 values written as e.g. 95%
            if not ok:
                ok = any(abs(round(a * 100, d) - val) < tol for a in allowed_abs if a <= 1)
            if not ok:
                bad.append(f"{tok!r} in: {text[:90]}")
    return bad


def main() -> None:
    case = json.loads(Path(sys.argv[1]).read_text())
    narr = json.loads(Path(sys.argv[2]).read_text())
    bad = check(case, narr)
    if bad:
        print("REJECTED — numbers not found in the case file:")
        for b in bad:
            print("  ", b)
        sys.exit(1)
    print("OK — every number traces to the case file.")


if __name__ == "__main__":
    main()
