"""The AppEEARS login token lives in data/raw/*.json (pipeline/appeears.py writes it there). Those files, and
the raw downloads beside them, must never be committed: git has to ignore them.

Run:  python -m pytest -q
"""
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
TOKEN_FILES = ("data/raw/appeears_task.json", "data/raw/appeears_extra.json")
RAW_DOWNLOADS = ("data/raw/power_daily_chennai.json", "data/raw/gistemp_global.csv",
                 "data/raw/appeears/any.csv", "data/raw/appeears_extra/any/any.csv")


def test_gitignore_lists_the_raw_data_and_token_files():
    rules = (ROOT / ".gitignore").read_text().split()

    assert "data/raw/*.json" in rules
    assert ".env" in rules


@pytest.mark.skipif(shutil.which("git") is None or not (ROOT / ".git").exists(), reason="needs a git checkout")
@pytest.mark.parametrize("path", TOKEN_FILES + RAW_DOWNLOADS)
def test_git_ignores_the_token_and_raw_files(path):
    result = subprocess.run(["git", "check-ignore", "-q", path], cwd=ROOT, check=False)

    assert result.returncode == 0, f"{path} is not ignored by git"


@pytest.mark.skipif(shutil.which("git") is None or not (ROOT / ".git").exists(), reason="needs a git checkout")
def test_no_token_file_is_tracked():
    tracked = subprocess.run(["git", "ls-files", "data/raw"], cwd=ROOT, capture_output=True, text=True, check=True)

    assert [f for f in tracked.stdout.split() if f != "data/raw/.gitkeep"] == []
